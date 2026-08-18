from fastapi import APIRouter, HTTPException, status

from core.exceptions import CatalogConfigurationError, CatalogStorageError, PaletteExtractionError
from pydantic import BaseModel, Field

from models.catalog import CatalogMovieCreate, CatalogMovieUpdate
from services.catalog_store import get_catalog_store
from services.recommendation_service import recommend_movies

router = APIRouter(prefix="/catalog", tags=["catalog"])


class CatalogTopUpdate(BaseModel):
    movie_ids: list[str | None] = Field(
        default_factory=lambda: [None, None, None],
        min_length=3,
        max_length=3,
    )


class RecommendationRequest(BaseModel):
    movie_ids: list[str] = Field(min_length=1, max_length=5)
    include_animation: bool = False
    include_documentary: bool = False
    offset: int = Field(default=0, ge=0)


@router.get("")
def get_catalog() -> dict:
    try:
        document = get_catalog_store().list_movies()
        return document.model_dump(mode="json")
    except CatalogConfigurationError as error:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(error))
    except CatalogStorageError as error:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(error))


@router.post("")
def create_movie(payload: CatalogMovieCreate) -> dict:
    try:
        movie = get_catalog_store().create_movie(payload)
        return movie.model_dump(mode="json")
    except CatalogConfigurationError as error:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(error))


@router.post("/watchlist")
def create_watchlist_movie(payload: CatalogMovieCreate) -> dict:
    try:
        movie = get_catalog_store().create_watchlist_movie(payload)
        return movie.model_dump(mode="json")
    except CatalogConfigurationError as error:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(error))
    except CatalogStorageError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error))


@router.post("/recommendations")
async def get_recommendations(payload: RecommendationRequest) -> dict:
    try:
        document = get_catalog_store().list_movies()
        selected = [movie for movie in document.movies if movie.id in payload.movie_ids]
        if len(selected) != len(set(payload.movie_ids)):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Film de référence introuvable")
        return await recommend_movies(
            selected,
            document.movies,
            document.watchlist,
            payload.include_animation,
            payload.include_documentary,
            payload.offset,
            set(document.rejected_recommendation_tmdb_ids),
        )
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error))
    except CatalogConfigurationError as error:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(error))
    except CatalogStorageError as error:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(error))
    except PaletteExtractionError as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error))


@router.post("/recommendations/{tmdb_id}/reject")
def reject_recommendation(tmdb_id: int) -> dict:
    try:
        get_catalog_store().reject_recommendation(tmdb_id)
        return {"message": "Recommendation rejected"}
    except CatalogConfigurationError as error:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(error))
    except CatalogStorageError as error:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(error))


@router.post("/watchlist/{movie_id}/watched")
def mark_watchlist_movie_as_watched(movie_id: str) -> dict:
    try:
        movie = get_catalog_store().mark_watchlist_movie_as_watched(movie_id)
        return movie.model_dump(mode="json")
    except CatalogConfigurationError as error:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(error))
    except CatalogStorageError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error))


@router.delete("/watchlist/{movie_id}")
def delete_watchlist_movie(movie_id: str) -> dict:
    try:
        get_catalog_store().delete_watchlist_movie(movie_id)
        return {"message": "Watchlist movie deleted"}
    except CatalogConfigurationError as error:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(error))
    except CatalogStorageError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error))
    except CatalogStorageError as error:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(error))


@router.put("/top")
def update_top(payload: CatalogTopUpdate) -> dict:
    try:
        document = get_catalog_store().update_top_three(payload.movie_ids)
        return document.model_dump(mode="json")
    except CatalogConfigurationError as error:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(error))
    except CatalogStorageError as error:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(error))


@router.put("/{movie_id}")
def update_movie(movie_id: str, payload: CatalogMovieUpdate) -> dict:
    try:
        movie = get_catalog_store().update_movie(movie_id, payload)
        return movie.model_dump(mode="json")
    except CatalogConfigurationError as error:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(error))
    except CatalogStorageError as error:
        if str(error) == "Movie not found":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(error))


@router.delete("/{movie_id}")
def delete_movie(movie_id: str) -> dict:
    try:
        get_catalog_store().delete_movie(movie_id)
        return {"message": "Movie deleted"}
    except CatalogConfigurationError as error:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(error))
    except CatalogStorageError as error:
        if str(error) == "Movie not found":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(error))
