import { loadCatalog } from "./catalog";
import { HttpError } from "./http";
import { keywordsFrom, mapConcurrent, movieDetails, relatedMovies } from "./tmdb";
import type { CatalogMovie, Env, ExecutionContextLike, JsonObject } from "./types";

interface Candidate {
  id: number;
  detail: JsonObject;
  sources: Set<string>;
  score: number;
  features: Record<string, number>;
}

function array(value: unknown): JsonObject[] {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === "object") : [];
}

function profile(detail: JsonObject, director?: string | null): string {
  return [
    `Titre : ${String(detail.title ?? "")}`,
    `Synopsis : ${String(detail.overview ?? "").slice(0, 1200)}`,
    `Genres : ${array(detail.genres).map((item) => item.name).join(", ")}`,
    `Mots-clés : ${keywordsFrom(detail).slice(0, 20).join(", ")}`,
    director ? `Réalisateur : ${director}` : "",
    `Langue : ${String(detail.original_language ?? "")}`,
    `Pays : ${array(detail.production_countries).map((item) => item.iso_3166_1).join(", ")}`,
  ].filter(Boolean).join("\n");
}

function vectorsFrom(value: unknown): number[][] {
  if (!value || typeof value !== "object") return [];
  const data = (value as JsonObject).data;
  return Array.isArray(data)
    ? data.filter((vector): vector is number[] => Array.isArray(vector))
    : [];
}

function cosine(left: number[], right: number[]): number {
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index++) {
    dot += left[index] * right[index];
    leftNorm += left[index] ** 2;
    rightNorm += right[index] ** 2;
  }
  return leftNorm && rightNorm ? dot / Math.sqrt(leftNorm * rightNorm) : 0;
}

function overlap(left: Set<unknown>, right: Set<unknown>): number {
  const union = new Set([...left, ...right]);
  if (!union.size) return 0;
  let common = 0;
  for (const item of left) if (right.has(item)) common++;
  return common / union.size;
}

function year(detail: JsonObject): number {
  return Number(String(detail.release_date ?? "").slice(0, 4)) || 0;
}

function eligible(detail: JsonObject, includeAnimation: boolean, includeDocumentary: boolean): boolean {
  if (detail.adult === true || !detail.release_date) return false;
  const genres = new Set(array(detail.genres).map((item) => Number(item.id)));
  if (!includeAnimation && genres.has(16)) return false;
  if (!includeDocumentary && genres.has(99)) return false;
  return true;
}

function scoreCandidate(
  sources: JsonObject[],
  sourceVectors: number[][],
  candidate: JsonObject,
  vector: number[],
): { score: number; features: Record<string, number> } {
  const scores = sources.map((source, index) => {
    const sourceGenres = new Set(array(source.genres).map((item) => item.id));
    const candidateGenres = new Set(array(candidate.genres).map((item) => item.id));
    const semantic = cosine(sourceVectors[index] ?? [], vector);
    const genre = overlap(sourceGenres, candidateGenres);
    const language = Number(source.original_language === candidate.original_language);
    const sourceCountries = new Set(array(source.production_countries).map((item) => item.iso_3166_1));
    const candidateCountries = new Set(array(candidate.production_countries).map((item) => item.iso_3166_1));
    const region = overlap(sourceCountries, candidateCountries);
    const sourceYear = year(source);
    const candidateYear = year(candidate);
    const proximity = sourceYear && candidateYear ? Math.exp(-Math.abs(sourceYear - candidateYear) / 24) : 0;
    const total = semantic * 0.58 + genre * 0.24 + language * 0.07 + region * 0.06 + proximity * 0.05;
    return { total, semantic, genre, language, region, proximity };
  });
  const weakest = scores.reduce((left, right) => (left.total < right.total ? left : right));
  return {
    score: weakest.total,
    features: {
      semantic: weakest.semantic,
      genre_overlap: weakest.genre,
      same_language: weakest.language,
      same_region: weakest.region,
      year_proximity: weakest.proximity,
    },
  };
}

