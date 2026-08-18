import asyncio

import httpx
from typing import List, Optional, Dict, Any
from core.config import settings
from core.exceptions import PaletteExtractionError

class TMDBClient:
    def __init__(self):
        self.api_key = settings.TMDB_API_KEY
        self.base_url = settings.TMDB_BASE_URL
        self._request_semaphore = asyncio.Semaphore(8)
        if not self.api_key:
            print("WARNING: TMDB_API_KEY is not set in environment.")

    async def _get(self, endpoint: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        params = params or {}
        params["api_key"] = self.api_key
        params["language"] = "fr-FR"
        params["include_adult"] = "false"
        timeout = httpx.Timeout(
            timeout=settings.DOWNLOAD_TIMEOUT,
            connect=min(settings.DOWNLOAD_TIMEOUT, 5),
        )
        
        for attempt in range(3):
            try:
                async with self._request_semaphore:
                    async with httpx.AsyncClient() as client:
                        response = await client.get(
                            f"{self.base_url}{endpoint}",
                            params=params,
                            timeout=timeout,
                        )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as error:
                retryable = error.response.status_code in {429, 500, 502, 503, 504}
                if not retryable or attempt == 2:
                    raise PaletteExtractionError(f"TMDB API error: {error.response.status_code} - {error.response.text}") from error
            except httpx.HTTPError as error:
                if attempt == 2:
                    raise PaletteExtractionError(f"Network error calling TMDB: {str(error)}") from error
            await asyncio.sleep(0.4 * (attempt + 1))

    async def get_popular_movies(self, page: int = 1) -> Dict[str, Any]:
        """Retourne l'objet complet TMDB (results, total_pages, etc.)"""
        return await self._get("/movie/popular", params={"page": page})

    async def get_trending_movies(self, page: int = 1) -> Dict[str, Any]:
        """Retourne les films tendances de la semaine"""
        return await self._get("/trending/movie/week", params={"page": page})

    async def get_upcoming_movies(self, page: int = 1) -> Dict[str, Any]:
        """Retourne les films à venir (Récent)"""
        return await self._get("/movie/upcoming", params={"page": page})

    async def get_movies_by_genre(self, genre_id: int, page: int = 1) -> Dict[str, Any]:
        """Découvre des films par genre"""
        return await self._get("/discover/movie", params={"with_genres": genre_id, "page": page, "sort_by": "popularity.desc"})

    async def discover_movies(self, params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Retourne un canal de candidats TMDB, limité à une page pertinente."""
        data = await self._get("/discover/movie", params={**params, "page": 1, "sort_by": "popularity.desc"})
        return data.get("results", [])

    async def get_genres(self) -> List[Dict[str, Any]]:
        """Récupère la liste des genres TMDB"""
        data = await self._get("/genre/movie/list")
        return data.get("genres", [])

    async def search_movies(self, query: str, page: int = 1) -> Dict[str, Any]:
        """Retourne l'objet complet TMDB (results, total_pages, etc.)"""
        return await self._get("/search/movie", params={"query": query, "page": page})

    async def search_keywords(self, query: str) -> List[Dict[str, Any]]:
        data = await self._get("/search/keyword", params={"query": query, "page": 1})
        return data.get("results", [])

    async def get_movie_details(self, movie_id: int) -> Dict[str, Any]:
        return await self._get(
            f"/movie/{movie_id}",
            params={"append_to_response": "release_dates"},
        )

    async def get_movie_credits(self, movie_id: int) -> Dict[str, Any]:
        return await self._get(f"/movie/{movie_id}/credits")

    async def get_movie_images(self, movie_id: int) -> List[str]:
        data = await self._get(f"/movie/{movie_id}/images", params={"include_image_language": "en,null"})
        backdrops = data.get("backdrops", [])
        return [f"{settings.TMDB_IMAGE_BASE_URL}/original{b['file_path']}" for b in backdrops]

    async def get_movie_keywords(self, movie_id: int) -> List[str]:
        return [item["name"] for item in await self.get_movie_keyword_entries(movie_id) if item.get("name")]

    async def get_movie_keyword_entries(self, movie_id: int) -> List[Dict[str, Any]]:
        data = await self._get(f"/movie/{movie_id}/keywords")
        return [item for item in data.get("keywords", []) if item.get("id") and item.get("name")]

    async def get_movie_reviews(self, movie_id: int) -> List[str]:
        data = await self._get(f"/movie/{movie_id}/reviews", params={"page": 1})
        return [item.get("content", "") for item in data.get("results", []) if item.get("content")]

    async def get_movie_recommendations(self, movie_id: int) -> List[Dict[str, Any]]:
        data = await self._get(f"/movie/{movie_id}/recommendations")
        return data.get("results", [])

    async def get_similar_movies(self, movie_id: int) -> List[Dict[str, Any]]:
        data = await self._get(f"/movie/{movie_id}/similar")
        return data.get("results", [])

tmdb_client = TMDBClient()
