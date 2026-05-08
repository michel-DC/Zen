from io import BytesIO
from PIL import Image
from colorthief import ColorThief
from core.config import settings


def extract_colors_from_image(image: Image.Image) -> list[tuple[int, int, int]]:
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    buffer.seek(0)

    thief = ColorThief(buffer)
    palette = thief.get_palette(color_count=settings.COLORS_PER_IMAGE, quality=2)
    return palette # type: ignore
