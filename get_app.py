import uvicorn
from fastapi import FastAPI, Query
from fastapi.responses import JSONResponse

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Hello, FastAPI"}

@app.post("/blog/post-meeting")
def post_meeting():
    return {"message": "Post Meeting"}
    
uvicorn.run(app, host="0.0.0.0", port=8000)