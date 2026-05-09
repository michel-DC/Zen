from typing import Optional
from io import BytesIO
from PIL import Image
from colorthief import ColorThief
from core.config import settings

def extract_colors_from_image(image: Image.Image, color_count: Optional[int] = None) -> list[tuple[int, int, int]]:
    count = color_count or settings.COLORS_PER_IMAGE
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    buffer.seek(0)
    thief = ColorThief(buffer)
    return thief.get_palette(color_count=count, quality=2)
