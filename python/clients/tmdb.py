import httpx
from typing import List, Optional, Dict, Any
from core.config import settings
from core.exceptions import PaletteExtractionError

class TMDBClient:
    def __init__(self):
        self.api_key = settings.TMDB_API_KEY
        self.base_url = settings.TMDB_BASE_URL
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
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}{endpoint}",
                    params=params,
                    timeout=timeout,
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                raise PaletteExtractionError(f"TMDB API error: {e.response.status_code} - {e.response.text}")
            except Exception as e:
                raise PaletteExtractionError(f"Network error calling TMDB: {str(e)}")

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

    async def get_genres(self) -> List[Dict[str, Any]]:
        """Récupère la liste des genres TMDB"""
        data = await self._get("/genre/movie/list")
        return data.get("genres", [])

    async def search_movies(self, query: str, page: int = 1) -> Dict[str, Any]:
        """Retourne l'objet complet TMDB (results, total_pages, etc.)"""
        return await self._get("/search/movie", params={"query": query, "page": page})

    async def get_movie_details(self, movie_id: int) -> Dict[str, Any]:
        return await self._get(f"/movie/{movie_id}")

    async def get_movie_credits(self, movie_id: int) -> Dict[str, Any]:
        return await self._get(f"/movie/{movie_id}/credits")

    async def get_movie_images(self, movie_id: int) -> List[str]:
        data = await self._get(f"/movie/{movie_id}/images", params={"include_image_language": "en,null"})
        backdrops = data.get("backdrops", [])
        return [f"{settings.TMDB_IMAGE_BASE_URL}/original{b['file_path']}" for b in backdrops]

tmdb_client = TMDBClient()
