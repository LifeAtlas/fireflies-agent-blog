from typing import Annotated, Dict, Any
from typing_extensions import TypedDict

from langchain_core.messages import HumanMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

from langgraph.graph import StateGraph
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode

from langchain_core.messages import AIMessage
from langchain_core.messages.tool import ToolCall

# from langchain_openai import AzureChatOpenAI
from langchain.chat_models import init_chat_model

from datetime import datetime

import os
import sys
import json

import base64
import requests

from dotenv import load_dotenv
load_dotenv()

WP_USERNAME = os.getenv('WORDPRESS_USERNAME')
WP_PASSWORD = os.getenv('WORDPRESS_APPLICATION_PASSWORD')
WP_URL = "https://winniio.io/wp-json/wp/v2/posts"

WP_CREDENTIALS = WP_USERNAME + ":" + WP_PASSWORD
WP_TOKEN = base64.b64encode(WP_CREDENTIALS.encode())
WP_HEADER = {'Authorization': 'Basic ' + WP_TOKEN.decode('utf-8')}

API_KEY = os.getenv('FIREFLIES_API_KEY')
BASE_URL = "https://api.fireflies.ai/graphql"


from meeting_extractor import FirefliesMeetingExtractor

# Initialize the extractor
extractor = FirefliesMeetingExtractor(api_key=API_KEY, base_url=BASE_URL)

# Get and convert input date range
from_str = "20-06-2025 06:00"
to_str = "20-06-2025 12:00"
from_ts, to_ts = FirefliesMeetingExtractor.parse_date_range(from_str, to_str)

# Fetch and process meeting data
meeting_data = extractor.extract_meeting_data(from_ts, to_ts, meeting_number=1)

if not meeting_data:
    print("⚠️ No meeting data returned. Exiting.")
    sys.exit(1)

# Now safe to access
print(meeting_data["meeting_title"])
print(meeting_data["summary"])



def ask_user_for_post_action():
    print("\nWhat would you like to do with the blog post?")
    print("1. Yes (Post it now)")
    print("2. No (Do not post)")
    print("3. Later (Schedule the post)")
    print("4. Archive (Save it to archive)")

    choice_map = {
        "1": "yes",
        "2": "no",
        "3": "later",
        "4": "archive"
    }

    while True:
        user_input = input("Enter your choice (1-4): ").strip()
        if user_input in choice_map:
            return choice_map[user_input]
        else:
            print("Invalid choice. Please enter a number between 1 and 4.")

def group_speaker_text(data):
    """
    Groups and formats a list of dialogue entries by speaker.

    This function takes a list of dictionaries, where each dictionary contains the text 
    of a speaker's message and the speaker's name. It organizes the messages by speaker,
    grouping all of a speaker's messages together and formatting them into a string, 
    with each speaker's dialogue displayed on a new line.

    The function assumes that the input data is ordered in the correct sequence, 
    with each speaker's dialogue appearing in the order they spoke.

    Args:
        data (list of dict): A list of dictionaries, each containing:
            - 'raw_text' (str): The text of the message.
            - 'speaker_name' (str): The name of the speaker.
            - 'speaker_id' (int): An identifier for the speaker (not used in the function).

    Returns:
        str: A string where each speaker's dialogue is printed in order,
             with their name followed by the messages they spoke, separated by spaces.
             Each speaker's dialogue is on a new line.
    """

    result = []
    
    current_speaker = None
    current_text = []

    for entry in data:
        speaker_name = entry['speaker_name']
        raw_text = entry['raw_text']
        
        if speaker_name != current_speaker:
            if current_speaker is not None:
                result.append(f"{current_speaker}: {' '.join(current_text)}")
            current_speaker = speaker_name
            current_text = [raw_text]
        else:
            current_text.append(raw_text)

    if current_speaker is not None:
        result.append(f"{current_speaker}: {' '.join(current_text)}")

    return "\n".join(result)

# # Initialize LLM
llm = init_chat_model("llama3-70b-8192", model_provider="groq")
# # llm = AzureChatOpenAI(model_name="gpt-35-turbo-16k")


