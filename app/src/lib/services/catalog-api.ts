import { API_BASE_URL } from "@/lib/services/api-base-url";
import { fetchApi } from "@/lib/services/api-fetch";
import { readCatalogSnapshot, saveCatalogSnapshot } from "@/lib/offline-catalog";

export type CatalogMovie = {
  id: string;
  title: string;
  release_year: number | null;
  director: string | null;
  overview: string | null;
  poster_url: string | null;
  tmdb_id: number | null;
  genres: string[];
  watched_at: string | null;
  rating: number | null;
  rating_history: Array<{ rating: number; recorded_at: string; viewing_id: string | null }>;
  favorite: boolean;
  notes: string | null;
  viewings: Array<{
    id: string;
    watched_at: string;
    is_rewatch: boolean;
    reflection_status: "pending" | "complete";
    impression: string | null;
    emotions: string[];
    appreciated_aspects: string[];
    conversation: Array<{ id: string; role: "user" | "assistant"; content: string; created_at: string }>;
    created_at: string;
    updated_at: string;
  }>;
  created_at: string;
  updated_at: string;
};

export type CatalogDocument = {
  version: number;
  updated_at: string;
  movies: CatalogMovie[];
  watchlist: CatalogMovie[];
  top_three: Array<string | null>;
  deferred_movies: Array<{ tmdb_id: number; until: string }>;
  tonight_history: Array<{ tmdb_id: number; chosen_at: string }>;
  journeys: Journey[];
  active_journey_id: string | null;
};

export type Journey = {
  id: string;
  title: string;
  intent: string;
  cadence_days: number;
  status: "active" | "saved" | "completed";
  steps: Array<{
    id: string;
    tmdb_id: number;
    title: string;
    director: string;
    poster_path: string | null;
    release_year: number | null;
    rationale: string;
    scheduled_for: string;
    status: "planned" | "completed";
    completed_viewing_id: string | null;
  }>;
  revisions: Array<{ created_at: string; reason: string; previous_step_tmdb_ids: number[] }>;
  created_at: string;
  updated_at: string;
};

export type RecommendationResult = {
  id: number;
  title: string;
  poster_path: string | null;
  director: string;
  release_year: number | null;
};

export type RecommendationResponse = {
  data: RecommendationResult[];
  pagination: { offset: number; limit: number; total: number; has_more: boolean };
  debug: { model: string; source_tmdb_ids: number[]; candidate_count: number; results: unknown[] };
};

export type CatalogMoviePayload = {
  title: string;
  release_year: number | null;
  director: string | null;
  overview: string | null;
  poster_url: string | null;
  tmdb_id: number | null;
  genres: string[];
  watched_at: string | null;
  rating: number | null;
  favorite: boolean;
  notes: string | null;
};

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { detail?: string };
  if (!response.ok) {
    throw new Error(payload?.detail || "Une erreur est survenue");
  }
  return payload;
}

let catalogInMemory: CatalogDocument | null = null;
let catalogRequest: Promise<CatalogDocument> | null = null;

async function loadCatalog(): Promise<CatalogDocument> {
  try {
    const response = await fetchApi(`${API_BASE_URL}/catalog`, { cache: "no-store" });
    const document = await parseResponse<CatalogDocument>(response);
    catalogInMemory = document;
    void saveCatalogSnapshot(document).catch(() => undefined);
    return document;
  } catch (error) {
    if (catalogInMemory) return catalogInMemory;
    const snapshot = await readCatalogSnapshot().catch(() => null);
    if (snapshot) {
      catalogInMemory = snapshot;
      return snapshot;
    }
    throw error;
  }
}

