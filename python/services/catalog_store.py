from __future__ import annotations

from datetime import UTC, date, datetime
from threading import Lock
from uuid import uuid4

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError
from botocore.exceptions import ClientError

from core.config import settings
from core.exceptions import CatalogConfigurationError, CatalogStorageError
from models.catalog import (
    CatalogDocument,
    CatalogMovieCreate,
    CatalogMovieRecord,
    CatalogMovieUpdate,
)


def _now() -> datetime:
    return datetime.now(UTC)


class R2CatalogStore:
    def __init__(self) -> None:
        if not settings.CLOUDFLARE_R2_ACCOUNT_ID:
            raise CatalogConfigurationError("CLOUDFLARE_R2_ACCOUNT_ID is missing")
        if not settings.CLOUDFLARE_R2_ACCESS_KEY_ID:
            raise CatalogConfigurationError("CLOUDFLARE_R2_ACCESS_KEY_ID is missing")
        if not settings.CLOUDFLARE_R2_SECRET_ACCESS_KEY:
            raise CatalogConfigurationError("CLOUDFLARE_R2_SECRET_ACCESS_KEY is missing")
        if not settings.CLOUDFLARE_R2_BUCKET_NAME:
            raise CatalogConfigurationError("CLOUDFLARE_R2_BUCKET_NAME is missing")

        endpoint_url = settings.CLOUDFLARE_R2_ENDPOINT_URL or (
            f"https://{settings.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
        )

        self.bucket_name = settings.CLOUDFLARE_R2_BUCKET_NAME
        self.object_key = settings.CLOUDFLARE_R2_CATALOG_KEY
        self._client = boto3.client(
            "s3",
            region_name="auto",
            endpoint_url=endpoint_url,
            aws_access_key_id=settings.CLOUDFLARE_R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
            config=Config(
                connect_timeout=settings.CLOUDFLARE_R2_CONNECT_TIMEOUT,
                read_timeout=settings.CLOUDFLARE_R2_READ_TIMEOUT,
                retries={"max_attempts": settings.CLOUDFLARE_R2_MAX_RETRIES, "mode": "standard"},
            ),
        )
        self._lock = Lock()

    def _empty_document(self) -> CatalogDocument:
        return CatalogDocument(updated_at=_now(), movies=[])

    def load(self) -> CatalogDocument:
        try:
            response = self._client.get_object(Bucket=self.bucket_name, Key=self.object_key)
        except ClientError as error:
            error_code = error.response.get("Error", {}).get("Code", "")
            if error_code in {"NoSuchKey", "404", "NotFound"}:
                return self._empty_document()
            raise CatalogStorageError(str(error)) from error
        except BotoCoreError as error:
            raise CatalogStorageError("R2 catalog storage is unreachable") from error

        body = response["Body"].read().decode("utf-8")
        if not body.strip():
            return self._empty_document()

        try:
            return CatalogDocument.model_validate_json(body)
        except Exception as error:  # pragma: no cover - defensive parsing guard
            raise CatalogStorageError("Invalid catalog JSON stored in R2") from error

    def save(self, document: CatalogDocument) -> CatalogDocument:
        payload = document.model_dump_json(indent=2)
        try:
            self._client.put_object(
                Bucket=self.bucket_name,
                Key=self.object_key,
                Body=payload.encode("utf-8"),
                ContentType="application/json",
            )
        except ClientError as error:
            raise CatalogStorageError(str(error)) from error
        except BotoCoreError as error:
            raise CatalogStorageError("R2 catalog storage is unreachable") from error

        return document

    def list_movies(self) -> CatalogDocument:
        document = self.load()
        document.movies.sort(key=lambda movie: movie.created_at, reverse=True)
        document.watchlist.sort(key=lambda movie: movie.created_at, reverse=True)
        return document

    def create_watchlist_movie(self, payload: CatalogMovieCreate) -> CatalogMovieRecord:
        with self._lock:
            document = self.load()
            if payload.tmdb_id and any(
                movie.tmdb_id == payload.tmdb_id for movie in [*document.movies, *document.watchlist]
            ):
                raise CatalogStorageError("Movie already exists in the catalog or watchlist")

            now = _now()
            movie = CatalogMovieRecord(
                id=str(uuid4()), created_at=now, updated_at=now, **payload.model_dump()
            )
            document.watchlist.insert(0, movie)
            document.updated_at = now
            self.save(document)
            return movie

    def mark_watchlist_movie_as_watched(self, movie_id: str) -> CatalogMovieRecord:
        with self._lock:
            document = self.load()
            movie = next((item for item in document.watchlist if item.id == movie_id), None)
            if movie is None:
                raise CatalogStorageError("Watchlist movie not found")

            document.watchlist = [item for item in document.watchlist if item.id != movie_id]
            existing = next(
                (item for item in document.movies if item.tmdb_id and item.tmdb_id == movie.tmdb_id), None
            )
            if existing is None:
                movie.watched_at = date.today()
                movie.updated_at = _now()
                document.movies.insert(0, movie)
                result = movie
            else:
                result = existing
            document.updated_at = _now()
            self.save(document)
            return result

    def delete_watchlist_movie(self, movie_id: str) -> None:
        with self._lock:
            document = self.load()
            original_length = len(document.watchlist)
            document.watchlist = [movie for movie in document.watchlist if movie.id != movie_id]
            if len(document.watchlist) == original_length:
                raise CatalogStorageError("Watchlist movie not found")
            document.updated_at = _now()
            self.save(document)

    def reject_recommendation(self, tmdb_id: int) -> None:
        with self._lock:
            document = self.load()
            if tmdb_id not in document.rejected_recommendation_tmdb_ids:
                document.rejected_recommendation_tmdb_ids.append(tmdb_id)
                document.updated_at = _now()
                self.save(document)

    def update_top_three(self, movie_ids: list[str | None]) -> CatalogDocument:
        with self._lock:
            document = self.load()
            valid_ids = {movie.id for movie in document.movies}
            sanitized_ids: list[str | None] = [None, None, None]
            seen_ids: set[str] = set()

            for index in range(3):
                movie_id = movie_ids[index] if index < len(movie_ids) else None
                if movie_id in valid_ids and movie_id not in seen_ids:
                    sanitized_ids[index] = movie_id
                    seen_ids.add(movie_id)

            document.top_three = sanitized_ids
            document.updated_at = _now()
            self.save(document)
            document.movies.sort(key=lambda movie: movie.created_at, reverse=True)
            return document

    def create_movie(self, payload: CatalogMovieCreate) -> CatalogMovieRecord:
        with self._lock:
            document = self.load()
            now = _now()
            movie = CatalogMovieRecord(
                id=str(uuid4()),
                created_at=now,
                updated_at=now,
                **payload.model_dump(),
            )
            document.movies.insert(0, movie)
            document.updated_at = now
            self.save(document)
            return movie

    def update_movie(self, movie_id: str, payload: CatalogMovieUpdate) -> CatalogMovieRecord:
        with self._lock:
            document = self.load()
            movie = next((item for item in document.movies if item.id == movie_id), None)
            if movie is None:
                raise CatalogStorageError("Movie not found")

            updates = payload.model_dump(exclude_unset=True)
            for field_name, value in updates.items():
                setattr(movie, field_name, value)

            movie.updated_at = _now()
            document.updated_at = movie.updated_at
            self.save(document)
            return movie

    def delete_movie(self, movie_id: str) -> None:
        with self._lock:
            document = self.load()
            original_length = len(document.movies)
            document.movies = [movie for movie in document.movies if movie.id != movie_id]
            if len(document.movies) == original_length:
                raise CatalogStorageError("Movie not found")

            document.top_three = [
                None if item_id == movie_id else item_id for item_id in document.top_three
            ]
            document.updated_at = _now()
            self.save(document)


catalog_store_instance: R2CatalogStore | None = None


def get_catalog_store() -> R2CatalogStore:
    global catalog_store_instance
    if catalog_store_instance is None:
        catalog_store_instance = R2CatalogStore()
    return catalog_store_instance
