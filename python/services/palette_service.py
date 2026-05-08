from services.downloader import download_images
from services.extractor import extract_colors_from_image
from services.merger import merge_palettes
from services.formatter import format_palette_response
from models.response import PaletteResponse


async def process_palette_extraction(
    movie_id: int, 
    image_urls: list[str]
) -> PaletteResponse:
    images = await download_images(image_urls)
    
    if not images:
        raise ValueError("No images could be downloaded")

    all_colors = [extract_colors_from_image(img) for img in images]
    merged = merge_palettes(all_colors)
    top6 = merged[:6]

    return format_palette_response(movie_id, top6)