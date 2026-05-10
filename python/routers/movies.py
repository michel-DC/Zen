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
    movie_id = movie["id"]
    tasks = []
    
    # Tâche A : Récupérer le réalisateur
    tasks.append(tmdb_client.get_movie_credits(movie_id))
    
    # Tâche B : Préparer l'extraction de palette
    if use_backdrops:
        tasks.append(tmdb_client.get_movie_images(movie_id))
    else:
        poster_path = movie.get("poster_path")
        image_urls = [f"{settings.TMDB_IMAGE_BASE_URL}/w500{poster_path}"] if poster_path else []
        tasks.append(asyncio.sleep(0, result=image_urls))

    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Traitement réalisateur
    credits = results[0] if not isinstance(results[0], Exception) else {}
    movie["director"] = next((c["name"] for c in credits.get("crew", []) if c["job"] == "Director"), "Inconnu")
    
    # Traitement palette
    image_urls = results[1] if isinstance(results[1], list) else []
    movie["palette"] = []
    movie["dominant_color"] = None

    if image_urls:
        try:
            palette_result = await process_palette_extraction(movie_id, image_urls)
            if palette_result:
                if use_backdrops:
                    movie["palette"] = [
                        {"hex": p["hex"], "name": getColorName(p["hex"]), "percentage": p["percentage"]}
                        for p in palette_result["palette"]
                    ]
                else:
                    movie["palette"] = [p["hex"] for p in palette_result["palette"]]
                movie["dominant_color"] = palette_result["dominant_color"]
        except Exception:
            pass
        
    return movie

@router.get("/movies")
async def get_movies(
    page: int = Query(1, ge=1),
    search: Optional[str] = Query(None),
):
    """
    Endpoint unique : récupère les films populaires OU recherche par titre, 
    puis enrichit les résultats.
    """
    if search:
        results = await tmdb_client.search_movies(search, page=page)
    else:
        results = await tmdb_client.get_popular_movies(page=page)
    
    valid_results = [m for m in results if m.get("poster_path")]
    
    enriched_movies = await asyncio.gather(
        *[enrich_movie_metadata(m) for m in valid_results]
    )
    
    return {
        "data": enriched_movies,
        "pagination": {
            "page": page,
            "limit": len(enriched_movies),
            "total": 10000,
            "total_pages": 500
        }
    }

@router.get("/movies/{movie_id}")
async def get_movie_detail(movie_id: int):
    try:
        details = await tmdb_client.get_movie_details(movie_id)
        details["release_year"] = int(details["release_date"][:4]) if details.get("release_date") else None
        details["genres"] = [g["name"] for g in details.get("genres", [])]
        return await enrich_movie_metadata(details, use_backdrops=True)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Film non trouvé")
