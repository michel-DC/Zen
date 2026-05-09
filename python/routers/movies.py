from fastapi import APIRouter, Depends, Query, BackgroundTasks, HTTPException
from sqlmodel import Session, select, func
from core.database import get_session
from models.database import Movie, PaletteColor
from services.sync_service import SyncService
from clients.tmdb import tmdb_client
from typing import List, Optional

router = APIRouter(tags=["movies"])

@router.post("/movies/sync")
async def sync_movies(
    background_tasks: BackgroundTasks,
    pages: int = Query(1, ge=1, le=10),
    session: Session = Depends(get_session)
):
    sync_service = SyncService(session)
    background_tasks.add_task(sync_service.sync_popular_movies, pages=pages)
    return {"message": f"Synchronisation de {pages} page(s) lancée en arrière-plan."}

@router.get("/movies")
def get_movies(
    page: int = Query(1, ge=1),
    limit: int = Query(32, ge=1, le=100),
    search: Optional[str] = None,
    session: Session = Depends(get_session)
):
    offset = (page - 1) * limit
    query = select(Movie)
    
    if search:
        query = query.where(Movie.title.contains(search))
    
    total = session.exec(select(func.count()).select_from(query.subquery())).one()
    movies = session.exec(query.offset(offset).limit(limit)).all()
    
    result = []
    for movie in movies:
        movie_dict = movie.model_dump()
        palette = sorted(movie.palette, key=lambda x: x.position)
        movie_dict["palette"] = [p.hex for p in palette]
        result.append(movie_dict)
        
    return {
        "data": result,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": (total + limit - 1) // limit
        }
    }

@router.get("/movies/search")
async def search_tmdb(
    query: str,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session)
):
    sync_service = SyncService(session)
    results = await tmdb_client.search_movies(query)
    for m in results:
        background_tasks.add_task(sync_service.sync_single_movie, m["id"])
    return results

@router.get("/movies/{movie_id}")
def get_movie_detail(movie_id: int, session: Session = Depends(get_session)):
    movie = session.get(Movie, movie_id)
    if not movie:
        raise HTTPException(status_code=404, detail="Film non trouvé")
        
    movie_dict = movie.model_dump()
    movie_dict["palette"] = [
        {"hex": p.hex, "name": "Couleur", "percentage": p.percentage} 
        for p in sorted(movie.palette, key=lambda x: x.position)
    ]
    movie_dict["genres"] = [g.name for g in movie.genres]
    
    return movie_dict
