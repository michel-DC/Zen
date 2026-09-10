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
  favorite: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CatalogDocument = {
  version: number;
  updated_at: string;
  movies: CatalogMovie[];
  watchlist: CatalogMovie[];
  top_three: Array<string | null>;
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
  async markWatchlistMovieAsWatched(movieId: string): Promise<CatalogMovie> {
    const response = await fetchApi(`${API_BASE_URL}/catalog/watchlist/${movieId}/watched`, { method: "POST" });
    return parseResponse<CatalogMovie>(response);
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
};
