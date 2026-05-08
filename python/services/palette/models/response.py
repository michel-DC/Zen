from pydantic import BaseModel


class ColorEntry(BaseModel):
    hex: str
    hsl: list[int]
    percentage: float


class PaletteResponse(BaseModel):
    movie_id: int
    palette: list[ColorEntry]
    dominant_color: str


class ErrorResponse(BaseModel):
    error: str
    detail: str
