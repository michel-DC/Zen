import asyncio
from typing import List, Optional
from clients.tmdb import tmdb_client
from services.movie_service import MovieService
from services.palette_service import process_palette_extraction
from sqlmodel import Session

class SyncService:
    def __init__(self, session: Session):
        self.movie_service = MovieService(session)

    async def sync_popular_movies(self, pages: int = 1):
        for page in range(1, pages + 1):
            movies_data = await tmdb_client.get_popular_movies(page=page)
            for m in movies_data:
                await self.sync_single_movie(m["id"], basic_info=m)

    async def sync_single_movie(self, movie_id: int, basic_info: Optional[dict] = None):
        # 1. Obtenir détails complets et crédits
        details = await tmdb_client.get_movie_details(movie_id)
        credits = await tmdb_client.get_movie_credits(movie_id)
        
        # 2. Extraire le réalisateur
        director = next((c["name"] for c in credits.get("crew", []) if c["job"] == "Director"), None)
        
        # 3. Préparer les données pour SQLModel
        movie_data = {
            "id": details["id"],
            "title": details["title"],
            "overview": details["overview"],
            "release_year": int(details["release_date"][:4]) if details.get("release_date") else None,
            "runtime": details.get("runtime"),
            "language": details.get("original_language", "en"),
            "poster_path": details.get("poster_path", ""),
            "backdrop_path": details.get("backdrop_path"),
            "tmdb_rating": details.get("vote_average", 0.0),
            "imdb_id": details.get("imdb_id"),
            "director": director
        }
        
        # 4. Créer les genres si besoin
        genre_ids = []
        for g in details.get("genres", []):
            self.movie_service.create_genre(g["id"], g["name"])
            genre_ids.append(g["id"])
            
        # 5. Sauvegarder le film
        movie = self.movie_service.upsert_movie(movie_data, genre_ids)
        
        # 6. Lancer l'extraction de palette en tâche de fond (ou ici pour le seed)
        # On récupère les backdrops
        image_urls = await tmdb_client.get_movie_images(movie_id)
        if image_urls:
            palette_result = await process_palette_extraction(movie_id, image_urls)
            if palette_result:
                self.movie_service.save_palette(
                    movie_id, 
                    palette_result["palette"], 
                    palette_result["dominant_color"]
                )
        
        return movie
