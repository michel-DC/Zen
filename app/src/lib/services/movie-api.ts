const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export interface Movie {
  id: number;
  title: string;
  overview: string;
  release_year: number | null;
  director: string | null;
  poster_path: string;
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
    const url = new URL(`${API_BASE_URL}/movies`);
    url.searchParams.append("page", page.toString());
    url.searchParams.append("limit", limit.toString());
    if (search) url.searchParams.append("search", search);
    if (filter) url.searchParams.append("filter", filter);
    if (genre) url.searchParams.append("genre", genre);

    const response = await fetch(url.toString());
    if (!response.ok) throw new Error("Failed to fetch movies");
    return response.json();
  },

  /**
   * Récupère le détail d'un film
   */
  async getMovieDetail(id: number): Promise<DetailedMovie> {
    const response = await fetch(`${API_BASE_URL}/movies/${id}`);
    if (!response.ok) throw new Error("Failed to fetch movie details");
    return response.json();
  },

  /**
   * Lance la synchronisation TMDB
   */
  async syncMovies(pages = 1): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/movies/sync?pages=${pages}`, {
      method: "POST",
    });
    if (!response.ok) throw new Error("Sync failed");
    return response.json();
  },
};
