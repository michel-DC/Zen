import { HttpError } from "./http";
import type { CatalogDocument, CatalogMovie, Env } from "./types";

function now(): string {
  return new Date().toISOString();
}

function emptyCatalog(): CatalogDocument {
  return {
    version: 1,
    updated_at: now(),
    movies: [],
    watchlist: [],
    rejected_recommendation_tmdb_ids: [],
    top_three: [null, null, null],
  };
}

function normalizeCatalog(value: Partial<CatalogDocument>): CatalogDocument {
  const top = Array.isArray(value.top_three) ? value.top_three.slice(0, 3) : [];
  while (top.length < 3) top.push(null);
  return {
    version: typeof value.version === "number" ? value.version : 1,
    updated_at: typeof value.updated_at === "string" ? value.updated_at : now(),
    movies: Array.isArray(value.movies) ? value.movies : [],
    watchlist: Array.isArray(value.watchlist) ? value.watchlist : [],
    rejected_recommendation_tmdb_ids: Array.isArray(
      value.rejected_recommendation_tmdb_ids,
    )
      ? value.rejected_recommendation_tmdb_ids
      : [],
    top_three: top.map((item) => (typeof item === "string" ? item : null)),
  };
}

export async function loadCatalog(env: Env): Promise<CatalogDocument> {
  const object = await env.CATALOG.get(env.CATALOG_KEY);
  if (!object) return emptyCatalog();
  try {
    return normalizeCatalog(await object.json<Partial<CatalogDocument>>());
  } catch {
    throw new HttpError(500, "Catalogue R2 invalide");
  }
}

async function saveCatalog(env: Env, document: CatalogDocument): Promise<void> {
  document.updated_at = now();
  await env.CATALOG.put(env.CATALOG_KEY, JSON.stringify(document, null, 2), {
    httpMetadata: { contentType: "application/json" },
  });
}

function optionalText(value: unknown, max: number): string | null {
  if (value == null) return null;
  if (typeof value !== "string") throw new HttpError(422, "Champ texte invalide");
  const clean = value.trim();
  if (clean.length > max) throw new HttpError(422, "Champ texte trop long");
  return clean || null;
}

function optionalNumber(
  value: unknown,
  min: number,
  max: number,
  field: string,
): number | null {
  if (value == null) return null;
  if (typeof value !== "number" || value < min || value > max) {
    throw new HttpError(422, `${field} invalide`);
  }
  return value;
}

