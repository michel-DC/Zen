from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # API Settings
    PROJECT_NAME: str = "Zen Backend"
    VERSION: str = "1.0.0"
    API_V1_STR: str = ""

    # API TMDB
    TMDB_API_KEY: str = ""
    TMDB_BASE_URL: str = "https://api.themoviedb.org/3"
    TMDB_IMAGE_BASE_URL: str = "https://image.tmdb.org/t/p"

    # Extraction Settings
    COLORS_PER_IMAGE: int = 12
    MAX_IMAGES: int = 3
    DOWNLOAD_TIMEOUT: int = 10

    # Recommendation engine
    RECOMMENDATION_AI_PROVIDER: str = "ollama"

    # Local provider (Ollama)
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_EMBEDDING_MODEL: str = "qwen3-embedding:0.6b"
    OLLAMA_RERANKING_MODEL: str = "qwen3:1.7b"
    # A recommendation can embed the selected film plus several dozen TMDB candidates.
    # Keep this generous on CPU-only local installations.
    OLLAMA_TIMEOUT: int = 120
    OLLAMA_RERANKING_TIMEOUT: int = 180

    # Production provider (Cloudflare Workers AI)
    CLOUDFLARE_AI_ACCOUNT_ID: str = ""
    CLOUDFLARE_AI_API_TOKEN: str = ""
    CLOUDFLARE_AI_BASE_URL: str = "https://api.cloudflare.com/client/v4"
    CLOUDFLARE_AI_EMBEDDING_MODEL: str = "@cf/qwen/qwen3-embedding-0.6b"
    CLOUDFLARE_AI_GENERATION_MODEL: str = "@cf/meta/llama-3.1-8b-instruct-fast"
    CLOUDFLARE_AI_TIMEOUT: int = 120

    # CORS Settings
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000"]

    # Cloudflare R2 Settings
    CLOUDFLARE_R2_ACCOUNT_ID: str = ""
    CLOUDFLARE_R2_ACCESS_KEY_ID: str = ""
    CLOUDFLARE_R2_SECRET_ACCESS_KEY: str = ""
    CLOUDFLARE_R2_BUCKET_NAME: str = ""
    CLOUDFLARE_R2_CATALOG_KEY: str = "catalog.json"
    CLOUDFLARE_R2_ENDPOINT_URL: str = ""
    CLOUDFLARE_R2_CONNECT_TIMEOUT: int = 5
    CLOUDFLARE_R2_READ_TIMEOUT: int = 10
    CLOUDFLARE_R2_MAX_RETRIES: int = 1

    # Admin Settings
    CATALOG_ADMIN_TOKEN: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
