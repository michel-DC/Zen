from fastapi import APIRouter, HTTPException, status

from core.exceptions import CatalogConfigurationError, CatalogStorageError
from models.catalog import CatalogMovieCreate, CatalogMovieUpdate
from services.catalog_store import get_catalog_store

router = APIRouter(prefix="/catalog", tags=["catalog"])


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