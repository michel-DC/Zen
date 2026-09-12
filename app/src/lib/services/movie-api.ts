import { API_BASE_URL } from "@/lib/services/api-base-url";
import { fetchApi } from "@/lib/services/api-fetch";

export interface Movie {
  id: number;
  title: string;
  overview: string;
  release_year: number | null;
  director: string | null;
  poster_path: string | null;
  dominant_color: string | null;
  palette: {
    hex: string;
    name: string;
    percentage: number;
  }[];
}

export interface DetailedMovie extends Movie {
  genres: string[];
  cast: {
    name: string;
    profile_path: string | null;
  }[];
  vote_average: number;
  backdrop_path?: string | null;
  images?: {
    backdrops?: Array<{ file_path: string | null }>;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export const movieApi = {
  /**
   * Récupère la liste des films paginée depuis la DB locale
   */
  async getMovies(
    page = 1,
    limit = 32,
    search?: string,
    filter?: string,
    genre?: string,
  ): Promise<PaginatedResponse<Movie>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (search) params.set("search", search);
    if (filter) params.set("filter", filter);
    if (genre) params.set("genre", genre);

    const response = await fetchApi(`${API_BASE_URL}/movies?${params.toString()}`);
    if (!response.ok) throw new Error("Failed to fetch movies");
    return response.json();
  },

  /**
   * Récupère le détail d'un film
   */
  async getMovieDetail(id: number): Promise<DetailedMovie> {
    const response = await fetchApi(`${API_BASE_URL}/movies/${id}`);
    if (!response.ok) throw new Error("Failed to fetch movie details");
    return response.json();
  },

  /**
   * Lance la synchronisation TMDB
   */
  async syncMovies(pages = 1): Promise<{ message: string }> {
    const response = await fetchApi(`${API_BASE_URL}/movies/sync?pages=${pages}`, {
      method: "POST",
    });
    if (!response.ok) throw new Error("Sync failed");
    return response.json();
  },
};
