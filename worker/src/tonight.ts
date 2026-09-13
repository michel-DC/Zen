import { loadCatalog } from "./catalog";
import { HttpError } from "./http";
import { discoverMovies, mapConcurrent, movieDetails, relatedMovies, searchMovies } from "./tmdb";
import type { CatalogMovie, Env, ExecutionContextLike, JsonObject } from "./types";

type TonightMode = "watchlist" | "surprise";

interface Candidate {
  id: number;
  detail: JsonObject;
  fromWatchlist: boolean;
}

interface GenreDefinition {
  id: number;
  name: string;
  aliases: string[];
}

interface ContextPreferences {
  includedGenreIds: number[];
  excludedGenreIds: number[];
  referenceTitle: string | null;
}

const GENRES: GenreDefinition[] = [
  { id: 28, name: "action", aliases: ["action"] },
  { id: 12, name: "aventure", aliases: ["aventure"] },
  { id: 35, name: "comédie", aliases: ["comedie", "drôle", "drole"] },
  { id: 80, name: "crime", aliases: ["crime", "criminel", "polar"] },
  { id: 99, name: "documentaire", aliases: ["documentaire"] },
  { id: 18, name: "drame", aliases: ["drame", "dramatique"] },
  { id: 10751, name: "famille", aliases: ["famille", "familial"] },
  { id: 14, name: "fantastique", aliases: ["fantastique", "fantasy"] },
  { id: 36, name: "histoire", aliases: ["historique"] },
  { id: 27, name: "horreur", aliases: ["horreur", "épouvante", "epouvante"] },
  { id: 10402, name: "musique", aliases: ["musical", "musique"] },
  { id: 9648, name: "mystère", aliases: ["mystere", "enquête", "enquete"] },
  { id: 10749, name: "romance", aliases: ["romance", "romantique", "histoire d'amour"] },
  { id: 878, name: "science-fiction", aliases: ["science fiction", "science-fiction", "sci-fi", "sf"] },
  { id: 53, name: "thriller", aliases: ["thriller", "suspense"] },
  { id: 10752, name: "guerre", aliases: ["guerre"] },
  { id: 37, name: "western", aliases: ["western"] },
];

function array(value: unknown): JsonObject[] {
  return Array.isArray(value) ? value.filter((item): item is JsonObject => Boolean(item) && typeof item === "object") : [];
}

function dateToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function number(value: unknown, fallback: number, min: number, max: number): number {
  if (value == null) return fallback;
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new HttpError(422, "Préférence invalide");
  }
  return value;
}

function optionalText(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string" || value.trim().length > 400) throw new HttpError(422, "Contexte invalide");
  return value.trim() || null;
}

function normalizeText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
}

function aliasPositions(text: string, alias: string): number[] {
  const positions: number[] = [];
  let cursor = text.indexOf(alias);
  while (cursor >= 0) {
    const before = cursor === 0 ? " " : text[cursor - 1];
    const after = cursor + alias.length === text.length ? " " : text[cursor + alias.length];
    if (!/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after)) positions.push(cursor);
    cursor = text.indexOf(alias, cursor + alias.length);
  }
  return positions;
}