class State(TypedDict):
    messages: Annotated[list, add_messages]
    fireflies_summary: Dict[str, any]
    meeting_transcript: str
    agent_summary: any
    agent_summary_anonymized: any
    blog_post: str

def summarizer(state):
    """
    Function to create the summarizer node.
    """

    if state.get("include_transcript", False):
        summarizer_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert meeting summarizer with advanced analytical skills.
             Your task is to produce a comprehensive and nuanced overview by evaluating both the provided meeting summary and the full meeting transcript.
             Your objectives are as follows: 
             1.**Identify Key Discussion Points:** Extract and highlight the most important topics discussed during the meeting, ensuring that no significant detail is overlooked.
             2.**Main Objectives and Outcomes:** Clearly define the primary goals of the meeting and summarize the outcomes achieved, including decisions made and action items assigned.
             3.**Strategic Insights:** Provide a thoughtful analysis of the strategic direction indicated by the discussions.Consider implications for future actions or decisions based on the meeting's content.
             4.**Synthesize Information:** Merge insights from both the existing meeting summary and the full transcript, ensuring a coherent and comprehensive overview.
             5.**Clarity and Conciseness:** Write a clear, informative overview that succinctly captures the essence of the meeting without unnecessary jargon or filler.
             Aim for a structure that allows easy understanding for stakeholders.Incorporate relevant context, terminology, and any critical nuances that may enhance the understanding of the meeting's impact and significance."""),
            ("human", """Create a detailed overview based on the following information:

            Existing Summary: {fireflies_summary}
            Full meeting transcript: {meeting_transcript}

            Please provide a comprehensive and insightful overview of the meeting that goes beyond surface-level details.""")
        ])
    else:
        summarizer_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert meeting summarizer with advanced analytical skills.
             Your task is to produce a comprehensive and nuanced overview by evaluating both the provided meeting summary and the full meeting transcript.
             Your objectives are as follows: 
             1.**Identify Key Discussion Points:** Extract and highlight the most important topics discussed during the meeting, ensuring that no significant detail is overlooked.
             2.**Main Objectives and Outcomes:** Clearly define the primary goals of the meeting and summarize the outcomes achieved, including decisions made and action items assigned.
             3.**Strategic Insights:** Provide a thoughtful analysis of the strategic direction indicated by the discussions.Consider implications for future actions or decisions based on the meeting's content.
             4.**Synthesize Information:** Merge insights from both the existing meeting summary and the full transcript, ensuring a coherent and comprehensive overview.
             5.**Clarity and Conciseness:** Write a clear, informative overview that succinctly captures the essence of the meeting without unnecessary jargon or filler.
             Aim for a structure that allows easy understanding for stakeholders.Incorporate relevant context, terminology, and any critical nuances that may enhance the understanding of the meeting's impact and significance."""),
            ("human", """Create a detailed overview based on the following information:

            Existing Summary: {fireflies_summary}

            Please provide a comprehensive and insightful overview of the meeting that goes beyond surface-level details.""")
        ])

    agent_flow = summarizer_prompt | llm | StrOutputParser()

    try:
        if state.get("include_transcript", False):
            result = agent_flow.invoke({
                "fireflies_summary": json.dumps(state["fireflies_summary"]),
                "meeting_transcript": state["meeting_transcript"]
            })
        else:
            result = agent_flow.invoke({
                "fireflies_summary": json.dumps(state["fireflies_summary"])
            })
        
        # Parse the result into a structured format
        summary_data = {
            "overview": result.strip()
        }
        
        return {
            "agent_summary": [
                # HumanMessage(content=json.dumps(summary_data, indent=2))
                summary_data
            ]
        }
    
    except Exception as e:
        print(f"Error in summarizer: {e}")
        return {"agent_summary": f"Failed to generate summary: {str(e)}"}
    

