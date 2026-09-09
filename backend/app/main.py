from fastapi import FastAPI
from app.api.routes import auth, files, folders, stream

app = FastAPI(title="Self-Hosted Cloud Storage API")

app.include_router(auth.router)
app.include_router(files.router)
app.include_router(folders.router)
app.include_router(stream.router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}
