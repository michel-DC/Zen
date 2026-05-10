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

    # CORS Settings
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000"]

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
