import { API_BASE_URL } from "@/lib/services/api-base-url";

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
  top_three: Array<string | null>;
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

export const catalogApi = {
  async getCatalog(): Promise<CatalogDocument> {
    const response = await fetch(`${API_BASE_URL}/catalog`);
    return parseResponse<CatalogDocument>(response);
  },

  async updateTopThree(movieIds: Array<string | null>): Promise<CatalogDocument> {
    const response = await fetch(`${API_BASE_URL}/catalog/top`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movie_ids: movieIds }),
    });
    return parseResponse<CatalogDocument>(response);
  },

  async createMovie(payload: CatalogMoviePayload): Promise<CatalogMovie> {
    const response = await fetch(`${API_BASE_URL}/catalog`, {
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
    const response = await fetch(`${API_BASE_URL}/catalog/${movieId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return parseResponse<CatalogMovie>(response);
  },
  async deleteMovie(movieId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/catalog/${movieId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const payload = (await response.json()) as { detail?: string };
      throw new Error(payload.detail || "Une erreur est survenue");
    }
  },
};
