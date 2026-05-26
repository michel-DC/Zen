from __future__ import annotations

from datetime import UTC, datetime
from threading import Lock
from uuid import uuid4

import boto3
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

        return document

    def list_movies(self) -> CatalogDocument:
        document = self.load()
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

            document.updated_at = _now()
            self.save(document)


catalog_store_instance: R2CatalogStore | None = None


def get_catalog_store() -> R2CatalogStore:
    global catalog_store_instance
    if catalog_store_instance is None:
        catalog_store_instance = R2CatalogStore()
    return catalog_store_instance