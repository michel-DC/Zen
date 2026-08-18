from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from core.logging import setup_logging
from routers import catalog, movies, palette

setup_logging()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend Proxy Zen : Pont direct TMDB avec extraction de palettes à la volée",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    print(f"--- Configuration Checking ---")
    print(f"PROJECT: {settings.PROJECT_NAME}")
    print(f"TMDB_KEY: {'SET' if settings.TMDB_API_KEY else 'MISSING'}")
    print(f"MODE: DIRECT BRIDGE (NO DB)")
    print(f"R2_BUCKET: {settings.CLOUDFLARE_R2_BUCKET_NAME or 'MISSING'}")
    print(f"RECOMMENDATION_AI_PROVIDER: {settings.RECOMMENDATION_AI_PROVIDER}")
    if settings.RECOMMENDATION_AI_PROVIDER.casefold() == "cloudflare":
        cloudflare_ai_ready = bool(
            settings.CLOUDFLARE_AI_ACCOUNT_ID
            and settings.CLOUDFLARE_AI_API_TOKEN
        )
        print(f"CLOUDFLARE_AI: {'SET' if cloudflare_ai_ready else 'MISSING'}")
    print(f"------------------------------")


app.include_router(catalog.router, prefix="/api/v1")
app.include_router(palette.router, prefix="/api/v1")
app.include_router(movies.router, prefix="/api/v1")


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
