import asyncio
import httpx
from io import BytesIO
from PIL import Image
from core.config import settings


async def download_image(client: httpx.AsyncClient, url: str) -> Image.Image | None:
    try:
        response = await client.get(url, timeout=settings.DOWNLOAD_TIMEOUT)
        response.raise_for_status()
        return Image.open(BytesIO(response.content)).convert("RGB")
    except Exception:
        return None


async def download_images(urls: list[str]) -> list[Image.Image]:
    async with httpx.AsyncClient() as client:
        tasks = [download_image(client, url) for url in urls]
        results = await asyncio.gather(*tasks)
    return [img for img in results if img is not None]