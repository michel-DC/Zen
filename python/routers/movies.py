import asyncio
from fastapi import APIRouter, Query, HTTPException
from clients.tmdb import tmdb_client
from services.palette_service import process_palette_extraction
from core.config import settings
from lib.color_names import getColorName
from typing import List, Optional

router = APIRouter(tags=["movies"])

async def enrich_movie_metadata(movie: dict, use_backdrops: bool = False) -> dict:
    """
    Enrichit un film TMDB avec sa palette de couleurs et son réalisateur.
    """
    try:
        movie_id = movie["id"]
        tasks = []
        
        # Tâche A : Récupérer le réalisateur et le cast
        tasks.append(tmdb_client.get_movie_credits(movie_id))
        
        # Tâche B : Préparer l'extraction de palette
        if use_backdrops:
            tasks.append(tmdb_client.get_movie_images(movie_id))
        else:
            poster_path = movie.get("poster_path")
            image_urls = [f"{settings.TMDB_IMAGE_BASE_URL}/w500{poster_path}"] if poster_path else []
            tasks.append(asyncio.sleep(0, result=image_urls))

        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Traitement réalisateur et cast
        credits = results[0] if not isinstance(results[0], Exception) else {}
        movie["director"] = next((c["name"] for c in credits.get("crew", []) if c["job"] == "Director"), "Inconnu")
        
        # On ne prend que les 10 premiers acteurs
        movie["cast"] = [
            {
                "name": cast["name"],
                "profile_path": cast["profile_path"]
            }
            for cast in credits.get("cast", [])[:10]
        ]
        
        # Traitement palette
        image_urls = results[1] if isinstance(results[1], list) else []
        movie["palette"] = []
        movie["dominant_color"] = None

        if image_urls:
            try:
                palette_result = await process_palette_extraction(movie_id, image_urls)
                if palette_result:
                    movie["palette"] = [
                        {"hex": p["hex"], "name": getColorName(p["hex"]), "percentage": p["percentage"]}
                        for p in palette_result["palette"]
                    ]
                    movie["dominant_color"] = palette_result["dominant_color"]
            except Exception:
                pass
    except Exception:
        movie["director"] = "Inconnu"
        movie["palette"] = []
        movie["cast"] = []
        
    return movie

@router.get("/movies")
async def get_movies(
    page: int = Query(1, ge=1),
    search: Optional[str] = Query(None),
    filter: Optional[str] = Query(None),
    genre: Optional[str] = Query(None),
):
    """
    Récupère les films et les enrichit. Supporte recherche, filtres (Populaire, Tendance, Récent) et genres.
    """
    try:
        if search:
            response = await tmdb_client.search_movies(search, page=page)
        elif genre:
            # On récupère d'abord les IDs de genres pour mapper le nom
            tmdb_genres = await tmdb_client.get_genres()
            genre_id = next((g["id"] for g in tmdb_genres if g["name"].lower() == genre.lower()), None)
            if genre_id:
                response = await tmdb_client.get_movies_by_genre(genre_id, page=page)
            else:
                response = {"results": [], "total_pages": 0, "total_results": 0}
        elif filter == "Populaire":
            response = await tmdb_client.get_popular_movies(page=page)
        elif filter == "Tendance":
            response = await tmdb_client.get_trending_movies(page=page)
        elif filter == "Récent":
            response = await tmdb_client.get_upcoming_movies(page=page)
        else:
            response = await tmdb_client.get_popular_movies(page=page)
        
        results = response.get("results", [])
        total_pages = response.get("total_pages", 1)
        total_results = response.get("total_results", 0)

        # Les films sans affiche restent consultables : le frontend affiche un
        # état explicite à la place d'un visuel de substitution trompeur.
        valid_results = results
        
        # Enrichissement parallèle
        enriched_movies = await asyncio.gather(
            *[enrich_movie_metadata(m) for m in valid_results],
            return_exceptions=True
        )
        
        final_movies = [m for m in enriched_movies if isinstance(m, dict)]
        
        return {
            "data": final_movies,
            "pagination": {
                "page": page,
                "limit": len(results),
                "total": total_results,
                "total_pages": total_pages
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/movies/{movie_id}")
async def get_movie_detail(movie_id: int):
    try:
        details = await tmdb_client.get_movie_details(movie_id)
        details["release_year"] = int(details["release_date"][:4]) if details.get("release_date") else None
        details["genres"] = [g["name"] for g in details.get("genres", [])]
        return await enrich_movie_metadata(details, use_backdrops=True)
    except Exception as e:
        raise HTTPException(status_code=404, detail="Film non trouvé")
