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
  /**
   * Shared only between the Vercel server route and this Worker.  When absent
   * (local development), catalog routes stay available to the local app.
   */
  INTERNAL_API_SECRET?: string;
}

export type Emotion =
  | "bouleverse"
  | "apaise"
  | "nostalgique"
  | "joyeux"
  | "tendu"
  | "melancolique"
  | "inspire";

export type AppreciatedAspect =
  | "histoire"
  | "personnages"
  | "mise_en_scene"
  | "image"
  | "musique"
  | "rythme"
  | "dialogues"
  | "ambiance";

export interface RatingHistoryEntry {
  rating: number;
  recorded_at: string;
  viewing_id: string | null;
}

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface Viewing {
  id: string;
  watched_at: string;
  is_rewatch: boolean;
  reflection_status: "pending" | "complete";
  impression: string | null;
  emotions: Emotion[];
  appreciated_aspects: AppreciatedAspect[];
  conversation: ConversationMessage[];
  created_at: string;
  updated_at: string;
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
  rating_history: RatingHistoryEntry[];
  favorite: boolean;
  notes: string | null;
  viewings: Viewing[];
  created_at: string;
  updated_at: string;
}

export interface DeferredMovie {
  tmdb_id: number;
  until: string;
}

export interface TonightHistoryEntry {
  tmdb_id: number;
  chosen_at: string;
}

export interface JourneyStep {
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
}

export interface JourneyRevision {
  created_at: string;
  reason: string;
  previous_step_tmdb_ids: number[];
}

export interface Journey {
  id: string;
  title: string;
  intent: string;
  cadence_days: number;
  status: "active" | "saved" | "completed";
  steps: JourneyStep[];
  revisions: JourneyRevision[];
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
  deferred_movies: DeferredMovie[];
  tonight_history: TonightHistoryEntry[];
  journeys: Journey[];
  active_journey_id: string | null;
}

export type JsonObject = Record<string, unknown>;

export interface ExecutionContextLike {
  waitUntil(promise: Promise<unknown>): void;
}
