import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import db_manager
from app.services.rag_service import initialize_rag

from app.api.health import router as health_router
from app.api.foods import router as foods_router
from app.api.nutrition import router as nutrition_router
from app.api.meals import router as meals_router
from app.api.chat import router as chat_router
from app.api.experiments import router as experiments_router
from app.api.meal_intelligence import router as meal_intelligence_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("nutriai.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up NutriAI backend...")
    db_manager.connect()
    try:
        initialize_rag()
    except Exception as e:
        logger.warning("RAG initialization deferred or failed: %s", e)
    yield
    # Shutdown
    logger.info("Shutting down NutriAI backend...")
    db_manager.close()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Full-stack AI-Powered Indian Food Nutrition Checker with RAG, LoRA, and QLoRA.",
    lifespan=lifespan
)

# CORS Middleware
origins = settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else [settings.CORS_ORIGINS]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers under /api
app.include_router(health_router, prefix=settings.API_V1_PREFIX)
app.include_router(foods_router, prefix=settings.API_V1_PREFIX)
app.include_router(nutrition_router, prefix=settings.API_V1_PREFIX)
app.include_router(meals_router, prefix=settings.API_V1_PREFIX)
app.include_router(chat_router, prefix=settings.API_V1_PREFIX)
app.include_router(experiments_router, prefix=settings.API_V1_PREFIX)
app.include_router(meal_intelligence_router, prefix=settings.API_V1_PREFIX)

@app.get("/")
def root():
    return {
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs_url": "/docs",
        "health_url": f"{settings.API_V1_PREFIX}/health"
    }
