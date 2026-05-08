from fastapi import APIRouter, HTTPException
from models.request import PaletteRequest
from models.response import PaletteResponse, ErrorResponse
from services.palette_service import process_palette_extraction

router = APIRouter()


@router.post(
    "/extract-palette",
    response_model=PaletteResponse,
    responses={
        422: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
)
async def extract_palette(payload: PaletteRequest) -> PaletteResponse:
    try:
        image_urls_str = [str(url) for url in payload.image_urls]
        return await process_palette_extraction(payload.movie_id, image_urls_str)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
