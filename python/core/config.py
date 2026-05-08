from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # API Settings
    PROJECT_NAME: str = "# Extracteur palette de couleurs"
    VERSION: str = "1.0.0"
    API_V1_STR: str = ""

    # Extraction Settings
    COLORS_PER_IMAGE: int = 12
    MAX_IMAGES: int = 5
    DOWNLOAD_TIMEOUT: int = 10
    
    # CORS Settings
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000"]

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
    )


settings = Settings()
