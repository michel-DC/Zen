import { loadCatalog } from "./catalog";
import { HttpError } from "./http";
import { mapConcurrent, movieDetails, searchMovies } from "./tmdb";
import type { CatalogMovie, Env, ExecutionContextLike, Journey, JourneyStep, JsonObject } from "./types";

function text(value: unknown, max: number, label: string): string {
  if (typeof value !== "string") throw new HttpError(422, `${label} invalide`);
  const clean = value.trim();
  if (!clean || clean.length > max) throw new HttpError(422, `${label} invalide`);
  return clean;
}

function date(value: unknown, fallback: string): string {
  if (value == null) return fallback;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new HttpError(422, "Date invalide");
  return value;
}

function array(value: unknown): JsonObject[] {
  return Array.isArray(value) ? value.filter((item): item is JsonObject => Boolean(item) && typeof item === "object") : [];
}

function aiText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && typeof (value as { response?: unknown }).response === "string") return (value as { response: string }).response;
  return "";
}

function json(value: unknown): unknown {
  const raw = aiText(value).replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try { return JSON.parse(raw); } catch { return null; }
}

function director(detail: JsonObject): string {
  const credits = detail.credits as JsonObject | undefined;
  return String(array(credits?.crew).find((person) => person.job === "Director")?.name ?? "Inconnu");
}

