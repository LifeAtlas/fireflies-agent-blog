from fastapi import FastAPI, Query, HTTPException
from pydantic import BaseModel
import uvicorn
import os
from fastapi.responses import JSONResponse
from fastapi.responses import HTMLResponse
from datetime import datetime, timezone
from wordpress import post_to_wordpress
from mcp_logic import generate_blog_post
from meeting_extractor import FirefliesMeetingExtractor
from fastapi import Request, HTTPException
from pydantic import BaseModel
from fastapi import Request
app = FastAPI()
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # or ["*"] to allow all origins (less secure)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# class PostMeetingRequest(BaseModel):
#     meeting_id: str
#     include_transcript: bool = False
#     schedule_time: str = None  # ISO format if scheduled

# '''@app.post("/blog/post-meeting")
# def post_meeting(request: PostMeetingRequest):
#     meetings = fetch_meetings("2025-01-01T00:00:00Z", datetime.utcnow().isoformat() + "Z")
#     meeting = next((m for m in meetings if m["id"] == request.meeting_id), None)

#     if not meeting:
#         return {"error": "Meeting ID not found."}

#     summary = get_summary(request.meeting_id)

#     blog_output = generate_blog_post(
#         meeting_id=request.meeting_id,
#         meeting_sentences=meeting["sentences"],
#         summary_data=summary,
#         include_transcript=request.include_transcript
#     )

#     blog_lines = blog_output["blog_post"].split("\n")
#     title = blog_lines[0]
#     content = "\n".join(blog_lines[2:])

#     if request.schedule_time:
#         response = post_to_wordpress(title, content, status="future", scheduled_time=request.schedule_time)
#     else:
#         response = post_to_wordpress(title, content, status="draft")

#     if response.status_code in [201, 202]:
#         return {"message": "Post successfully created.", "wordpress_response": response.json()}
#     else:
#         return {"error": "Failed to post to WordPress", "details": response.text}''' 

# @app.get("/")
# def read_root():
#     return {"message": "Hello, FastAPI"}
    
# uvicorn.run(app, host="0.0.0.0", port=8000)

# Initialize the meeting extractor with environment variables
extractor = FirefliesMeetingExtractor(
    api_key=os.getenv("FIREFLIES_API_KEY"),
    base_url="https://api.fireflies.ai/graphql"
)

class PostMeetingRequest(BaseModel):
    meeting_id: str
    include_transcript: bool = False
    schedule_time: str = None  # Optional ISO format for scheduling

@app.get("/")
def read_root():
    return {"message": "Meeting summarizer and blog post API is running."}

# @app.post("/blog/post-meeting")
# def post_meeting(request: PostMeetingRequest):
#     try:
#         from_timestamp = "2025-01-01T00:00:00Z"  # Optionally make this dynamic
#         to_timestamp = datetime.utcnow().isoformat() + "Z"

#         meetings = extractor.fetch_meetings(from_timestamp, to_timestamp)
#         meeting = next((m for m in meetings if m["id"] == request.meeting_id), None)

#         if not meeting:
#             raise HTTPException(status_code=404, detail="Meeting ID not found.")

#         summary = extractor.get_summary(request.meeting_id)

#         blog_output = generate_blog_post(
#             meeting_id=request.meeting_id,
#             meeting_sentences=meeting["sentences"],
#             summary_data=summary,
#             include_transcript=request.include_transcript
#         )

#         title = blog_output.get("title")
#         content = blog_output.get("content")

#         if not title or not content:
#             raise HTTPException(status_code=500, detail="Blog generation failed.")

#         if request.schedule_time:
#             response = post_to_wordpress(title, content, status="future", scheduled_time=request.schedule_time)
#         else:
#             response = post_to_wordpress(title, content, status="draft")

#         if response.status_code in [201, 202]:
#             return {"message": "Post successfully created.", "wordpress_response": response.json()}
#         else:
#             raise HTTPException(status_code=500, detail={"error": "Failed to post to WordPress", "details": response.text})

#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# This part is important for the integration of the postgresql database later on
# from contextlib import asynccontextmanager
# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     await database.connect()
#     print("📡 Connected to the database.")
#     yield
#     await database.disconnect()
#     print("🔌 Disconnected from the database.")

# app = FastAPI(lifespan=lifespan)

# @app.post("/add_blog_post/")
# async def add_blog_post(meeting_id: str, title: str, content: str, status: str = "draft"):
#     query = blog_posts.insert().values(
#         meeting_id=meeting_id,
#         title=title,
#         content=content,
#         status=status,
#         scheduled_time=None  # Optional
#     )
#     last_record_id = await database.execute(query)
#     return {"id": last_record_id, "message": "Blog post added!"}



@app.post("/api/meetings")
async def get_meetings(request: Request):
    body = await request.json()
    from_timestamp = body.get("fromDate", "2025-01-01T00:00:00Z")
    to_timestamp = body.get("toDate", datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'))
    api_key = body.get("apiKey")  # Optional: validate or use this if needed

    meetings = extractor.fetch_meetings(from_timestamp, to_timestamp)
    return {"meetings": meetings}



class ProcessMeetingRequest(BaseModel):
    apiKey: str
    meetingId: str
    meetingData: dict
@app.get("/process-meeting")
def read_root():
    return {"message": "Meeting summarizer and blog post API is running."}

@app.post("/process-meeting")
async def process_meeting(request: ProcessMeetingRequest):
    try:
        summary = extractor.get_summary(request.meetingId)
        blog_output = generate_blog_post(
            meeting_id=request.meetingId,
            meeting_sentences=request.meetingData.get("sentences", []),
            summary_data=summary,
            include_transcript=True
        )
        title = blog_output.get("title")
        content = blog_output.get("content")

        if not title or not content:
            raise HTTPException(status_code=500, detail="Blog generation failed.")

        return {"message": "Processing complete", "summary": summary, "blog_output": blog_output}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)