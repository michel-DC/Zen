from datetime import date, datetime

from pydantic import BaseModel, Field, field_validator


def _clean_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _empty_top_three() -> list[str | None]:
    return [None, None, None]


def _normalize_top_three(value: object) -> list[str | None]:
    if not isinstance(value, list):
        return _empty_top_three()

    normalized: list[str | None] = []
    seen: set[str] = set()

    for item in value[:3]:
        if isinstance(item, str):
            cleaned = item.strip()
            if cleaned and cleaned not in seen:
                normalized.append(cleaned)
                seen.add(cleaned)
                continue
        normalized.append(None)

    while len(normalized) < 3:
        normalized.append(None)

    return normalized


class CatalogMovieBase(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    release_year: int | None = Field(default=None, ge=1888, le=2100)
    director: str | None = Field(default=None, max_length=120)
    overview: str | None = Field(default=None, max_length=5000)
    poster_url: str | None = Field(default=None, max_length=500)
    tmdb_id: int | None = Field(default=None, ge=1)
    genres: list[str] = Field(default_factory=list)
    watched_at: date | None = None
    rating: float | None = Field(default=None, ge=0, le=10)
    favorite: bool = False
    notes: str | None = Field(default=None, max_length=4000)

    @field_validator("title", "director", "overview", "poster_url", "notes", mode="before")
    @classmethod
    def strip_text_fields(cls, value: str | None) -> str | None:
        return _clean_text(value)

    @field_validator("genres", mode="before")
    @classmethod
    def normalize_genres(cls, value: list[str] | str | None) -> list[str]:
        if value is None:
            return []

        if isinstance(value, str):
            raw_items = value.split(",")
        else:
            raw_items = value

        return [item.strip() for item in raw_items if item and item.strip()]


class CatalogMovieCreate(CatalogMovieBase):
    pass


class CatalogMovieUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    release_year: int | None = Field(default=None, ge=1888, le=2100)
    director: str | None = Field(default=None, max_length=120)
    overview: str | None = Field(default=None, max_length=5000)
    poster_url: str | None = Field(default=None, max_length=500)
    tmdb_id: int | None = Field(default=None, ge=1)
    genres: list[str] | str | None = None
    watched_at: date | None = None
    rating: float | None = Field(default=None, ge=0, le=10)
    favorite: bool | None = None
    notes: str | None = Field(default=None, max_length=4000)

    @field_validator("title", "director", "overview", "poster_url", "notes", mode="before")
    @classmethod
    def strip_optional_text_fields(cls, value: str | None) -> str | None:
        return _clean_text(value)

    @field_validator("genres", mode="before")
    @classmethod
    def normalize_optional_genres(cls, value: list[str] | str | None) -> list[str] | None:
        if value is None:
            return None

        if isinstance(value, str):
            raw_items = value.split(",")
        else:
            raw_items = value

        return [item.strip() for item in raw_items if item and item.strip()]


class CatalogMovieRecord(CatalogMovieBase):
    id: str
    created_at: datetime
    updated_at: datetime


class CatalogDocument(BaseModel):
    version: int = 1
    updated_at: datetime
    movies: list[CatalogMovieRecord] = Field(default_factory=list)
    watchlist: list[CatalogMovieRecord] = Field(default_factory=list)
    rejected_recommendation_tmdb_ids: list[int] = Field(default_factory=list)
    top_three: list[str | None] = Field(
        default_factory=_empty_top_three,
        min_length=3,
        max_length=3,
    )

    @field_validator("top_three", mode="before")
    @classmethod
    def normalize_top_three(cls, value: object) -> list[str | None]:
        return _normalize_top_three(value)