function contextPreferences(context: string | null): ContextPreferences {
  if (!context) return { includedGenreIds: [], excludedGenreIds: [], referenceTitle: null };
  const normalized = normalizeText(context);
  const excludedGenreIds: number[] = [];
  const includedGenreIds: number[] = [];
  const negativePrefix = /(?:pas\s+(?:de|du|d')?|sans|ni|aucun(?:e)?)\s*(?:film(?:s)?\s+)?$/;

  for (const genre of GENRES) {
    const positions = genre.aliases.flatMap((alias) => aliasPositions(normalized, normalizeText(alias)));
    if (!positions.length) continue;
    const isExcluded = positions.some((position) => negativePrefix.test(normalized.slice(Math.max(0, position - 40), position)));
    if (isExcluded) excludedGenreIds.push(genre.id);
    else includedGenreIds.push(genre.id);
  }

  const reference = context.match(/(?:dans le style de|semblable à|proche de|comme)\s+[«"']?([^,;.!?]+)/i)?.[1]
    ?.replace(/[»"']+$/g, "")
    .replace(/\s+(?:mais|sans|pas de)\b.*$/i, "")
    .trim() || null;
  return { includedGenreIds, excludedGenreIds, referenceTitle: reference };
}

function parseMode(value: unknown): TonightMode {
  if (value === "watchlist" || value === "surprise") return value;
  throw new HttpError(422, "Mode invalide");
}

function eligible(
  detail: JsonObject,
  minutes: number,
  excluded: Set<number>,
  includedGenreIds: Set<number>,
  excludedGenreIds: Set<number>,
): boolean {
  const id = Number(detail.id);
  if (!id || excluded.has(id) || detail.adult === true || !detail.release_date || String(detail.release_date) > dateToday()) return false;
  const genreIds = new Set(array(detail.genres).map((genre) => Number(genre.id)));
  if (genreIds.has(16) || [...excludedGenreIds].some((genreId) => genreIds.has(genreId))) return false;
  if (includedGenreIds.size && ![...includedGenreIds].some((genreId) => genreIds.has(genreId))) return false;
  const runtime = Number(detail.runtime ?? 0);
  return !runtime || runtime <= minutes + 15;
}

function director(detail: JsonObject): string {
  const crew = array((detail.credits as JsonObject | undefined)?.crew);
  return String(crew.find((person) => person.job === "Director")?.name ?? "Inconnu");
}

function profile(movie: CatalogMovie, detail: JsonObject): string {
  const genres = array(detail.genres).map((genre) => String(genre.name ?? "")).filter(Boolean).join(", ");
  return [movie.title, movie.director ?? "", genres, String(detail.overview ?? "").slice(0, 500)].filter(Boolean).join(" · ");
}

function extractResponse(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && typeof (value as { response?: unknown }).response === "string") return (value as { response: string }).response;
  return "";
}

function parseRanking(value: unknown, candidates: Candidate[]): Map<number, string> {
  try {
    const response = value && typeof value === "object" ? (value as { response?: unknown }).response : null;
    const parsed = response && typeof response === "object"
      ? response as { picks?: Array<{ id?: unknown; rationale?: unknown }> }
      : JSON.parse(extractResponse(value).replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim()) as { picks?: Array<{ id?: unknown; rationale?: unknown }> } | Array<{ id?: unknown; rationale?: unknown }>;
    const picks = Array.isArray(parsed) ? parsed : parsed.picks;
    if (!Array.isArray(picks)) return new Map();
    const allowed = new Set(candidates.map((candidate) => candidate.id));
    return new Map(picks
      .filter((pick): pick is { id: number; rationale?: string } => typeof pick?.id === "number" && allowed.has(pick.id))
      .map((pick) => [pick.id, typeof pick.rationale === "string" ? pick.rationale.slice(0, 260) : "Un choix cohérent pour ce soir."]));
  } catch {
    return new Map();
  }
}

async function surpriseCandidates(
  env: Env,
  ctx: ExecutionContextLike,
  movies: CatalogMovie[],
  preferences: ContextPreferences,
): Promise<Candidate[]> {
  const anchors = [...movies]
    .filter((movie) => movie.tmdb_id)
    .sort((left, right) => Number(right.favorite) - Number(left.favorite) || (right.rating ?? 0) - (left.rating ?? 0))
    .slice(0, 4);
  const discoverParams: Record<string, string | number | boolean> = {
    "vote_count.gte": 100,
    "primary_release_date.lte": dateToday(),
    without_genres: [16, ...preferences.excludedGenreIds].join(","),
  };
  if (preferences.includedGenreIds.length) discoverParams.with_genres = preferences.includedGenreIds.join("|");

  const [related, contextualDiscovery, broadDiscovery, referenceSeeds] = await Promise.all([
    mapConcurrent(anchors, 3, async (movie) => {
      const results = await relatedMovies(env, ctx, movie.tmdb_id as number, "recommendations");
      return array(results.results);
    }),
    discoverMovies(env, ctx, discoverParams),
    discoverMovies(env, ctx, {
      "vote_count.gte": 250,
      "primary_release_date.lte": dateToday(),
      without_genres: [16, ...preferences.excludedGenreIds].join(","),
    }),
    (async () => {
      if (!preferences.referenceTitle) return [];
      const search = await searchMovies(env, ctx, preferences.referenceTitle);
      const referenceId = Number(array(search.results)[0]?.id);
      if (!referenceId) return [];
      const [recommendations, similar] = await Promise.all([
        relatedMovies(env, ctx, referenceId, "recommendations"),
        relatedMovies(env, ctx, referenceId, "similar"),
      ]);
      return [...array(recommendations.results), ...array(similar.results)];
    })(),
  ]);
  const seeds = [
    ...referenceSeeds,
    ...array(contextualDiscovery.results),
    ...array(broadDiscovery.results),
    ...related.flat(),
  ];
  const unique = [...new Map(seeds.map((item) => [Number(item.id), item])).values()].filter((item) => Number(item.id));
  const details = await mapConcurrent(unique.slice(0, 24), 5, (item) => movieDetails(env, ctx, Number(item.id)));
  return details.map((detail) => ({ id: Number(detail.id), detail, fromWatchlist: false }));
}

export async function recommendTonight(
  env: Env,
  ctx: ExecutionContextLike,
  payload: Record<string, unknown>,
): Promise<JsonObject> {
  const mode = parseMode(payload.mode);
  const availableMinutes = number(payload.available_minutes, 150, 45, 300);
  const emotionalIntensity = number(payload.emotional_intensity, 3, 1, 5);
  const pace = payload.pace === "slow" || payload.pace === "balanced" || payload.pace === "paced" ? payload.pace : "balanced";
  const continuity = payload.continuity === "continue" || payload.continuity === "change" ? payload.continuity : "continue";
  const context = optionalText(payload.context);
  const preferences = contextPreferences(context);
  const sessionExclusions = new Set(Array.isArray(payload.session_exclusions)
    ? payload.session_exclusions.filter((item): item is number => typeof item === "number")
    : []);
  const document = await loadCatalog(env);
  const seen = new Set(document.movies.map((movie) => movie.tmdb_id).filter((id): id is number => Boolean(id)));
  const deferred = new Set(document.deferred_movies.filter((item) => item.until >= dateToday()).map((item) => item.tmdb_id));
  const rejected = new Set(document.rejected_recommendation_tmdb_ids);
  const excluded = new Set([...sessionExclusions, ...deferred, ...rejected, ...(mode === "surprise" ? seen : [])]);
  const baseCandidates = mode === "watchlist"
    ? await mapConcurrent(document.watchlist.filter((movie) => movie.tmdb_id), 5, async (movie) => ({
      id: movie.tmdb_id as number,
      detail: await movieDetails(env, ctx, movie.tmdb_id as number),
      fromWatchlist: true,
    }))
    : await surpriseCandidates(env, ctx, document.movies, preferences);
  const includedGenreIds = new Set(preferences.includedGenreIds);
  const excludedGenreIds = new Set(preferences.excludedGenreIds);
  const candidates = baseCandidates.filter((candidate) => eligible(candidate.detail, availableMinutes, excluded, includedGenreIds, excludedGenreIds)).slice(0, 18);
  if (!candidates.length) {
    throw new HttpError(404, mode === "watchlist" ? "Aucun film de ta liste ne correspond à ce soir." : "Je ne trouve pas encore de surprise qui corresponde à ce soir.");
  }
  const anchors = document.movies.filter((movie) => movie.tmdb_id).sort((left, right) => Number(right.favorite) - Number(left.favorite) || (right.rating ?? 0) - (left.rating ?? 0)).slice(0, 3);
  const anchorDetails = await mapConcurrent(anchors, 3, (movie) => movieDetails(env, ctx, movie.tmdb_id as number));
  const candidateText = candidates.map((candidate) => `${candidate.id} | ${String(candidate.detail.title ?? "")} | ${director(candidate.detail)} | ${Number(candidate.detail.runtime ?? 0)} min | ${array(candidate.detail.genres).map((genre) => genre.name).join(", ")} | ${String(candidate.detail.overview ?? "").slice(0, 280)}`).join("\n");
  const taste = anchors.map((movie, index) => profile(movie, anchorDetails[index])).join("\n");
  const includedGenres = GENRES.filter((genre) => preferences.includedGenreIds.includes(genre.id)).map((genre) => genre.name).join(", ") || "aucun";
  const excludedGenres = GENRES.filter((genre) => preferences.excludedGenreIds.includes(genre.id)).map((genre) => genre.name).join(", ") || "aucun";
  const ranking = await env.AI.run(env.AI_GENERATION_MODEL, {
    messages: [
      { role: "system", content: "Tu sélectionnes trois films pour une séance personnelle. Les précisions et exclusions explicites de la personne sont prioritaires sur son catalogue et sur la continuité. Retourne exclusivement un objet JSON {\"picks\":[{\"id\":number,\"rationale\":string}]}. Garde des raisons concrètes, moins de 230 caractères. Ne sélectionne que les IDs fournis. N’invente rien." },
      { role: "user", content: `Contexte : ${context ?? "aucune précision"}\nGenres demandés : ${includedGenres}\nGenres strictement exclus : ${excludedGenres}\nTemps disponible : ${availableMinutes} min\nIntensité émotionnelle : ${emotionalIntensity}/5\nRythme souhaité : ${pace}\nSouhait : ${continuity === "continue" ? "rester dans une continuité" : "changer de registre"}\n\nGoûts structurés (repère secondaire) :\n${taste || "pas encore de repère"}\n\nCandidats :\n${candidateText}` },
    ],
    max_tokens: 500,
    temperature: 0.2,
    response_format: {
      type: "json_schema",
      json_schema: {
        type: "object",
        properties: {
          picks: {
            type: "array",
            minItems: 3,
            maxItems: 3,
            items: {
              type: "object",
              properties: {
                id: { type: "number" },
                rationale: { type: "string" },
              },
              required: ["id", "rationale"],
            },
          },
        },
        required: ["picks"],
      },
    },
  });
  const rationales = parseRanking(ranking, candidates);
  const ranks = new Map([...rationales.keys()].map((id, index) => [id, index]));
  const ordered = [...candidates].sort((left, right) => (ranks.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (ranks.get(right.id) ?? Number.MAX_SAFE_INTEGER) || Number(left.detail.runtime ?? 0) - Number(right.detail.runtime ?? 0));
  return {
    data: ordered.slice(0, 3).map((candidate, index) => ({
      id: candidate.id,
      title: String(candidate.detail.title ?? ""),
      poster_path: typeof candidate.detail.poster_path === "string" ? candidate.detail.poster_path : null,
      director: director(candidate.detail),
      release_year: Number(String(candidate.detail.release_date ?? "").slice(0, 4)) || null,
      runtime: Number(candidate.detail.runtime ?? 0) || null,
      rationale: rationales.get(candidate.id) ?? (index === 0 ? "Le meilleur équilibre pour le temps et le rythme que tu as choisis." : "Une alternative cohérente pour ce soir."),
      source: candidate.fromWatchlist ? "watchlist" : "surprise",
    })),
  };
}

export async function decideTonight(
  env: Env,
  payload: Record<string, unknown>,
): Promise<void> {
  if (typeof payload.tmdb_id !== "number" || !Number.isInteger(payload.tmdb_id)) throw new HttpError(422, "Film invalide");
  if (payload.decision !== "chosen" && payload.decision !== "defer" && payload.decision !== "not_interested") {
    throw new HttpError(422, "Décision invalide");
  }
  const document = await loadCatalog(env);
  const tmdbId = payload.tmdb_id;
  if (payload.decision === "chosen") {
    document.tonight_history.unshift({ tmdb_id: tmdbId, chosen_at: new Date().toISOString() });
    document.tonight_history = document.tonight_history.slice(0, 30);
  }
  if (payload.decision === "defer") {
    const until = typeof payload.until === "string" && /^\d{4}-\d{2}-\d{2}$/.test(payload.until)
      ? payload.until
      : new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    document.deferred_movies = [...document.deferred_movies.filter((item) => item.tmdb_id !== tmdbId), { tmdb_id: tmdbId, until }];
  }
  if (payload.decision === "not_interested") {
    document.watchlist = document.watchlist.filter((movie) => movie.tmdb_id !== tmdbId);
    if (!document.rejected_recommendation_tmdb_ids.includes(tmdbId)) document.rejected_recommendation_tmdb_ids.push(tmdbId);
  }
  document.updated_at = new Date().toISOString();
  await env.CATALOG.put(env.CATALOG_KEY, JSON.stringify(document, null, 2), { httpMetadata: { contentType: "application/json" } });
}
