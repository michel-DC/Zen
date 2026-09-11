import { HttpError } from "./http";
import type {
  AppreciatedAspect,
  CatalogDocument,
  CatalogMovie,
  Emotion,
  Env,
  RatingHistoryEntry,
  Viewing,
} from "./types";

const EMOTIONS: Emotion[] = [
  "bouleverse",
  "apaise",
  "nostalgique",
  "joyeux",
  "tendu",
  "melancolique",
  "inspire",
];

const APPRECIATED_ASPECTS: AppreciatedAspect[] = [
  "histoire",
  "personnages",
  "mise_en_scene",
  "image",
  "musique",
  "rythme",
  "dialogues",
  "ambiance",
];

function now(): string {
  return new Date().toISOString();
}

function emptyCatalog(): CatalogDocument {
  return {
    version: 2,
    updated_at: now(),
    movies: [],
    watchlist: [],
    rejected_recommendation_tmdb_ids: [],
    top_three: [null, null, null],
    deferred_movies: [],
    tonight_history: [],
    journeys: [],
    active_journey_id: null,
  };
}

function validDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`));
}

function normalizeSelection<T extends string>(value: unknown, allowed: T[]): T[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is T => typeof item === "string" && allowed.includes(item as T)))];
}

function normalizeRating(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  const onFive = value > 5 ? value / 2 : value;
  const rounded = Math.round(onFive * 2) / 2;
  return rounded >= 0.5 && rounded <= 5 ? rounded : null;
}

function normalizeViewing(value: unknown): Viewing | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<Viewing>;
  if (typeof item.id !== "string" || !validDate(item.watched_at)) return null;
  const createdAt = typeof item.created_at === "string" ? item.created_at : now();
  return {
    id: item.id,
    watched_at: item.watched_at,
    is_rewatch: Boolean(item.is_rewatch),
    reflection_status: item.reflection_status === "complete" ? "complete" : "pending",
    impression: typeof item.impression === "string" ? item.impression : null,
    emotions: normalizeSelection(item.emotions, EMOTIONS),
    appreciated_aspects: normalizeSelection(item.appreciated_aspects, APPRECIATED_ASPECTS),
    conversation: Array.isArray(item.conversation)
      ? item.conversation.filter((message): message is Viewing["conversation"][number] => Boolean(
        message && typeof message === "object" && typeof (message as { id?: unknown }).id === "string"
          && ((message as { role?: unknown }).role === "user" || (message as { role?: unknown }).role === "assistant")
          && typeof (message as { content?: unknown }).content === "string"
          && typeof (message as { created_at?: unknown }).created_at === "string",
      ))
      : [],
    created_at: createdAt,
    updated_at: typeof item.updated_at === "string" ? item.updated_at : createdAt,
  };
}

function normalizeMovie(value: CatalogMovie): CatalogMovie {
  const rating = normalizeRating(value.rating);
  const viewings = Array.isArray(value.viewings)
    ? value.viewings.map(normalizeViewing).filter((viewing): viewing is Viewing => Boolean(viewing))
    : [];
  const history = Array.isArray(value.rating_history)
    ? value.rating_history
      .map((entry): RatingHistoryEntry | null => {
        const normalized = normalizeRating(entry?.rating);
        if (!normalized || typeof entry?.recorded_at !== "string") return null;
        return { rating: normalized, recorded_at: entry.recorded_at, viewing_id: typeof entry.viewing_id === "string" ? entry.viewing_id : null };
      })
      .filter((entry): entry is RatingHistoryEntry => Boolean(entry))
    : rating
      ? [{ rating, recorded_at: value.updated_at || now(), viewing_id: viewings.at(-1)?.id ?? null }]
      : [];
  return { ...value, rating, rating_history: history, viewings };
}

function normalizeCatalog(value: Partial<CatalogDocument>): CatalogDocument {
  const top = Array.isArray(value.top_three) ? value.top_three.slice(0, 3) : [];
  while (top.length < 3) top.push(null);
  return {
    version: 2,
    updated_at: typeof value.updated_at === "string" ? value.updated_at : now(),
    movies: Array.isArray(value.movies) ? value.movies.map(normalizeMovie) : [],
    watchlist: Array.isArray(value.watchlist) ? value.watchlist.map(normalizeMovie) : [],
    rejected_recommendation_tmdb_ids: Array.isArray(
      value.rejected_recommendation_tmdb_ids,
    )
      ? value.rejected_recommendation_tmdb_ids
      : [],
    top_three: top.map((item) => (typeof item === "string" ? item : null)),
    deferred_movies: Array.isArray(value.deferred_movies)
      ? value.deferred_movies.filter((item): item is CatalogDocument["deferred_movies"][number] => Boolean(
        item && typeof item.tmdb_id === "number" && validDate(item.until),
      ))
      : [],
    tonight_history: Array.isArray(value.tonight_history)
      ? value.tonight_history.filter((item): item is CatalogDocument["tonight_history"][number] => Boolean(
        item && typeof item.tmdb_id === "number" && typeof item.chosen_at === "string",
      ))
      : [],
    journeys: Array.isArray(value.journeys) ? value.journeys : [],
    active_journey_id: typeof value.active_journey_id === "string" ? value.active_journey_id : null,
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

function optionalRating(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0.5 || value > 5 || Math.round(value * 2) !== value * 2) {
    throw new HttpError(422, "La note doit être comprise entre 0,5 et 5 par demi-étoile");
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
    output.rating = optionalRating(payload.rating);
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
    rating_history: [],
    favorite: false,
    notes: null,
    viewings: [],
    created_at: timestamp,
    updated_at: timestamp,
    ...moviePayload(payload),
  };
}

function dateFromPayload(value: unknown, fallback = new Date().toISOString().slice(0, 10)): string {
  if (value == null) return fallback;
  if (!validDate(value)) throw new HttpError(422, "La date de visionnage est invalide");
  return value;
}

function optionalSelection<T extends string>(value: unknown, allowed: T[], label: string): T[] {
  if (value == null) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !allowed.includes(item as T))) {
    throw new HttpError(422, `${label} invalide`);
  }
  return [...new Set(value as T[])];
}

function reflectionPayload(payload: Record<string, unknown>): Pick<Viewing, "impression" | "emotions" | "appreciated_aspects" | "reflection_status"> {
  const impression = "impression" in payload ? optionalText(payload.impression, 4000) : null;
  const emotions = optionalSelection(payload.emotions, EMOTIONS, "Émotions");
  const appreciatedAspects = optionalSelection(payload.appreciated_aspects, APPRECIATED_ASPECTS, "Aspects appréciés");
  return {
    impression,
    emotions,
    appreciated_aspects: appreciatedAspects,
    reflection_status: impression || emotions.length || appreciatedAspects.length ? "complete" : "pending",
  };
}

function makeViewing(payload: Record<string, unknown>, isRewatch: boolean): Viewing {
  const timestamp = now();
  return {
    id: crypto.randomUUID(),
    watched_at: dateFromPayload(payload.watched_at),
    is_rewatch: isRewatch,
    ...reflectionPayload(payload),
    conversation: [],
    created_at: timestamp,
    updated_at: timestamp,
  };
}

function currentViewing(movie: CatalogMovie): Viewing | null {
  return movie.viewings.at(-1) ?? null;
}

function applyRating(movie: CatalogMovie, value: unknown, viewingId: string | null): void {
  const rating = optionalRating(value);
  if (rating === movie.rating) return;
  movie.rating = rating;
  if (rating) movie.rating_history.push({ rating, recorded_at: now(), viewing_id: viewingId });
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

  // Ajouter au catalogue un film déjà présent dans « À voir » correspond à
  // l'avoir vu : on le transfère plutôt que de créer un doublon entre listes.
  if (list === "movies" && record.tmdb_id) {
    const watchlistIndex = document.watchlist.findIndex(
      (movie) => movie.tmdb_id === record.tmdb_id,
    );
    if (watchlistIndex !== -1) {
      const [watchlistMovie] = document.watchlist.splice(watchlistIndex, 1);
      const timestamp = now();
      const movedMovie: CatalogMovie = {
        ...watchlistMovie,
        ...record,
        id: watchlistMovie.id,
        created_at: timestamp,
        updated_at: timestamp,
        watched_at: record.watched_at ?? timestamp.slice(0, 10),
      };
      document.movies.unshift(movedMovie);
      await saveCatalog(env, document);
      return movedMovie;
    }
  }

  assertUniqueTmdb(document, record.tmdb_id);
  if (list === "movies" && record.rating) {
    record.rating_history.push({ rating: record.rating, recorded_at: record.created_at, viewing_id: null });
  }
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

export async function markWatched(
  env: Env,
  id: string,
  payload: Record<string, unknown> = {},
): Promise<{ movie: CatalogMovie; viewing: Viewing }> {
  const document = await loadCatalog(env);
  const index = document.watchlist.findIndex((movie) => movie.id === id);
  if (index === -1) throw new HttpError(404, "Movie not found");
  const [movie] = document.watchlist.splice(index, 1);
  const timestamp = now();
  const viewing = makeViewing(payload, false);
  movie.watched_at = viewing.watched_at;
  movie.created_at = timestamp;
  movie.updated_at = timestamp;
  movie.viewings.push(viewing);
  if ("rating" in payload) applyRating(movie, payload.rating, viewing.id);
  if ("favorite" in payload) {
    if (typeof payload.favorite !== "boolean") throw new HttpError(422, "Favori invalide");
    movie.favorite = payload.favorite;
  }
  document.movies.unshift(movie);
  await saveCatalog(env, document);
  return { movie, viewing };
}

export async function createViewing(
  env: Env,
  movieId: string,
  payload: Record<string, unknown>,
): Promise<{ movie: CatalogMovie; viewing: Viewing }> {
  const document = await loadCatalog(env);
  const movie = document.movies.find((item) => item.id === movieId);
  if (!movie) throw new HttpError(404, "Film introuvable");
  // L'ajout direct depuis une fiche de film crée le premier visionnage. Les
  // visionnages ajoutés depuis le journal restent, eux, des revisionnages.
  const viewing = makeViewing(payload, payload.is_rewatch !== false);
  movie.viewings.push(viewing);
  movie.watched_at = viewing.watched_at;
  if ("rating" in payload) applyRating(movie, payload.rating, viewing.id);
  if ("favorite" in payload) {
    if (typeof payload.favorite !== "boolean") throw new HttpError(422, "Favori invalide");
    movie.favorite = payload.favorite;
  }
  movie.updated_at = now();
  await saveCatalog(env, document);
  return { movie, viewing };
}

export async function updateViewing(
  env: Env,
  movieId: string,
  viewingId: string,
  payload: Record<string, unknown>,
): Promise<{ movie: CatalogMovie; viewing: Viewing }> {
  const document = await loadCatalog(env);
  const movie = document.movies.find((item) => item.id === movieId);
  if (!movie) throw new HttpError(404, "Film introuvable");
  const viewing = movie.viewings.find((item) => item.id === viewingId);
  if (!viewing) throw new HttpError(404, "Visionnage introuvable");
  if ("watched_at" in payload) viewing.watched_at = dateFromPayload(payload.watched_at);
  if ("impression" in payload || "emotions" in payload || "appreciated_aspects" in payload) {
    const reflection = reflectionPayload({
      impression: "impression" in payload ? payload.impression : viewing.impression,
      emotions: "emotions" in payload ? payload.emotions : viewing.emotions,
      appreciated_aspects: "appreciated_aspects" in payload ? payload.appreciated_aspects : viewing.appreciated_aspects,
    });
    Object.assign(viewing, reflection);
  }
  if ("rating" in payload) applyRating(movie, payload.rating, viewing.id);
  if ("favorite" in payload) {
    if (typeof payload.favorite !== "boolean") throw new HttpError(422, "Favori invalide");
    movie.favorite = payload.favorite;
  }
  viewing.updated_at = now();
  movie.updated_at = viewing.updated_at;
  await saveCatalog(env, document);
  return { movie, viewing };
}

export async function updateRating(
  env: Env,
  movieId: string,
  payload: Record<string, unknown>,
): Promise<CatalogMovie> {
  const document = await loadCatalog(env);
  const movie = document.movies.find((item) => item.id === movieId);
  if (!movie) throw new HttpError(404, "Film introuvable");
  applyRating(movie, payload.rating, typeof payload.viewing_id === "string" ? payload.viewing_id : currentViewing(movie)?.id ?? null);
  movie.updated_at = now();
  await saveCatalog(env, document);
  return movie;
}

export async function appendConversation(
  env: Env,
  movieId: string,
  viewingId: string,
  userContent: string,
  assistantContent: string,
): Promise<Viewing> {
  const document = await loadCatalog(env);
  const movie = document.movies.find((item) => item.id === movieId);
  if (!movie) throw new HttpError(404, "Film introuvable");
  const viewing = movie.viewings.find((item) => item.id === viewingId);
  if (!viewing) throw new HttpError(404, "Visionnage introuvable");
  const timestamp = now();
  viewing.conversation.push(
    { id: crypto.randomUUID(), role: "user", content: userContent, created_at: timestamp },
    { id: crypto.randomUUID(), role: "assistant", content: assistantContent, created_at: timestamp },
  );
  viewing.updated_at = timestamp;
  movie.updated_at = timestamp;
  await saveCatalog(env, document);
  return viewing;
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
