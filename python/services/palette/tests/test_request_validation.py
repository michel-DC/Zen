from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_invalid_urls_count() -> None:
    response = client.post("/extract-palette", json={"movie_id": 550, "image_urls": []})
    assert response.status_code == 422

    urls = ["https://example.com/img.jpg"] * 6
    response = client.post("/extract-palette", json={"movie_id": 550, "image_urls": urls})
    assert response.status_code == 422


def test_invalid_url_format() -> None:
    response = client.post("/extract-palette", json={"movie_id": 550, "image_urls": ["not-a-url"]})
    assert response.status_code == 422