def anonymizer(state):
    """
    Function to create the anonymizer node.
    """
    
    anonymizer_prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an advanced data privacy and internal controls assistant with specialized expertise in anonymizing sensitive information within meeting summaries.
         Your primary objective is to transform the provided text while adhering to strict data protection standards.Your task is to: 
         1.**Anonymization of Personal Identifiers:** - Systematically identify and eliminate all personal names mentioned in the text.- Replace specific names with generic role titles (e.g., "Project Manager," "Team Member," "Client Representative") to maintain context without revealing identities.
         2.**Removal of Confidential Financial Data:** - Scrutinize the content for any confidential information, particularly related to payments, budgets, financial figures, or economic forecasts.- Exclude or generalize any specific monetary values or financial terms that could compromise confidentiality.
         3.**Protection of Sensitive Business Information:** - Detect and remove any sensitive business information that is proprietary or not intended for broad dissemination.- Ensure that strategic initiatives, trade secrets, or operational details are either anonymized or omitted as necessary.
         4.**Preservation of Context and Meaning:** - Maintain the overall meaning and context of the summary to ensure the utility of the information is preserved.- Focus on retaining the essence of discussions, decisions, and action items without revealing sensitive details.
         5.**Compliance with Data Protection Standards:** - Adhere to data privacy regulations such as GDPR and follow general internal control standards including ISO 27001, SOC 2, and HIPAA where applicable.
         - Ensure that the final output upholds the highest standards of data integrity and security.Your output must be a polished, anonymized version of the original text that effectively safeguards privacy while ensuring the information remains actionable and informative.
         Please provide this output in a clear and concise format."""),
        ("human", """Please anonymize the following meeting summary by removing names and confidential information:
        
        {agent_summary}
        
        Return only the anonymized text without explanations.""")
    ])
    
    anonymize_flow = anonymizer_prompt | llm | StrOutputParser()
    
    try:
        anonymized_result = anonymize_flow.invoke({
            "agent_summary": state["agent_summary"][0]['overview']
        })
        
        response_data = {
            "anonymized_overview": anonymized_result.strip()
        }
        
        return {
            "agent_summary_anonymized": [
                # HumanMessage(content=json.dumps(response_data, indent=2))
                response_data
            ]
        }
    
    except Exception as e:
        print(f"Error in anonymizer: {e}")
        return {"agent_summary_anonymized": f"Failed to anonymize the summary: {str(e)}"}
    

def writer(state):
    """
    Function to create the writer node for blog posts.
    """

    blog_post_prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an advanced content creation AI with expertise in transforming meeting summaries into engaging blog posts.
         You will receive an anonymized summary of a meeting, and your task is to craft a compelling narrative that adheres to the following guidelines: 
         1.**Objective**: Convert the key points from the meeting summary into a cohesive blog post that informs and captivates a general audience or specific stakeholders, ensuring no confidential details are disclosed.
         2.**Narrative Structure**: Organize the content logically, progressing from introduction to conclusion, while incorporating smooth transitions between sections to enhance readability.
         3.**Tone and Style**: Maintain a professional yet approachable tone throughout the post.Aim for clarity and engagement, utilizing relatable language and examples where appropriate.
         4.**Content Quality**: Ensure the blog post is informative, insightful, and valuable to readers.Highlight essential takeaways that resonate with the audience’s interests or needs.
         5.**Length and Format**: Produce a blog post of approximately [insert desired word count]words, utilizing headings, bullet points, or numbered lists as necessary to improve organization and readability.
         6.**No Placeholders**: Write in a manner that feels complete and natural, avoiding any placeholders or generic terms.Focus on creating a narrative that seamlessly integrates the information provided in the meeting summary.
         7.**Originality**: Ensure the content is original and does not directly copy phrases or sentences from the meeting summary.Your writing should reflect a unique interpretation of the information.Use the anonymized meeting summary provided to generate a high-quality blog post that meets these specifications."""),
        ("human", """Please write a blog post based on the following anonymized meeting overview:

        {anonymized_summary}

        Generate only the blog post content itself.""")
    ])

    blog_post_flow = blog_post_prompt | llm | StrOutputParser()
    
    try:
        anonymized_overview = state["agent_summary_anonymized"][0]['anonymized_overview']

        blog_post_result = blog_post_flow.invoke({
            "anonymized_summary": anonymized_overview
        })

        return {"blog_post": blog_post_result.strip()}

    except Exception as e:
        print(f"Error in writer: {e}")
        return {"blog_post": f"Failed to create blog post: {str(e)}"}

