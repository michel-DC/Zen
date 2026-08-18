"""Résout les titres de calibration vers TMDB sans toucher au catalogue."""

from __future__ import annotations

import asyncio

from clients.tmdb import tmdb_client


TITLES = (
    "Eternal Sunshine of the Spotless Mind", "Her", "Marriage Story", "(500) Days of Summer",
    "L'Amour au présent", "Des Mots sur les murs", "Waves", "Bones and All", "Call Me by Your Name",
)


async def main() -> None:
    for title in TITLES:
        payload = await tmdb_client.search_movies(title)
        result = next(iter(payload.get("results", [])), {})
        print(f"{title}\t{result.get('id')}\t{result.get('title')}")


if __name__ == "__main__":
    asyncio.run(main())
