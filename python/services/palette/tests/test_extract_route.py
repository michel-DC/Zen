from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
from main import app
from models.response import PaletteResponse, ColorEntry

client = TestClient(app)


def test_extract_palette_success() -> None:
    mock_response = PaletteResponse(
        movie_id=550,
        palette=[
            ColorEntry(hex="#1A1A2E", hsl=[240, 33, 14], percentage=20.0),
            ColorEntry(hex="#E94560", hsl=[349, 80, 58], percentage=18.0),
            ColorEntry(hex="#F5A623", hsl=[38, 91, 55], percentage=17.0),
            ColorEntry(hex="#0F3460", hsl=[213, 75, 22], percentage=16.0),
            ColorEntry(hex="#EDEDED", hsl=[0, 0, 93], percentage=15.0),
            ColorEntry(hex="#222222", hsl=[0, 0, 13], percentage=14.0),
        ],
        dominant_color="#1A1A2E"
    )

    with patch(
        "routers.palette.process_palette_extraction", 
        new=AsyncMock(return_value=mock_response)
    ):
        response = client.post(
            "/extract-palette", 
            json={
                "movie_id": 550, 
                "image_urls": ["https://image.tmdb.org/t/p/original/test.jpg"]
            }
        )

    assert response.status_code == 200
    data = response.json()
    assert data["movie_id"] == 550
    assert len(data["palette"]) == 6
    assert data["dominant_color"] == "#1A1A2E"
