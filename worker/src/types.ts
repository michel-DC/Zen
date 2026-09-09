export interface R2ObjectBody {
  json<T>(): Promise<T>;
}

export interface R2BucketBinding {
  get(key: string): Promise<R2ObjectBody | null>;
  put(
    key: string,
    value: string,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
}

export interface AiBinding {
  run(model: string, input: Record<string, unknown>): Promise<unknown>;
}

export interface Env {
  CATALOG: R2BucketBinding;
  AI: AiBinding;
  TMDB_API_KEY: string;
  ALLOWED_ORIGINS: string;
  CATALOG_KEY: string;
  TMDB_BASE_URL: string;
  TMDB_IMAGE_BASE_URL: string;
  AI_EMBEDDING_MODEL: string;
  AI_GENERATION_MODEL: string;
}

export interface CatalogMovie {
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
}

export interface CatalogDocument {
  version: number;
  updated_at: string;
  movies: CatalogMovie[];
  watchlist: CatalogMovie[];
  rejected_recommendation_tmdb_ids: number[];
  top_three: Array<string | null>;
}

export type JsonObject = Record<string, unknown>;

export interface ExecutionContextLike {
  waitUntil(promise: Promise<unknown>): void;
}
