import { loadCatalog } from "./catalog";
import { HttpError } from "./http";
import { discoverMovies, mapConcurrent, movieDetails, relatedMovies } from "./tmdb";
import type { CatalogMovie, Env, ExecutionContextLike, JsonObject } from "./types";

type TonightMode = "watchlist" | "surprise";

interface Candidate {
  id: number;
  detail: JsonObject;
  fromWatchlist: boolean;
}

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

function parseMode(value: unknown): TonightMode {
  if (value === "watchlist" || value === "surprise") return value;
  throw new HttpError(422, "Mode invalide");
}

function eligible(detail: JsonObject, minutes: number, excluded: Set<number>): boolean {
  const id = Number(detail.id);
  if (!id || excluded.has(id) || detail.adult === true || !detail.release_date || String(detail.release_date) > dateToday()) return false;
  const genreIds = new Set(array(detail.genres).map((genre) => Number(genre.id)));
  if (genreIds.has(16)) return false;
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
): Promise<Candidate[]> {
  const anchors = [...movies]
    .filter((movie) => movie.tmdb_id)
    .sort((left, right) => Number(right.favorite) - Number(left.favorite) || (right.rating ?? 0) - (left.rating ?? 0))
    .slice(0, 4);
  const related = await mapConcurrent(anchors, 3, async (movie) => {
    const results = await relatedMovies(env, ctx, movie.tmdb_id as number, "recommendations");
    return array(results.results);
  });
  const seeds = related.flat().slice(0, 30);
  if (seeds.length === 0) {
    const discovered = await discoverMovies(env, ctx, { "vote_count.gte": 100, "primary_release_date.lte": dateToday() });
    seeds.push(...array(discovered.results).slice(0, 30));
  }
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
    : await surpriseCandidates(env, ctx, document.movies);
  const candidates = baseCandidates.filter((candidate) => eligible(candidate.detail, availableMinutes, excluded)).slice(0, 18);
  if (!candidates.length) {
    throw new HttpError(404, mode === "watchlist" ? "Aucun film de ta liste ne correspond à ce soir." : "Je ne trouve pas encore de surprise qui corresponde à ce soir.");
  }
  const anchors = document.movies.filter((movie) => movie.tmdb_id).sort((left, right) => Number(right.favorite) - Number(left.favorite) || (right.rating ?? 0) - (left.rating ?? 0)).slice(0, 3);
  const anchorDetails = await mapConcurrent(anchors, 3, (movie) => movieDetails(env, ctx, movie.tmdb_id as number));
  const candidateText = candidates.map((candidate) => `${candidate.id} | ${String(candidate.detail.title ?? "")} | ${director(candidate.detail)} | ${Number(candidate.detail.runtime ?? 0)} min | ${array(candidate.detail.genres).map((genre) => genre.name).join(", ")} | ${String(candidate.detail.overview ?? "").slice(0, 280)}`).join("\n");
  const taste = anchors.map((movie, index) => profile(movie, anchorDetails[index])).join("\n");
  const ranking = await env.AI.run(env.AI_GENERATION_MODEL, {
    messages: [
      { role: "system", content: "Tu sélectionnes trois films pour une séance personnelle. Retourne exclusivement un objet JSON {\"picks\":[{\"id\":number,\"rationale\":string}]}. Garde des raisons concrètes, moins de 230 caractères. Ne sélectionne que les IDs fournis. N’invente rien." },
      { role: "user", content: `Contexte : ${context ?? "aucune précision"}\nTemps disponible : ${availableMinutes} min\nIntensité émotionnelle : ${emotionalIntensity}/5\nRythme souhaité : ${pace}\nSouhait : ${continuity === "continue" ? "rester dans une continuité" : "changer de registre"}\n\nGoûts structurés :\n${taste || "pas encore de repère"}\n\nCandidats :\n${candidateText}` },
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
  const ordered = [...candidates].sort((left, right) => Number(rationales.has(right.id)) - Number(rationales.has(left.id)) || Number(left.detail.runtime ?? 0) - Number(right.detail.runtime ?? 0));
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
