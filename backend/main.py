from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import models
from routers import auth, staff, cbt
import seed

# Create DB schema and seed initial data
Base.metadata.create_all(bind=engine)
seed.run_seed()

app = FastAPI(
    title="Artix EZexam Engine",
    description="Open-Source Self-Hosted Examination and CBT Assessment Platform",
    version="1.0.0"
)

# Enable CORS for Next.js dev server on port 3000
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(auth.router)
app.include_router(staff.router)
app.include_router(cbt.router)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "artix-ezexam-backend",
        "database": "sqlite"
    }
