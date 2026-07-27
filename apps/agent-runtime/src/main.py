"""FastAPI entrypoint for ForgeOne Agent Runtime."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.api.routes import router as api_router

app = FastAPI(title="ForgeOne Agent Runtime", version="0.1.0", docs_url="/docs")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000", "http://localhost:4000"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(api_router)

@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "forgeone-agent-runtime", "version": "0.1.0"}