function moviePayload(
  payload: Record<string, unknown>,
  partial = false,
): Partial<CatalogMovie> {
  const output: Partial<CatalogMovie> = {};
  if (!partial || "title" in payload) {
    const title = optionalText(payload.title, 200);
    if (!title) throw new HttpError(422, "Le titre est requis");
    output.title = title;
  }
  if (!partial || "release_year" in payload)
    output.release_year = optionalNumber(payload.release_year, 1888, 2100, "Année");
  if (!partial || "director" in payload) output.director = optionalText(payload.director, 120);
  if (!partial || "overview" in payload) output.overview = optionalText(payload.overview, 5000);
  if (!partial || "poster_url" in payload) output.poster_url = optionalText(payload.poster_url, 500);
  if (!partial || "tmdb_id" in payload)
    output.tmdb_id = optionalNumber(payload.tmdb_id, 1, Number.MAX_SAFE_INTEGER, "Identifiant TMDB");
  if (!partial || "genres" in payload) {
    const raw = payload.genres;
    const genres = typeof raw === "string" ? raw.split(",") : raw;
    if (genres != null && !Array.isArray(genres)) throw new HttpError(422, "Genres invalides");
    output.genres = (genres ?? [])
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (!partial || "watched_at" in payload)
    output.watched_at = optionalText(payload.watched_at, 10);
  if (!partial || "rating" in payload)
    output.rating = optionalNumber(payload.rating, 0, 10, "Note");
  if (!partial || "favorite" in payload) {
    if (payload.favorite != null && typeof payload.favorite !== "boolean")
      throw new HttpError(422, "Favori invalide");
    output.favorite = Boolean(payload.favorite);
  }
  if (!partial || "notes" in payload) output.notes = optionalText(payload.notes, 4000);
  return output;
}

function createRecord(payload: Record<string, unknown>): CatalogMovie {
  const timestamp = now();
  return {
    id: crypto.randomUUID(),
    title: "",
    release_year: null,
    director: null,
    overview: null,
    poster_url: null,
    tmdb_id: null,
    genres: [],
    watched_at: null,
    rating: null,
    favorite: false,
    notes: null,
    created_at: timestamp,
    updated_at: timestamp,
    ...moviePayload(payload),
  };
}

function assertUniqueTmdb(document: CatalogDocument, tmdbId: number | null): void {
  if (
    tmdbId &&
    [...document.movies, ...document.watchlist].some((movie) => movie.tmdb_id === tmdbId)
  ) {
    throw new HttpError(409, "Movie already exists in the catalog or watchlist");
  }
}

export async function createMovie(
  env: Env,
  payload: Record<string, unknown>,
  list: "movies" | "watchlist",
): Promise<CatalogMovie> {
  const document = await loadCatalog(env);
  const record = createRecord(payload);
  assertUniqueTmdb(document, record.tmdb_id);
  document[list].unshift(record);
  await saveCatalog(env, document);
  return record;
}

export async function updateMovie(
  env: Env,
  id: string,
  payload: Record<string, unknown>,
): Promise<CatalogMovie> {
  const document = await loadCatalog(env);
  const movie = document.movies.find((item) => item.id === id);
  if (!movie) throw new HttpError(404, "Movie not found");
  const changes = moviePayload(payload, true);
  if (
    changes.tmdb_id &&
    changes.tmdb_id !== movie.tmdb_id &&
    [...document.movies, ...document.watchlist].some(
      (item) => item.id !== id && item.tmdb_id === changes.tmdb_id,
    )
  ) {
    throw new HttpError(409, "Movie already exists in the catalog or watchlist");
  }
  Object.assign(movie, changes, { updated_at: now() });
  await saveCatalog(env, document);
  return movie;
}

export async function deleteMovie(
  env: Env,
  id: string,
  list: "movies" | "watchlist",
): Promise<void> {
  const document = await loadCatalog(env);
  const index = document[list].findIndex((movie) => movie.id === id);
  if (index === -1) throw new HttpError(404, "Movie not found");
  document[list].splice(index, 1);
  if (list === "movies") {
    document.top_three = document.top_three.map((movieId) =>
      movieId === id ? null : movieId,
    );
  }
  await saveCatalog(env, document);
}

export async function markWatched(env: Env, id: string): Promise<CatalogMovie> {
  const document = await loadCatalog(env);
  const index = document.watchlist.findIndex((movie) => movie.id === id);
  if (index === -1) throw new HttpError(404, "Movie not found");
  const [movie] = document.watchlist.splice(index, 1);
  movie.watched_at = movie.watched_at ?? new Date().toISOString().slice(0, 10);
  movie.updated_at = now();
  document.movies.unshift(movie);
  await saveCatalog(env, document);
  return movie;
}

export async function updateTop(
  env: Env,
  payload: Record<string, unknown>,
): Promise<CatalogDocument> {
  const ids = payload.movie_ids;
  if (!Array.isArray(ids) || ids.length !== 3)
    throw new HttpError(422, "movie_ids doit contenir exactement trois valeurs");
  const normalized = ids.map((item) => (typeof item === "string" && item.trim() ? item.trim() : null));
  const present = normalized.filter((item): item is string => Boolean(item));
  if (new Set(present).size !== present.length)
    throw new HttpError(422, "Un film ne peut apparaître qu'une fois dans le Top 3");
  const document = await loadCatalog(env);
  if (present.some((id) => !document.movies.some((movie) => movie.id === id)))
    throw new HttpError(422, "Un film du Top 3 est absent du catalogue");
  document.top_three = normalized;
  await saveCatalog(env, document);
  return document;
}

export async function rejectRecommendation(env: Env, tmdbId: number): Promise<void> {
  const document = await loadCatalog(env);
  if (!document.rejected_recommendation_tmdb_ids.includes(tmdbId)) {
    document.rejected_recommendation_tmdb_ids.push(tmdbId);
    await saveCatalog(env, document);
  }
}
