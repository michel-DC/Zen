from pydantic import BaseModel, HttpUrl, field_validator


class PaletteRequest(BaseModel):
    movie_id: int
    image_urls: list[HttpUrl]

    @field_validator("image_urls")
    @classmethod
    def validate_image_urls(cls, v: list[HttpUrl]) -> list[HttpUrl]:
        if len(v) == 0:
            raise ValueError("image_urls must contain at least one URL")
        if len(v) > 5:
            raise ValueError("image_urls must not exceed 5 URLs")
        return v
