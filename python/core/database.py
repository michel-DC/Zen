from sqlmodel import create_engine, Session, SQLModel
from core.config import settings

# L'engine SQLAlchemy pour la connexion
# On utilise connect_args={"check_same_thread": False} uniquement pour SQLite
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(settings.sync_database_url, connect_args=connect_args)

def get_session():
    """Générateur de session pour FastAPI (Dependency Injection)"""
    with Session(engine) as session:
        yield session

def init_db():
    """Initialise les tables (utile pour le développement local)"""
    from models.database import Movie, Genre, Backdrop, PaletteColor, MovieGenreLink
    try:
        SQLModel.metadata.create_all(engine)
        print("INFO: Database tables initialized (or already exist) in Supabase.")
    except Exception as e:
        print(f"ERROR: Could not initialize database: {e}")