def build_summarizer_graph():
    """
    Function to create flow graph for the AI Agent.
    """
    graph_builder = StateGraph(State)

    # Add Nodes
    graph_builder.add_node("create_summary", summarizer)
    graph_builder.add_node("anonymize_output", anonymizer)
    graph_builder.add_node("create_blog_post", writer)

    # Define Flow
    graph_builder.add_edge("create_summary", "anonymize_output")
    graph_builder.add_edge("anonymize_output", "create_blog_post")

    # Set entry point
    graph_builder.set_entry_point("create_summary")

    return graph_builder.compile()


agent = build_summarizer_graph()

# With Conversation
agent_response = agent.invoke({
    "messages": [],
    "fireflies_summary": meeting_data["summary"],
    "meeting_transcript": meeting_data["transcript"],
    "agent_summary": {},
    "agent_summary_anonymized": {},
    "blog_post": ""
})

agent_summary_raw = agent_response.get('agent_summary')
print("agent_response:", agent_response)
print("agent_summary type:", type(agent_response.get('agent_summary'))) 

# agent_summary = agent_response['agent_summary'][0]['overview']
# anonymized_summary = agent_response['agent_summary_anonymized'][0]['anonymized_overview']
# blog_post = agent_response['blog_post']

agent_summary_raw = agent_response.get('agent_summary')
if isinstance(agent_summary_raw, str):
    print("❌ Summarizer failed:", agent_summary_raw)
    agent_summary = "No summary generated due to error."
else:
    agent_summary = agent_summary_raw[0]['overview']

anonymized_raw = agent_response.get('agent_summary_anonymized')
if isinstance(anonymized_raw, str):
    print("❌ Anonymizer failed:", anonymized_raw)
    anonymized_summary = "No anonymized summary generated."
else:
    anonymized_summary = anonymized_raw[0]['anonymized_overview']

blog_post = agent_response.get('blog_post')
if isinstance(blog_post, str) and blog_post.startswith("Failed"):
    print("❌ Blog post generation failed:", blog_post)
    blog_post = "Blog post could not be generated due to prior errors."

# Save files
with open('agent_summary.txt', 'w') as f:
    f.write(agent_summary)
print("Agent's summary saved.")

with open('anonymized_summary.txt', 'w') as f:
    f.write(anonymized_summary)
print("Anonymized summary saved.")

with open('blog_post.txt', 'w') as f:
    f.write(blog_post)
print("Blog post generated and saved.")

# Get user decision
action = ask_user_for_post_action()

if action == "yes":
    # Post immediately
    lines = blog_post.splitlines()
    title = lines[0].strip()
    content = '\n'.join(lines[2:]).strip()

    post_data = {
        "title": title,
        "content": content,
        "status": "publish"
    }

    response = requests.post(WP_URL, headers=WP_HEADER, json=post_data)
    if response.status_code == 201:
        print("✅ Post created successfully.")
    else:
        print(f"❌ Failed to create post. Status Code: {response.status_code}")

elif action == "no":
    print("❌ Post creation skipped as per user request.")

elif action == "later":
    schedule_input = input("Enter the datetime to schedule the post (YYYY-MM-DD HH:MM): ").strip()
    try:
        schedule_datetime = datetime.strptime(schedule_input, "%Y-%m-%d %H:%M")
        wp_datetime = schedule_datetime.isoformat()

        lines = blog_post.splitlines()
        title = lines[0].strip()
        content = '\n'.join(lines[2:]).strip()

        post_data = {
            "title": title,
            "content": content,
            "status": "future",
            "date": wp_datetime
        }

        response = requests.post(WP_URL, headers=WP_HEADER, json=post_data)
        if response.status_code == 201:
            print(f"🕒 Post scheduled successfully for {wp_datetime}.")
        else:
            print(f"❌ Failed to schedule post. Status Code: {response.status_code}")
    except ValueError:
        print("Invalid date format. Use YYYY-MM-DD HH:MM.")

elif action == "archive":
    with open('archive_blog_post.txt', 'w') as f:
        f.write(blog_post)
    print("📦 Blog post archived.")
