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
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(f"{self.base_url}{endpoint}", params=params, timeout=10)
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                raise PaletteExtractionError(f"TMDB API error: {e.response.status_code} - {e.response.text}")
            except Exception as e:
                raise PaletteExtractionError(f"Network error calling TMDB: {str(e)}")

    async def get_popular_movies(self, page: int = 1) -> List[Dict[str, Any]]:
        data = await self._get("/movie/popular", params={"page": page})
        return data.get("results", [])

    async def search_movies(self, query: str, page: int = 1) -> List[Dict[str, Any]]:
        data = await self._get("/search/movie", params={"query": query, "page": page})
        return data.get("results", [])

    async def get_movie_details(self, movie_id: int) -> Dict[str, Any]:
        return await self._get(f"/movie/{movie_id}")

    async def get_movie_credits(self, movie_id: int) -> Dict[str, Any]:
        return await self._get(f"/movie/{movie_id}/credits")

    async def get_movie_images(self, movie_id: int) -> List[str]:
        data = await self._get(f"/movie/{movie_id}/images", params={"include_image_language": "en,null"})
        backdrops = data.get("backdrops", [])
        # On construit les URLs complètes pour le microservice
        return [f"{settings.TMDB_IMAGE_BASE_URL}/original{b['file_path']}" for b in backdrops]

tmdb_client = TMDBClient()