function addDays(start: string, days: number): string {
  const value = new Date(`${start}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function publicCard(detail: JsonObject): string {
  return `${Number(detail.id)} | ${String(detail.title ?? "")} | ${director(detail)} | ${String(detail.release_date ?? "").slice(0, 4)} | ${array(detail.genres).map((genre) => genre.name).join(", ")} | ${String(detail.overview ?? "").slice(0, 300)}`;
}

async function candidateQueries(env: Env, intent: string): Promise<string[]> {
  const result = await env.AI.run(env.AI_GENERATION_MODEL, {
    messages: [
      { role: "system", content: "Retourne uniquement un tableau JSON de trois recherches courtes et précises à envoyer à TMDB pour construire un parcours cinéma. Pas de phrases, pas de noms de plateformes." },
      { role: "user", content: intent },
    ],
    max_tokens: 160,
  });
  const parsed = json(result);
  if (!Array.isArray(parsed)) return [intent];
  const queries = parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 1).map((item) => item.trim().slice(0, 80));
  return queries.length ? queries.slice(0, 3) : [intent];
}

export async function createJourney(
  env: Env,
  ctx: ExecutionContextLike,
  payload: Record<string, unknown>,
): Promise<Journey> {
  const intent = text(payload.intent, 500, "Objectif");
  const title = typeof payload.title === "string" && payload.title.trim() ? payload.title.trim().slice(0, 100) : intent.slice(0, 72);
  const count = typeof payload.count === "number" && Number.isInteger(payload.count) && payload.count >= 4 && payload.count <= 6 ? payload.count : 5;
  const cadence = typeof payload.cadence_days === "number" && Number.isInteger(payload.cadence_days) && payload.cadence_days >= 2 && payload.cadence_days <= 3 ? payload.cadence_days : 3;
  const startDate = date(payload.start_date, new Date().toISOString().slice(0, 10));
  const document = await loadCatalog(env);
  const watched = new Set(document.movies.map((movie) => movie.tmdb_id).filter((id): id is number => Boolean(id)));
  const queries = await candidateQueries(env, intent);
  const results = await mapConcurrent(queries, 3, (query) => searchMovies(env, ctx, query));
  const seedIds = [...new Set(results.flatMap((result) => array(result.results).map((item) => Number(item.id))).filter(Boolean))].filter((id) => !watched.has(id)).slice(0, 32);
  const details = await mapConcurrent(seedIds, 5, (id) => movieDetails(env, ctx, id));
  const today = new Date().toISOString().slice(0, 10);
  const candidates = details.filter((detail) => detail.adult !== true && typeof detail.release_date === "string" && detail.release_date <= today);
  if (candidates.length < count) throw new HttpError(404, "Pas assez de films inédits trouvés pour ce parcours.");
  const ranking = await env.AI.run(env.AI_GENERATION_MODEL, {
    messages: [
      { role: "system", content: `Construis un parcours de exactement ${count} films. Retourne uniquement {"steps":[{"id":number,"rationale":string}]}. Chaque rationale doit expliquer le rôle de l’étape en moins de 180 caractères. Choisis seulement parmi les IDs fournis, sans répétition.` },
      { role: "user", content: `Objectif : ${intent}\n\nCandidats :\n${candidates.map(publicCard).join("\n")}` },
    ],
    max_tokens: 800,
  });
  const parsed = json(ranking) as { steps?: Array<{ id?: unknown; rationale?: unknown }> } | null;
  const candidateById = new Map(candidates.map((detail) => [Number(detail.id), detail]));
  const selected = (parsed?.steps ?? [])
    .filter((step): step is { id: number; rationale?: string } => typeof step?.id === "number" && candidateById.has(step.id))
    .filter((step, index, all) => all.findIndex((entry) => entry.id === step.id) === index)
    .slice(0, count);
  const fallback = candidates.filter((detail) => !selected.some((step) => step.id === Number(detail.id))).slice(0, count - selected.length).map((detail) => ({ id: Number(detail.id), rationale: "Une étape cohérente pour faire progresser le parcours." }));
  const steps: JourneyStep[] = [...selected, ...fallback].map((selection, index) => {
    const detail = candidateById.get(selection.id) as JsonObject;
    return {
      id: crypto.randomUUID(),
      tmdb_id: selection.id,
      title: String(detail.title ?? ""),
      director: director(detail),
      poster_path: typeof detail.poster_path === "string" ? detail.poster_path : null,
      release_year: Number(String(detail.release_date ?? "").slice(0, 4)) || null,
      rationale: typeof selection.rationale === "string" ? selection.rationale.slice(0, 180) : "Une étape cohérente pour faire progresser le parcours.",
      scheduled_for: addDays(startDate, index * cadence),
      status: "planned",
      completed_viewing_id: null,
    };
  });
  const timestamp = new Date().toISOString();
  const journey: Journey = { id: crypto.randomUUID(), title, intent, cadence_days: cadence, status: "saved", steps, revisions: [], created_at: timestamp, updated_at: timestamp };
  document.journeys.unshift(journey);
  document.updated_at = timestamp;
  await env.CATALOG.put(env.CATALOG_KEY, JSON.stringify(document, null, 2), { httpMetadata: { contentType: "application/json" } });
  return journey;
}

export async function activateJourney(env: Env, journeyId: string): Promise<Journey> {
  const document = await loadCatalog(env);
  const journey = document.journeys.find((item) => item.id === journeyId);
  if (!journey) throw new HttpError(404, "Parcours introuvable");
  document.journeys.forEach((item) => { if (item.status === "active") item.status = "saved"; });
  journey.status = "active";
  journey.updated_at = new Date().toISOString();
  document.active_journey_id = journey.id;
  document.updated_at = journey.updated_at;
  await env.CATALOG.put(env.CATALOG_KEY, JSON.stringify(document, null, 2), { httpMetadata: { contentType: "application/json" } });
  return journey;
}

export async function postponeJourneyStep(env: Env, journeyId: string, stepId: string, payload: Record<string, unknown>): Promise<Journey> {
  const days = typeof payload.days === "number" && Number.isInteger(payload.days) && [1, 3, 7].includes(payload.days) ? payload.days : null;
  const customDate = typeof payload.date === "string" ? date(payload.date, "") : null;
  if (!days && !customDate) throw new HttpError(422, "Choisis un report de 1, 3 ou 7 jours, ou une date.");
  const document = await loadCatalog(env);
  const journey = document.journeys.find((item) => item.id === journeyId);
  if (!journey) throw new HttpError(404, "Parcours introuvable");
  const stepIndex = journey.steps.findIndex((step) => step.id === stepId && step.status === "planned");
  if (stepIndex === -1) throw new HttpError(404, "Étape introuvable");
  const previous = journey.steps[stepIndex].scheduled_for;
  const next = customDate ?? addDays(previous, days as number);
  const offset = Math.round((Date.parse(`${next}T12:00:00Z`) - Date.parse(`${previous}T12:00:00Z`)) / 86400000);
  journey.steps.slice(stepIndex).forEach((step) => { step.scheduled_for = addDays(step.scheduled_for, offset); });
  journey.updated_at = new Date().toISOString();
  document.updated_at = journey.updated_at;
  await env.CATALOG.put(env.CATALOG_KEY, JSON.stringify(document, null, 2), { httpMetadata: { contentType: "application/json" } });
  return journey;
}

export async function completeJourneyStep(env: Env, journeyId: string, stepId: string, payload: Record<string, unknown>): Promise<Journey> {
  const document = await loadCatalog(env);
  const journey = document.journeys.find((item) => item.id === journeyId);
  if (!journey) throw new HttpError(404, "Parcours introuvable");
  const step = journey.steps.find((item) => item.id === stepId);
  if (!step) throw new HttpError(404, "Étape introuvable");
  if (typeof payload.viewing_id !== "string") throw new HttpError(422, "Visionnage invalide");
  step.status = "completed";
  step.completed_viewing_id = payload.viewing_id;
  if (journey.steps.every((item) => item.status === "completed")) {
    journey.status = "completed";
    if (document.active_journey_id === journey.id) document.active_journey_id = null;
  }
  journey.updated_at = new Date().toISOString();
  document.updated_at = journey.updated_at;
  await env.CATALOG.put(env.CATALOG_KEY, JSON.stringify(document, null, 2), { httpMetadata: { contentType: "application/json" } });
  return journey;
}

export async function adaptJourneyFromFeedback(
  env: Env,
  journeyId: string,
  stepId: string,
  payload: Record<string, unknown>,
): Promise<Journey> {
  if (typeof payload.viewing_id !== "string") throw new HttpError(422, "Visionnage invalide");
  const document = await loadCatalog(env);
  const journey = document.journeys.find((item) => item.id === journeyId);
  if (!journey) throw new HttpError(404, "Parcours introuvable");
  const completedIndex = journey.steps.findIndex((step) => step.id === stepId && step.status === "completed");
  if (completedIndex === -1) throw new HttpError(422, "L’étape doit être terminée avant adaptation");
  const remaining = journey.steps.slice(completedIndex + 2).filter((step) => step.status === "planned");
  if (remaining.length < 2) return journey;
  const completed = journey.steps[completedIndex];
  const movie = document.movies.find((item) => item.tmdb_id === completed.tmdb_id);
  const viewing = movie?.viewings.find((item) => item.id === payload.viewing_id);
  if (!movie || !viewing) throw new HttpError(404, "Retour de visionnage introuvable");
  const ranking = await env.AI.run(env.AI_GENERATION_MODEL, {
    messages: [
      { role: "system", content: "Retourne uniquement un tableau JSON d’IDs, tous choisis dans la liste fournie et sans répétition. Réordonne les futures étapes pour tenir compte du retour structuré, sans modifier l’intention du parcours." },
      { role: "user", content: `Parcours : ${journey.intent}\nRetour structuré : note ${movie.rating ?? "absente"}/5 ; émotions ${viewing.emotions.join(", ") || "aucune"} ; aspects ${viewing.appreciated_aspects.join(", ") || "aucun"}.\nÉtapes à ordonner :\n${remaining.map((step) => `${step.tmdb_id} | ${step.title} | ${step.rationale}`).join("\n")}` },
    ],
    max_tokens: 300,
  });
  const parsed = json(ranking);
  const rankedIds = Array.isArray(parsed) ? parsed.filter((item): item is number => typeof item === "number") : [];
  const byId = new Map(remaining.map((step) => [step.tmdb_id, step]));
  const reordered = rankedIds.map((id) => byId.get(id)).filter((step): step is JourneyStep => Boolean(step));
  for (const step of remaining) if (!reordered.includes(step)) reordered.push(step);
  if (reordered.every((step, index) => step.id === remaining[index].id)) return journey;
  const firstDate = remaining[0].scheduled_for;
  reordered.forEach((step, index) => { step.scheduled_for = addDays(firstDate, index * journey.cadence_days); });
  journey.steps.splice(completedIndex + 2, remaining.length, ...reordered);
  journey.revisions.unshift({ created_at: new Date().toISOString(), reason: "Suite adaptée à ton retour structuré", previous_step_tmdb_ids: remaining.map((step) => step.tmdb_id) });
  journey.updated_at = new Date().toISOString();
  document.updated_at = journey.updated_at;
  await env.CATALOG.put(env.CATALOG_KEY, JSON.stringify(document, null, 2), { httpMetadata: { contentType: "application/json" } });
  return journey;
}
