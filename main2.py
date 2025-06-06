from fastapi import FastAPI, Query
from pydantic import BaseModel
import uvicorn
from fastapi.responses import JSONResponse
from fastapi.responses import HTMLResponse
from datetime import datetime
from wordpress import post_to_wordpress
from mcp_logic import fetch_meetings, get_summary, generate_blog_post

app = FastAPI()

class PostMeetingRequest(BaseModel):
    meeting_id: str
    include_transcript: bool = False
    schedule_time: str = None  # ISO format if scheduled

'''@app.post("/blog/post-meeting")
def post_meeting(request: PostMeetingRequest):
    meetings = fetch_meetings("2025-01-01T00:00:00Z", datetime.utcnow().isoformat() + "Z")
    meeting = next((m for m in meetings if m["id"] == request.meeting_id), None)

    if not meeting:
        return {"error": "Meeting ID not found."}

    summary = get_summary(request.meeting_id)

    blog_output = generate_blog_post(
        meeting_id=request.meeting_id,
        meeting_sentences=meeting["sentences"],
        summary_data=summary,
        include_transcript=request.include_transcript
    )

    blog_lines = blog_output["blog_post"].split("\n")
    title = blog_lines[0]
    content = "\n".join(blog_lines[2:])

    if request.schedule_time:
        response = post_to_wordpress(title, content, status="future", scheduled_time=request.schedule_time)
    else:
        response = post_to_wordpress(title, content, status="draft")

    if response.status_code in [201, 202]:
        return {"message": "Post successfully created.", "wordpress_response": response.json()}
    else:
        return {"error": "Failed to post to WordPress", "details": response.text}''' 

@app.get("/")
def read_root():
    return {"message": "Hello, FastAPI"}
    
uvicorn.run(app, host="0.0.0.0", port=8000)