export async function recommend(
  env: Env,
  ctx: ExecutionContextLike,
  payload: Record<string, unknown>,
): Promise<JsonObject> {
  const movieIds = Array.isArray(payload.movie_ids)
    ? payload.movie_ids.filter((item): item is string => typeof item === "string")
    : [];
  if (movieIds.length < 1 || movieIds.length > 5)
    throw new HttpError(422, "Sélectionne entre un et cinq films");
  const offset = Math.max(0, Number(payload.offset ?? 0) || 0);
  const document = await loadCatalog(env);
  const selected = movieIds.map((id) => document.movies.find((movie) => movie.id === id));
  if (selected.some((movie) => !movie)) throw new HttpError(404, "Film de référence introuvable");
  const sourceMovies = selected as CatalogMovie[];
  if (sourceMovies.some((movie) => !movie.tmdb_id))
    throw new HttpError(422, "Chaque film de référence doit avoir un identifiant TMDB");

  const sourceIds = sourceMovies.map((movie) => movie.tmdb_id as number);
  const sourceDetails = await mapConcurrent(sourceIds, 5, (id) => movieDetails(env, ctx, id));
  const related = await mapConcurrent(sourceIds, 3, async (id) =>
    Promise.all([
      relatedMovies(env, ctx, id, "recommendations"),
      relatedMovies(env, ctx, id, "similar"),
    ]),
  );

  const rejected = new Set(document.rejected_recommendation_tmdb_ids);
  const candidates = new Map<number, { item: JsonObject; sources: Set<string> }>();
  for (const [recommendations, similar] of related) {
    for (const [response, source] of [[recommendations, "recommendation"], [similar, "similar"]] as const) {
      for (const item of array(response.results)) {
        const id = Number(item.id);
        if (!id || sourceIds.includes(id) || rejected.has(id) || item.adult === true) continue;
        const current = candidates.get(id) ?? { item, sources: new Set<string>() };
        current.sources.add(source);
        candidates.set(id, current);
      }
    }
  }

  const candidateSeeds = [...candidates.entries()].slice(0, 20);
  const details = await mapConcurrent(candidateSeeds, 6, ([id]) => movieDetails(env, ctx, id));
  const includeAnimation = Boolean(payload.include_animation) || sourceDetails.every((detail) =>
    array(detail.genres).some((genre) => Number(genre.id) === 16),
  );
  const includeDocumentary = Boolean(payload.include_documentary);
  const usable = candidateSeeds
    .map(([id, seed], index) => ({ id, seed, detail: details[index] }))
    .filter(({ detail }) => eligible(detail, includeAnimation, includeDocumentary));

  const profiles = [
    ...sourceDetails.map((detail, index) => profile(detail, sourceMovies[index].director)),
    ...usable.map(({ detail }) => profile(detail)),
  ];
  const embeddingResult = await env.AI.run(env.AI_EMBEDDING_MODEL, { text: profiles });
  const vectors = vectorsFrom(embeddingResult);
  if (vectors.length !== profiles.length) throw new HttpError(503, "Le moteur de recommandation est indisponible");
  const sourceVectors = vectors.slice(0, sourceDetails.length);
  const candidateVectors = vectors.slice(sourceDetails.length);
  const ranked: Candidate[] = usable.map(({ id, seed, detail }, index) => {
    const result = scoreCandidate(sourceDetails, sourceVectors, detail, candidateVectors[index]);
    return { id, detail, sources: seed.sources, ...result };
  }).sort((left, right) => right.score - left.score);

  const page = ranked.slice(offset, offset + 3);
  return {
    data: page.map(({ id, detail }) => {
      const crew = array((detail.credits as JsonObject | undefined)?.crew);
      return {
        id,
        title: detail.title ?? "",
        poster_path: detail.poster_path ?? null,
        director: crew.find((person) => person.job === "Director")?.name ?? "Inconnu",
        release_year: year(detail) || null,
      };
    }),
    pagination: {
      offset,
      limit: 3,
      total: ranked.length,
      has_more: offset + 3 < ranked.length,
    },
    debug: {
      provider: "cloudflare-binding",
      model: env.AI_EMBEDDING_MODEL,
      generation_model: env.AI_GENERATION_MODEL,
      source_tmdb_ids: sourceIds,
      candidate_count: ranked.length,
      ranked_candidate_tmdb_ids: ranked.map((item) => item.id),
      results: page.map((item) => ({
        tmdb_id: item.id,
        score: Number(item.score.toFixed(4)),
        sources: [...item.sources],
        features: [Object.fromEntries(Object.entries(item.features).map(([key, value]) => [key, Number(value.toFixed(4))]))],
      })),
    },
  };
}
