import {
  createMovie,
  createViewing,
  deleteMovie,
  loadCatalog,
  markWatched,
  rejectRecommendation,
  updateRating,
  updateViewing,
  updateMovie,
  updateTop,
} from "./catalog";
import { HttpError, json, options, readJson, readJsonOrEmpty } from "./http";
import { continueConversation } from "./journal";
import { activateJourney, adaptJourneyFromFeedback, completeJourneyStep, createJourney, postponeJourneyStep } from "./journeys";
import { recommend } from "./recommendations";
import { listMovies, movieDetails } from "./tmdb";
import { decideTonight, recommendTonight } from "./tonight";
import type { Env, ExecutionContextLike, JsonObject } from "./types";

async function movieDetail(
  env: Env,
  ctx: ExecutionContextLike,
  movieId: number,
): Promise<JsonObject> {
  const detail = await movieDetails(env, ctx, movieId);
  const credits = detail.credits as JsonObject | undefined;
  const crew = Array.isArray(credits?.crew) ? (credits?.crew as JsonObject[]) : [];
  const cast = Array.isArray(credits?.cast) ? (credits?.cast as JsonObject[]) : [];
  return {
    ...detail,
    release_year: Number(String(detail.release_date ?? "").slice(0, 4)) || null,
    genres: Array.isArray(detail.genres)
      ? (detail.genres as JsonObject[]).map((genre) => genre.name)
      : [],
    director: crew.find((person) => person.job === "Director")?.name ?? "Inconnu",
    cast: cast.slice(0, 10).map((person) => ({ name: person.name, profile_path: person.profile_path })),
    palette: [],
    dominant_color: null,
  };
}