export const catalogApi = {
  async getCatalog(): Promise<CatalogDocument> {
    if (!catalogRequest) catalogRequest = loadCatalog().finally(() => { catalogRequest = null; });
    return catalogRequest;
  },

  async updateTopThree(movieIds: Array<string | null>): Promise<CatalogDocument> {
    const response = await fetchApi(`${API_BASE_URL}/catalog/top`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movie_ids: movieIds }),
    });
    return parseResponse<CatalogDocument>(response);
  },
  async getRecommendations(payload: {
    movie_ids: string[];
    include_animation: boolean;
    include_documentary: boolean;
    offset: number;
  }): Promise<RecommendationResponse> {
    const response = await fetchApi(`${API_BASE_URL}/catalog/recommendations`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    return parseResponse<RecommendationResponse>(response);
  },
  async rejectRecommendation(tmdbId: number): Promise<void> {
    const response = await fetchApi(`${API_BASE_URL}/catalog/recommendations/${tmdbId}/reject`, { method: "POST" });
    if (!response.ok) throw new Error(((await response.json()) as { detail?: string }).detail || "Une erreur est survenue");
  },
  async createWatchlistMovie(payload: CatalogMoviePayload): Promise<CatalogMovie> {
    const response = await fetchApi(`${API_BASE_URL}/catalog/watchlist`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    return parseResponse<CatalogMovie>(response);
  },
  async markWatchlistMovieAsWatched(movieId: string, payload: { watched_at?: string; rating?: number | null; favorite?: boolean; impression?: string | null; emotions?: string[]; appreciated_aspects?: string[] } = {}): Promise<{ movie: CatalogMovie; viewing: CatalogMovie["viewings"][number] }> {
    const response = await fetchApi(`${API_BASE_URL}/catalog/watchlist/${movieId}/watched`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ watched_at: new Date().toLocaleDateString("en-CA"), ...payload }) });
    return parseResponse<{ movie: CatalogMovie; viewing: CatalogMovie["viewings"][number] }>(response);
  },
  async deleteWatchlistMovie(movieId: string): Promise<void> {
    const response = await fetchApi(`${API_BASE_URL}/catalog/watchlist/${movieId}`, { method: "DELETE" });
    if (!response.ok) throw new Error(((await response.json()) as { detail?: string }).detail || "Une erreur est survenue");
  },

  async createMovie(payload: CatalogMoviePayload): Promise<CatalogMovie> {
    const response = await fetchApi(`${API_BASE_URL}/catalog`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return parseResponse<CatalogMovie>(response);
  },
  async updateMovie(
    movieId: string,
    payload: Partial<CatalogMoviePayload>,
  ): Promise<CatalogMovie> {
    const response = await fetchApi(`${API_BASE_URL}/catalog/${movieId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return parseResponse<CatalogMovie>(response);
  },
  async deleteMovie(movieId: string): Promise<void> {
    const response = await fetchApi(`${API_BASE_URL}/catalog/${movieId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const payload = (await response.json()) as { detail?: string };
      throw new Error(payload.detail || "Une erreur est survenue");
    }
  },

  async createViewing(movieId: string, payload: { watched_at: string; rating?: number | null; favorite?: boolean; impression?: string | null; emotions?: string[]; appreciated_aspects?: string[]; is_rewatch?: boolean }) {
    const response = await fetchApi(`${API_BASE_URL}/catalog/${movieId}/viewings`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    return parseResponse<{ movie: CatalogMovie; viewing: CatalogMovie["viewings"][number] }>(response);
  },

  async updateViewing(movieId: string, viewingId: string, payload: { watched_at?: string; rating?: number | null; favorite?: boolean; impression?: string | null; emotions?: string[]; appreciated_aspects?: string[] }) {
    const response = await fetchApi(`${API_BASE_URL}/catalog/${movieId}/viewings/${viewingId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    return parseResponse<{ movie: CatalogMovie; viewing: CatalogMovie["viewings"][number] }>(response);
  },

  async updateRating(movieId: string, rating: number | null, viewingId?: string) {
    const response = await fetchApi(`${API_BASE_URL}/catalog/${movieId}/rating`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating, viewing_id: viewingId }) });
    return parseResponse<CatalogMovie>(response);
  },

  async continueConversation(movieId: string, viewingId: string, message: string) {
    const response = await fetchApi(`${API_BASE_URL}/catalog/${movieId}/viewings/${viewingId}/conversation`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) }, 30_000);
    return parseResponse<{ viewing: CatalogMovie["viewings"][number]; response: string }>(response);
  },

  async getTonightRecommendations(payload: { mode: "watchlist" | "surprise"; available_minutes: number; emotional_intensity: number; pace: "slow" | "balanced" | "paced"; continuity: "continue" | "change"; context?: string; session_exclusions?: number[] }) {
    const response = await fetchApi(`${API_BASE_URL}/catalog/tonight/recommendations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }, 30_000);
    return parseResponse<{ data: Array<{ id: number; title: string; poster_path: string | null; director: string; release_year: number | null; runtime: number | null; rationale: string; source: "watchlist" | "surprise" }> }>(response);
  },

  async decideTonight(payload: { tmdb_id: number; decision: "chosen" | "defer" | "not_interested"; until?: string }) {
    const response = await fetchApi(`${API_BASE_URL}/catalog/tonight/decisions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    return parseResponse<{ message: string }>(response);
  },

  async getJourneys() {
    const response = await fetchApi(`${API_BASE_URL}/catalog/journeys`, { cache: "no-store" });
    return parseResponse<{ journeys: Journey[]; active_journey_id: string | null }>(response);
  },

  async createJourney(payload: { intent: string; title?: string; count?: number; cadence_days?: number; start_date?: string }) {
    const response = await fetchApi(`${API_BASE_URL}/catalog/journeys`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }, 45_000);
    return parseResponse<Journey>(response);
  },

  async activateJourney(journeyId: string) {
    const response = await fetchApi(`${API_BASE_URL}/catalog/journeys/${journeyId}/activate`, { method: "POST" });
    return parseResponse<Journey>(response);
  },

  async postponeJourneyStep(journeyId: string, stepId: string, payload: { days?: 1 | 3 | 7; date?: string }) {
    const response = await fetchApi(`${API_BASE_URL}/catalog/journeys/${journeyId}/steps/${stepId}/postpone`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    return parseResponse<Journey>(response);
  },

  async completeJourneyStep(journeyId: string, stepId: string, viewingId: string) {
    const response = await fetchApi(`${API_BASE_URL}/catalog/journeys/${journeyId}/steps/${stepId}/complete`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ viewing_id: viewingId }) });
    return parseResponse<Journey>(response);
  },

  async adaptJourneyStep(journeyId: string, stepId: string, viewingId: string) {
    const response = await fetchApi(`${API_BASE_URL}/catalog/journeys/${journeyId}/steps/${stepId}/adapt`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ viewing_id: viewingId }) }, 30_000);
    return parseResponse<Journey>(response);
  },
};
