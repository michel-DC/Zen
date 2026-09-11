import { appendConversation, loadCatalog } from "./catalog";
import { HttpError } from "./http";
import { movieDetails } from "./tmdb";
import type { CatalogMovie, Env, ExecutionContextLike, JsonObject, Viewing } from "./types";

function text(value: unknown, max: number, label: string): string {
  if (typeof value !== "string") throw new HttpError(422, `${label} invalide`);
  const clean = value.trim();
  if (!clean || clean.length > max) throw new HttpError(422, `${label} invalide`);
  return clean;
}

function array(value: unknown): JsonObject[] {
  return Array.isArray(value) ? value.filter((item): item is JsonObject => Boolean(item) && typeof item === "object") : [];
}

function publicMovieContext(movie: CatalogMovie, detail: JsonObject): string {
  const crew = array((detail.credits as JsonObject | undefined)?.crew);
  const director = crew.find((person) => person.job === "Director")?.name ?? movie.director ?? "Inconnu";
  const genres = array(detail.genres).map((genre) => String(genre.name ?? "")).filter(Boolean).join(", ");
  const releaseYear = movie.release_year ?? (Number(String(detail.release_date ?? "").slice(0, 4)) || null);
  return [
    `Titre : ${movie.title}`,
    `Réalisateur : ${director}`,
    `Année : ${releaseYear ?? "inconnue"}`,
    genres ? `Genres : ${genres}` : "",
    `Synopsis public : ${String(detail.overview ?? "Aucun synopsis disponible").slice(0, 1800)}`,
  ].filter(Boolean).join("\n");
}

function responseText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object" && typeof (value as { response?: unknown }).response === "string") {
    return (value as { response: string }).response.trim();
  }
  return "Je n’arrive pas à formuler une réponse maintenant. Réessaie dans un instant.";
}

export async function continueConversation(
  env: Env,
  ctx: ExecutionContextLike,
  movieId: string,
  viewingId: string,
  payload: Record<string, unknown>,
): Promise<{ viewing: Viewing; response: string }> {
  const message = text(payload.message, 2000, "Message");
  const document = await loadCatalog(env);
  const movie = document.movies.find((item) => item.id === movieId);
  if (!movie) throw new HttpError(404, "Film introuvable");
  const viewing = movie.viewings.find((item) => item.id === viewingId);
  if (!viewing) throw new HttpError(404, "Visionnage introuvable");
  if (!movie.tmdb_id) throw new HttpError(422, "Ce film ne possède pas de référence TMDB");

  const detail = await movieDetails(env, ctx, movie.tmdb_id);
  const recentMessages = viewing.conversation.slice(-8).map((item) => ({
    role: item.role,
    content: item.content,
  }));
  const generated = await env.AI.run(env.AI_GENERATION_MODEL, {
    messages: [
      {
        role: "system",
        content: "Tu es Zen, un partenaire de discussion cinématographique attentif. Réponds en français, sans inventer de faits précis. Tu peux interpréter avec nuance, questionner l’utilisateur et distinguer clairement les hypothèses des informations publiques. Ne donne jamais de conseils médicaux ou psychologiques. Les données personnelles hors de cette conversation ne te sont pas fournies.",
      },
      { role: "system", content: `Informations publiques du film :\n${publicMovieContext(movie, detail)}` },
      ...recentMessages,
      { role: "user", content: message },
    ],
    max_tokens: 500,
  });
  const response = responseText(generated);
  const saved = await appendConversation(env, movieId, viewingId, message, response);
  return { viewing: saved, response };
}