async function route(
  request: Request,
  env: Env,
  ctx: ExecutionContextLike,
): Promise<Response> {
  if (request.method === "OPTIONS") return options(request, env);
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (path.startsWith("/api/v1/catalog") && env.INTERNAL_API_SECRET && request.headers.get("x-zen-internal-secret") !== env.INTERNAL_API_SECRET) {
    throw new HttpError(401, "Accès privé requis");
  }

  if (request.method === "GET" && path === "/health")
    return json(request, env, { status: "ok", runtime: "cloudflare-workers" });
  if (request.method === "GET" && path === "/api/v1/movies")
    return json(request, env, await listMovies(env, ctx, url));
  const detailMatch = path.match(/^\/api\/v1\/movies\/(\d+)$/);
  if (request.method === "GET" && detailMatch)
    return json(request, env, await movieDetail(env, ctx, Number(detailMatch[1])));
  if (request.method === "POST" && path === "/api/v1/extract-palette") {
    throw new HttpError(501, "L'extraction de palette est effectuée dans le navigateur");
  }

  if (request.method === "GET" && path === "/api/v1/catalog")
    return json(request, env, await loadCatalog(env));
  if (request.method === "POST" && path === "/api/v1/catalog")
    return json(request, env, await createMovie(env, await readJson(request), "movies"));
  if (request.method === "POST" && path === "/api/v1/catalog/watchlist")
    return json(request, env, await createMovie(env, await readJson(request), "watchlist"));
  if (request.method === "PUT" && path === "/api/v1/catalog/top")
    return json(request, env, await updateTop(env, await readJson(request)));
  if (request.method === "POST" && path === "/api/v1/catalog/recommendations")
    return json(request, env, await recommend(env, ctx, await readJson(request)));
  if (request.method === "POST" && path === "/api/v1/catalog/tonight/recommendations")
    return json(request, env, await recommendTonight(env, ctx, await readJson(request)));
  if (request.method === "POST" && path === "/api/v1/catalog/tonight/decisions") {
    await decideTonight(env, await readJson(request));
    return json(request, env, { message: "Décision enregistrée" });
  }
  if (request.method === "POST" && path === "/api/v1/catalog/journeys")
    return json(request, env, await createJourney(env, ctx, await readJson(request)));
  if (request.method === "GET" && path === "/api/v1/catalog/journeys") {
    const document = await loadCatalog(env);
    return json(request, env, { journeys: document.journeys, active_journey_id: document.active_journey_id });
  }

  const rejectMatch = path.match(/^\/api\/v1\/catalog\/recommendations\/(\d+)\/reject$/);
  if (request.method === "POST" && rejectMatch) {
    await rejectRecommendation(env, Number(rejectMatch[1]));
    return json(request, env, { message: "Recommendation rejected" });
  }
  const watchedMatch = path.match(/^\/api\/v1\/catalog\/watchlist\/([^/]+)\/watched$/);
  if (request.method === "POST" && watchedMatch)
    return json(request, env, await markWatched(env, decodeURIComponent(watchedMatch[1]), await readJsonOrEmpty(request)));
  const journeyActivateMatch = path.match(/^\/api\/v1\/catalog\/journeys\/([^/]+)\/activate$/);
  if (request.method === "POST" && journeyActivateMatch)
    return json(request, env, await activateJourney(env, decodeURIComponent(journeyActivateMatch[1])));
  const journeyPostponeMatch = path.match(/^\/api\/v1\/catalog\/journeys\/([^/]+)\/steps\/([^/]+)\/postpone$/);
  if (request.method === "POST" && journeyPostponeMatch)
    return json(request, env, await postponeJourneyStep(env, decodeURIComponent(journeyPostponeMatch[1]), decodeURIComponent(journeyPostponeMatch[2]), await readJson(request)));
  const journeyCompleteMatch = path.match(/^\/api\/v1\/catalog\/journeys\/([^/]+)\/steps\/([^/]+)\/complete$/);
  if (request.method === "POST" && journeyCompleteMatch)
    return json(request, env, await completeJourneyStep(env, decodeURIComponent(journeyCompleteMatch[1]), decodeURIComponent(journeyCompleteMatch[2]), await readJson(request)));
  const journeyAdaptMatch = path.match(/^\/api\/v1\/catalog\/journeys\/([^/]+)\/steps\/([^/]+)\/adapt$/);
  if (request.method === "POST" && journeyAdaptMatch)
    return json(request, env, await adaptJourneyFromFeedback(env, decodeURIComponent(journeyAdaptMatch[1]), decodeURIComponent(journeyAdaptMatch[2]), await readJson(request)));
  const viewingMatch = path.match(/^\/api\/v1\/catalog\/([^/]+)\/viewings$/);
  if (request.method === "POST" && viewingMatch)
    return json(request, env, await createViewing(env, decodeURIComponent(viewingMatch[1]), await readJson(request)));
  const viewingUpdateMatch = path.match(/^\/api\/v1\/catalog\/([^/]+)\/viewings\/([^/]+)$/);
  if (request.method === "PATCH" && viewingUpdateMatch)
    return json(request, env, await updateViewing(env, decodeURIComponent(viewingUpdateMatch[1]), decodeURIComponent(viewingUpdateMatch[2]), await readJson(request)));
  const conversationMatch = path.match(/^\/api\/v1\/catalog\/([^/]+)\/viewings\/([^/]+)\/conversation$/);
  if (request.method === "POST" && conversationMatch)
    return json(request, env, await continueConversation(env, ctx, decodeURIComponent(conversationMatch[1]), decodeURIComponent(conversationMatch[2]), await readJson(request)));
  const ratingMatch = path.match(/^\/api\/v1\/catalog\/([^/]+)\/rating$/);
  if (request.method === "PUT" && ratingMatch)
    return json(request, env, await updateRating(env, decodeURIComponent(ratingMatch[1]), await readJson(request)));
  const watchlistMatch = path.match(/^\/api\/v1\/catalog\/watchlist\/([^/]+)$/);
  if (request.method === "DELETE" && watchlistMatch) {
    await deleteMovie(env, decodeURIComponent(watchlistMatch[1]), "watchlist");
    return json(request, env, { message: "Watchlist movie deleted" });
  }
  const movieMatch = path.match(/^\/api\/v1\/catalog\/([^/]+)$/);
  if (request.method === "PUT" && movieMatch)
    return json(request, env, await updateMovie(env, decodeURIComponent(movieMatch[1]), await readJson(request)));
  if (request.method === "DELETE" && movieMatch) {
    await deleteMovie(env, decodeURIComponent(movieMatch[1]), "movies");
    return json(request, env, { message: "Movie deleted" });
  }

  throw new HttpError(404, "Route introuvable");
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContextLike): Promise<Response> {
    try {
      return await route(request, env, ctx);
    } catch (error) {
      if (error instanceof HttpError) return json(request, env, { detail: error.message }, error.status);
      console.error(error);
      return json(request, env, { detail: "Erreur interne du Worker" }, 500);
    }
  },
};
