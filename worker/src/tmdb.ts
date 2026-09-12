import { HttpError } from "./http";
import type { Env, ExecutionContextLike, JsonObject } from "./types";

async function fetchTmdb(
  env: Env,
  ctx: ExecutionContextLike,
  endpoint: string,
  params: Record<string, string | number | boolean> = {},
  ttl = 3600,
): Promise<JsonObject> {
  if (!env.TMDB_API_KEY) throw new HttpError(500, "TMDB_API_KEY est manquant");
  const publicUrl = new URL(`${env.TMDB_BASE_URL}${endpoint}`);
  publicUrl.searchParams.set("language", "fr-FR");
  publicUrl.searchParams.set("include_adult", "false");
  for (const [key, value] of Object.entries(params)) publicUrl.searchParams.set(key, String(value));

  // Le détail contient désormais la collection d'images TMDB. La version du
  // cache évite de servir les anciennes réponses dépourvues de ces images.
  const cacheKey = `cache/tmdb/v2${publicUrl.pathname}/${encodeURIComponent(publicUrl.search)}`;
  const cached = await env.CATALOG.get(cacheKey);
  if (cached) {
    try {
      const entry = await cached.json<{ expires: number; payload: JsonObject }>();
      if (entry.expires > Date.now()) return entry.payload;
    } catch {
      // Une entrée de cache invalide est simplement remplacée ci-dessous.
    }
  }

  const upstream = new URL(publicUrl);
  upstream.searchParams.set("api_key", env.TMDB_API_KEY);
  const response = await fetch(upstream, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new HttpError(response.status, `Erreur TMDB ${response.status}`);
  const payload = (await response.json()) as JsonObject;
  ctx.waitUntil(
    env.CATALOG.put(
      cacheKey,
      JSON.stringify({ expires: Date.now() + ttl * 1000, payload }),
      { httpMetadata: { contentType: "application/json" } },
    ),
  );
  return payload;
}

export function movieDetails(
  env: Env,
  ctx: ExecutionContextLike,
  movieId: number,
): Promise<JsonObject> {
  return fetchTmdb(
    env,
    ctx,
    `/movie/${movieId}`,
    { append_to_response: "credits,keywords,release_dates,images", include_image_language: "fr,null,en" },
    86400,
  );
}

export function relatedMovies(
  env: Env,
  ctx: ExecutionContextLike,
  movieId: number,
  kind: "recommendations" | "similar",
): Promise<JsonObject> {
  return fetchTmdb(env, ctx, `/movie/${movieId}/${kind}`, {}, 21600);
}

export function discoverMovies(
  env: Env,
  ctx: ExecutionContextLike,
  params: Record<string, string | number | boolean>,
): Promise<JsonObject> {
  return fetchTmdb(env, ctx, "/discover/movie", { sort_by: "popularity.desc", ...params }, 1800);
}

export function searchMovies(
  env: Env,
  ctx: ExecutionContextLike,
  query: string,
): Promise<JsonObject> {
  return fetchTmdb(env, ctx, "/search/movie", { query, page: 1 }, 300);
}

export function searchPeople(
  env: Env,
  ctx: ExecutionContextLike,
  query: string,
): Promise<JsonObject> {
  return fetchTmdb(env, ctx, "/search/person", { query, page: 1 }, 86400);
}

export function personMovieCredits(
  env: Env,
  ctx: ExecutionContextLike,
  personId: number,
): Promise<JsonObject> {
  return fetchTmdb(env, ctx, `/person/${personId}/movie_credits`, {}, 86400);
}

export async function listMovies(
  env: Env,
  ctx: ExecutionContextLike,
  url: URL,
): Promise<JsonObject> {
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
  const search = url.searchParams.get("search")?.trim();
  const genre = url.searchParams.get("genre")?.trim();
  const filter = url.searchParams.get("filter");
  let endpoint = "/movie/popular";
  const params: Record<string, string | number> = { page };
  if (search) {
    endpoint = "/search/movie";
    params.query = search;
  } else if (genre) {
    const genres = await fetchTmdb(env, ctx, "/genre/movie/list", {}, 86400);
    const match = ((genres.genres as JsonObject[] | undefined) ?? []).find(
      (item) => String(item.name ?? "").toLocaleLowerCase("fr") === genre.toLocaleLowerCase("fr"),
    );
    if (!match) return { data: [], pagination: { page, limit: 0, total: 0, total_pages: 0 } };
    endpoint = "/discover/movie";
    params.with_genres = Number(match.id);
    params.sort_by = "popularity.desc";
  } else if (filter === "Tendance") {
    endpoint = "/trending/movie/week";
  } else if (filter === "Récent") {
    endpoint = "/movie/upcoming";
  }

  const response = await fetchTmdb(env, ctx, endpoint, params, search ? 300 : 1800);
  const results = ((response.results as JsonObject[] | undefined) ?? []).slice(0, 20);
  const details = await mapConcurrent(results, 6, (movie) =>
    movieDetails(env, ctx, Number(movie.id)),
  );
  const enriched = results.map((movie, index) => {
    const detail = details[index];
    const crew = (((detail.credits as JsonObject | undefined)?.crew as JsonObject[] | undefined) ?? []);
    const cast = (((detail.credits as JsonObject | undefined)?.cast as JsonObject[] | undefined) ?? []);
    const director = crew.find((person) => person.job === "Director");
    return {
      ...movie,
      director: director?.name ?? "Inconnu",
      cast: cast.slice(0, 10).map((person) => ({ name: person.name, profile_path: person.profile_path })),
      dominant_color: null,
      palette: [],
    };
  });
  return {
    data: enriched,
    pagination: {
      page,
      limit: enriched.length,
      total: Number(response.total_results ?? 0),
      total_pages: Number(response.total_pages ?? 1),
    },
  };
}

export async function mapConcurrent<T, U>(
  items: T[],
  concurrency: number,
  operation: (item: T, index: number) => Promise<U>,
): Promise<U[]> {
  const output = new Array<U>(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++;
        output[index] = await operation(items[index], index);
      }
    }),
  );
  return output;
}

export function keywordsFrom(detail: JsonObject): string[] {
  const keywords = detail.keywords as JsonObject | undefined;
  const raw = (keywords?.keywords ?? keywords?.results) as JsonObject[] | undefined;
  return (raw ?? []).map((item) => String(item.name ?? "")).filter(Boolean);
}
