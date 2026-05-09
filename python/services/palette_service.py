from core.config import settings
from services.downloader import download_images
from services.extractor import extract_colors_from_image
from services.merger import merge_palettes
from services.formatter import format_palette_response

async def process_palette_extraction(movie_id: int, image_urls: list[str]):
    # 1. Téléchargement
    images = await download_images(image_urls[:settings.MAX_IMAGES])
    if not images:
        return None
    
    # 2. Extraction par image
    all_colors = [extract_colors_from_image(img) for img in images]
    
    # 3. Fusion
    merged = merge_palettes(all_colors)
    
    # 4. Top 5 et Formatage
    return format_palette_response(movie_id, merged[:5])
