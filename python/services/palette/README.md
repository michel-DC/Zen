# PaletteFilm — Palette Extractor

Microservice FastAPI d'extraction de couleurs dominantes depuis des images de films.

## Installation Locale

```bash
cd python/services/palette
python -m venv venv
./venv/Scripts/activate
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

## Lancement

```bash
uvicorn main:app --reload --port 8000
```

## Tests et Qualité

```bash
# Tests
pytest

# Lint
ruff check .

# Type check
mypy .
```

## Docker

```bash
docker build -t palette-extractor .
docker run -p 8000:8000 palette-extractor
```
