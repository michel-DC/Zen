from typing import List, Optional
from sqlmodel import Session, select
from models.database import Movie, Genre, Backdrop, PaletteColor, MovieGenreLink

class MovieService:
    def __init__(self, session: Session):
        self.session = session

    def get_movie(self, movie_id: int) -> Optional[Movie]:
        return self.session.get(Movie, movie_id)

    def upsert_movie(self, movie_data: dict, genre_ids: List[int]) -> Movie:
        movie = self.get_movie(movie_data["id"])
        if not movie:
            movie = Movie(**movie_data)
            self.session.add(movie)
        else:
            for key, value in movie_data.items():
                setattr(movie, key, value)
        
        # Gérer les genres
        if genre_ids:
            genres = [self.session.get(Genre, gid) for gid in genre_ids if self.session.get(Genre, gid)]
            movie.genres = genres
            
        self.session.commit()
        self.session.refresh(movie)
        return movie

    def create_genre(self, genre_id: int, name: str) -> Genre:
        genre = self.session.get(Genre, genre_id)
        if not genre:
            genre = Genre(id=genre_id, name=name)
            self.session.add(genre)
            self.session.commit()
            self.session.refresh(genre)
        return genre

    def save_palette(self, movie_id: int, palette_data: List[dict], dominant_color: str):
        movie = self.get_movie(movie_id)
        if not movie: return
        
        # Supprimer l'ancienne palette
        statement = select(PaletteColor).where(PaletteColor.movie_id == movie_id)
        existing_colors = self.session.exec(statement).all()
        for c in existing_colors:
            self.session.delete(c)
            
        # Ajouter la nouvelle
        for item in palette_data:
            color = PaletteColor(
                movie_id=movie_id,
                hex=item["hex"],
                hue=item["hsl"][0],
                saturation=item["hsl"][1],
                lightness=item["hsl"][2],
                percentage=item["percentage"],
                position=item["position"]
            )
            self.session.add(color)
            
        movie.dominant_color = dominant_color
        movie.palette_extracted = True
        self.session.commit()

    def save_backdrops(self, movie_id: int, backdrop_paths: List[str]):
        # Supprimer anciens
        statement = select(Backdrop).where(Backdrop.movie_id == movie_id)
        existing = self.session.exec(statement).all()
        for b in existing:
            self.session.delete(b)
            
        for path in backdrop_paths:
            bd = Backdrop(movie_id=movie_id, path=path)
            self.session.add(bd)
        self.session.commit()
