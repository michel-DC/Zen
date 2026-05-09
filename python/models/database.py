from datetime import datetime
from typing import List, Optional
from sqlmodel import Field, Relationship, SQLModel, JSON

# Tables de liaison pour les relations Many-to-Many
class MovieGenreLink(SQLModel, table=True):
    movie_id: int = Field(foreign_key="movie.id", primary_key=True)
    genre_id: int = Field(foreign_key="genre.id", primary_key=True)

class Movie(SQLModel, table=True):
    id: int = Field(primary_key=True)  # ID TMDB
    title: str = Field(index=True)
    overview: str
    release_year: Optional[int] = None
    runtime: Optional[int] = None
    language: str
    poster_path: str
    backdrop_path: Optional[str] = None
    tmdb_rating: float
    imdb_id: Optional[str] = None
    director: Optional[str] = None
    dominant_color: Optional[str] = None
    palette_extracted: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relations
    genres: List["Genre"] = Relationship(back_populates="movies", link_model=MovieGenreLink)
    backdrops: List["Backdrop"] = Relationship(back_populates="movie")
    palette: List["PaletteColor"] = Relationship(back_populates="movie")

class Genre(SQLModel, table=True):
    id: int = Field(primary_key=True)  # ID TMDB
    name: str = Field(unique=True)
    
    movies: List[Movie] = Relationship(back_populates="genres", link_model=MovieGenreLink)

class Backdrop(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    movie_id: int = Field(foreign_key="movie.id")
    path: str
    
    movie: Movie = Relationship(back_populates="backdrops")

class PaletteColor(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    movie_id: int = Field(foreign_key="movie.id")
    hex: str
    hue: int
    saturation: int
    lightness: int
    percentage: float
    position: int  # 0 pour dominante, 1, 2...
    
    movie: Movie = Relationship(back_populates="palette")
