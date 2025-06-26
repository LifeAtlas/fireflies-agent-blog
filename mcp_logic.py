#from main3 import agent, fetch_meetings, get_summary, group_speaker_text
from main3 import agent, group_speaker_text

def generate_blog_post(meeting_id: str, meeting_sentences: list, summary_data: dict, include_transcript: bool = False) -> dict:
    transcript_text = group_speaker_text(meeting_sentences)

    agent_output = agent.invoke({
        "messages": [],
        "fireflies_summary": summary_data,
        "meeting_transcript": transcript_text,
        "agent_summary": {},
        "agent_summary_anonymized": {},
        "blog_post": ""
    })

    return {
        "summary": agent_output["agent_summary"][0]["overview"],
        "anonymized": agent_output["agent_summary_anonymized"][0]["anonymized_overview"],
        "blog_post": agent_output["blog_post"]
    }
