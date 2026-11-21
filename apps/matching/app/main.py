from fastapi import FastAPI

app = FastAPI(title="Lost & Found Matching", docs_url=None, redoc_url=None, openapi_url=None)


@app.get("/health/ready")
def ready():
    return {"status": "ok"}
