import { catalogApi, type CatalogMovie } from "@/lib/services/catalog-api";

/** Marks an active planned step complete once its film has genuinely been logged. */
export async function syncJourneyAfterViewing(movie: CatalogMovie, viewingId: string): Promise<void> {
  if (!movie.tmdb_id) return;
  const { journeys, active_journey_id } = await catalogApi.getJourneys();
  const journey = journeys.find((item) => item.id === active_journey_id);
  const step = journey?.steps.find((item) => item.tmdb_id === movie.tmdb_id && item.status === "planned");
  if (!journey || !step) return;
  await catalogApi.completeJourneyStep(journey.id, step.id, viewingId);
  await catalogApi.adaptJourneyStep(journey.id, step.id, viewingId);
}
