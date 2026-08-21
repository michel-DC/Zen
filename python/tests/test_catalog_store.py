from datetime import UTC, datetime
from threading import Lock

from models.catalog import CatalogDocument, CatalogMovieRecord
from services.catalog_store import R2CatalogStore


def test_marking_watchlist_movie_as_watched_dates_the_catalog_entry_at_transfer_time(
    monkeypatch,
) -> None:
    added_to_watchlist_at = datetime(2026, 8, 18, 11, 0, tzinfo=UTC)
    transferred_at = datetime(2026, 8, 21, 9, 30, tzinfo=UTC)
    movie = CatalogMovieRecord(
        id="watchlist-film",
        title="Film à voir",
        created_at=added_to_watchlist_at,
        updated_at=added_to_watchlist_at,
    )
    document = CatalogDocument(updated_at=added_to_watchlist_at, watchlist=[movie])
    store = object.__new__(R2CatalogStore)
    store._lock = Lock()

    monkeypatch.setattr(store, "load", lambda: document)
    monkeypatch.setattr(store, "save", lambda saved_document: saved_document)
    monkeypatch.setattr("services.catalog_store._now", lambda: transferred_at)

    result = store.mark_watchlist_movie_as_watched(movie.id)

    assert result.created_at == transferred_at
    assert result.updated_at == transferred_at
    assert result.watched_at == transferred_at.date()
    assert document.movies == [result]
    assert document.watchlist == []
