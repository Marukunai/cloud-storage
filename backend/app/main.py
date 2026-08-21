from fastapi import FastAPI

app = FastAPI(title="Self-Hosted Cloud Storage API")


@app.get("/health")
async def health_check():
    return {"status": "ok"}