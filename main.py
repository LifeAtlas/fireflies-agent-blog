# from typing import Annotated, Dict, Any
# from typing_extensions import TypedDict

# from langchain_core.messages import HumanMessage
# from langchain_core.output_parsers import StrOutputParser
# from langchain_core.prompts import ChatPromptTemplate

# from langgraph.graph import StateGraph
# from langgraph.graph.message import add_messages
# from langgraph.prebuilt import ToolNode

# from langchain_core.messages import AIMessage
# from langchain_core.messages.tool import ToolCall

# # from langchain_openai import AzureChatOpenAI
# from langchain.chat_models import init_chat_model

# from datetime import datetime

# import os
# import sys
# import json

# import base64
# import requests

# from dotenv import load_dotenv
# load_dotenv()

# WP_USERNAME = os.getenv('WORDPRESS_USERNAME')
# WP_PASSWORD = os.getenv('WORDPRESS_APPLICATION_PASSWORD')
# WP_URL = "https://winniio.io/wp-json/wp/v2/posts"

# WP_CREDENTIALS = WP_USERNAME + ":" + WP_PASSWORD
# WP_TOKEN = base64.b64encode(WP_CREDENTIALS.encode())
# WP_HEADER = {'Authorization': 'Basic ' + WP_TOKEN.decode('utf-8')}

# API_KEY = os.getenv('FIREFLIES_API_KEY')
# BASE_URL = "https://api.fireflies.ai/graphql"

# def ask_user_for_post_action():
#     print("\nWhat would you like to do with the blog post?")
#     print("1. Yes (Post it now)")
#     print("2. No (Do not post)")
#     print("3. Later (Schedule the post)")
#     print("4. Archive (Save it to archive)")

#     choice_map = {
#         "1": "yes",
#         "2": "no",
#         "3": "later",
#         "4": "archive"
#     }

#     while True:
#         user_input = input("Enter your choice (1-4): ").strip()
#         if user_input in choice_map:
#             return choice_map[user_input]
#         else:
#             print("Invalid choice. Please enter a number between 1 and 4.")

# def get_date_input():
#     """
#     Prompts the user to input a start date and time, and an end date and time, 
#     both in the format DD-MM-YYYY HH:MM. The function ensures that both inputs 
#     are in the correct format. If either input is invalid, it will repeatedly 
#     prompt the user until both inputs are correctly provided. The function returns
#     a tuple with both the start and end times in ISO format.

#     Parameters:
#     prompt (str): The message displayed to the user when asking for the date and time input.

#     Returns:
#     tuple: A tuple containing two datetime objects (startTime, endTime) in ISO format.
#     """

#     while True:
#         try:
#             # Get start date input
#             start_str = input("Enter Start Date (DD-MM-YYYY HH:MM): ")
#             start_time = datetime.strptime(start_str, "%d-%m-%Y %H:%M")

#             # Get end date input
#             end_str = input("Enter End Date (DD-MM-YYYY HH:MM): ")
#             end_time = datetime.strptime(end_str, "%d-%m-%Y %H:%M")

#             return (start_time.isoformat() + 'Z', end_time.isoformat() + 'Z')
        
#         except ValueError:
#             print("Invalid format. Please enter the date and time in DD-MM-YYYY HH:MM format.")


# def fetch_meetings(from_timestamp, to_timestamp):
#     """
#     Fetches the details of meetings that occurred between from_timestamp and to_timestamp.

#     Parameters:
#     from_timestamp (datetime): The start date and time.
#     to_timestamp (datetime): The end date and time.

#     Returns:
#     list: A list of JSON objects where each object contains details of meetings that occurred between the given dates.
#           The details include meeting id, title, transcript_url, dateString, audio_url, video_url
#     """

#     headers = {
#         "Content-Type": "application/json",
#         "Authorization": f"Bearer {API_KEY}"
#     }

#     data = {
#         "query": """
#         query Transcripts($limit: Int, $skip: Int, $fromDate: DateTime, $toDate: DateTime) {
#             transcripts(limit: $limit, skip: $skip, fromDate: $fromDate, toDate: $toDate) {
#                 id
#                 title
#                 transcript_url
#                 dateString
#                 audio_url
#                 video_url
#                 sentences {
#                     raw_text
#                     speaker_name
#                     speaker_id
#                 }
#             }
#         }
#         """,
#         "variables": {
#             "limit": 50,  # Number of transcripts to fetch. Max allowed: 50
#             "skip": 0,
#             "fromDate": from_timestamp,
#             "toDate": to_timestamp
#         }
#     }

#     try:
#         response = requests.post(BASE_URL, headers=headers, json=data)
#         response.raise_for_status()

#         transcripts = response.json().get("data", {}).get("transcripts", [])
#         return transcripts
    
#     except requests.exceptions.RequestException as error:
#         print(f"Error: {error}")
#         if hasattr(error, 'response') and error.response is not None:
#             print("Response content:", error.response.text)
#         return []
    

# def get_summary(transcript_id):
#     """
#     Fetches the meeting summary of the meeting whose transcript_id has been provided.
    
#     Parameters:
#     transcript_id (string): The ID of the transcript to fetch.
    
#     Returns:
#     dict: A JSON object containing various components of the summary such as
#           keywords, action_items, outline, shorthand_bullet, overview, bullet_gist, gist, short_summary.
#     """

#     headers = {
#         "Content-Type": "application/json",
#         "Authorization": f"Bearer {API_KEY}"
#     }

#     data = {
#         "query": """
#         query Transcript($transcriptId: String!) {
#             transcript(id: $transcriptId) {
#                 summary {
#                     keywords
#                     action_items
#                     outline
#                     shorthand_bullet
#                     overview
#                     bullet_gist
#                     gist
#                     short_summary
#                 }
#             }
#         }
#         """,
#         "variables": {
#             "transcriptId": f"{transcript_id}"
#         }
#     }

#     try:
#         response = requests.post(BASE_URL, headers=headers, json=data)
#         response.raise_for_status()

#         summary_data = response.json().get("data", {}).get("transcript", {}).get("summary", {})
#         return summary_data
    
#     except requests.exceptions.RequestException as error:
#         print(f"Error: {error}")
#         if hasattr(error, 'response') and error.response is not None:
#             print("Response content:", error.response.text)
#         return {}
    

# def group_speaker_text(data):
#     """
#     Groups and formats a list of dialogue entries by speaker.

#     This function takes a list of dictionaries, where each dictionary contains the text 
#     of a speaker's message and the speaker's name. It organizes the messages by speaker,
#     grouping all of a speaker's messages together and formatting them into a string, 
#     with each speaker's dialogue displayed on a new line.

#     The function assumes that the input data is ordered in the correct sequence, 
#     with each speaker's dialogue appearing in the order they spoke.

#     Args:
#         data (list of dict): A list of dictionaries, each containing:
#             - 'raw_text' (str): The text of the message.
#             - 'speaker_name' (str): The name of the speaker.
#             - 'speaker_id' (int): An identifier for the speaker (not used in the function).

#     Returns:
#         str: A string where each speaker's dialogue is printed in order,
#              with their name followed by the messages they spoke, separated by spaces.
#              Each speaker's dialogue is on a new line.
#     """

#     result = []
    
#     current_speaker = None
#     current_text = []

#     for entry in data:
#         speaker_name = entry['speaker_name']
#         raw_text = entry['raw_text']
        
#         if speaker_name != current_speaker:
#             if current_speaker is not None:
#                 result.append(f"{current_speaker}: {' '.join(current_text)}")
#             current_speaker = speaker_name
#             current_text = [raw_text]
#         else:
#             current_text.append(raw_text)

#     if current_speaker is not None:
#         result.append(f"{current_speaker}: {' '.join(current_text)}")

#     return "\n".join(result)
        

# def prompt_include_transcript():
    
#     include_transcript_prompt = "Would you like the AI Agent to analyze the entire meeting transcript as well?\n" \
#                                 "Please do note that analyzing the entire transcript will consume a lot of tokens.\n" \
#                                 "If you want the transcript to be analyzed, enter 1, else, enter 0: "
    
#     user_input = input(include_transcript_prompt).strip()
#     while user_input not in ("0", "1"):
#         print("Invalid input. Please enter 1 to include the transcript or 0 to exclude it: ", end="")
#         user_input = input().strip()
#     return user_input == "1"


# # Get start date and end date from user
# from_timestamp, to_timestamp = get_date_input()
# # from_timestamp, to_timestamp = '2025-04-11T10:00:00Z', '2025-04-11T12:00:00Z'

# # Get list of meetings for the specified time duration
# meetings = fetch_meetings(from_timestamp, to_timestamp)

# # Exit out of the script if no meetings occurred during specified time duration.
# if not meetings:
#     print("No meetings occurred during this time.")
#     sys.exit()

# print("Here are the meetings that occurred between the duration you specified:")

# for index, meeting in enumerate(meetings):

#     meeting_timestamp = datetime.strptime(meeting['dateString'], "%Y-%m-%dT%H:%M:%S.%fZ").strftime("%d-%m-%Y %H:%M:%S")

#     print(f"""
#     Meeting No. {index + 1}
#     Meeting Title: {meeting['title']}
#     Meeting Time: {meeting_timestamp}
#     Meeting ID: {meeting['id']}
#     Transcript URL: {meeting['transcript_url']}\n
#     """)

# # Prompt user to select the desired meeting
# meeting_no = int(input("Please enter the meeting number of the meeting which you want summarized: "))
# meeting_id = meetings[meeting_no-1]['id']

# # Pre-processing Fireflies summary for LLM integration
# meeting_sentences = meetings[meeting_no-1]['sentences']
# meeting_transcript = group_speaker_text(meeting_sentences)
# fireflies_summary = get_summary(meeting_id)

# if not os.path.exists('../output'):
#     os.makedirs('../output')

# # Save Fireflies Summmary
# with open('../output/fireflies_summary.json', 'w') as file:
#     json.dump(fireflies_summary, file, indent=2)

# print("\nFireflies Summary saved.")

# # Save Meeting Transcript
# with open('../output/meeting_transcript.txt', 'w') as file:
#     file.write(meeting_transcript)

# print("Meeting conversation saved.\n")

# include_transcript = prompt_include_transcript()


# # Initialize LLM
# llm = init_chat_model("llama3-70b-8192", model_provider="groq")
# # llm = AzureChatOpenAI(model_name="gpt-35-turbo-16k")


# class State(TypedDict):
#     messages: Annotated[list, add_messages]
#     fireflies_summary: Dict[str, any]
#     meeting_transcript: str
#     agent_summary: any
#     agent_summary_anonymized: any
#     blog_post: str


# def summarizer(state):
#     """
#     Function to create the summarizer node.
#     """

#     if include_transcript:
#         summarizer_prompt = ChatPromptTemplate.from_messages([
#             ("system", """You are an expert meeting summarizer. Analyze the meeting summary and full meeting transcript to generate a comprehensive, nuanced overview.
            
#             Your goal is to:
#             - Capture the key discussion points
#             - Highlight the main objectives and outcomes
#             - Provide insights into the strategic direction
#             - Synthesize information from both the existing summary and the full conversation

#             Write a clear, concise, and informative overview that captures the essence of the meeting."""),
#             ("human", """Create a detailed overview based on the following information:

#             Existing Summary: {fireflies_summary}
#             Full meeting transcript: {meeting_transcript}

#             Please provide a comprehensive and insightful overview of the meeting that goes beyond surface-level details.""")
#         ])
#     else:
#         summarizer_prompt = ChatPromptTemplate.from_messages([
#             ("system", """You are an expert meeting summarizer. Analyze the meeting summary and full meeting transcript to generate a comprehensive, nuanced overview.
            
#             Your goal is to:
#             - Capture the key discussion points
#             - Highlight the main objectives and outcomes
#             - Provide insights into the strategic direction
#             - Synthesize information from both the existing summary and the full conversation

#             Write a clear, concise, and informative overview that captures the essence of the meeting."""),
#             ("human", """Create a detailed overview based on the following information:

#             Existing Summary: {fireflies_summary}

#             Please provide a comprehensive and insightful overview of the meeting that goes beyond surface-level details.""")
#         ])

#     agent_flow = summarizer_prompt | llm | StrOutputParser()

#     try:
#         if include_transcript:
#             result = agent_flow.invoke({
#                 "fireflies_summary": json.dumps(state["fireflies_summary"]),
#                 "meeting_transcript": state["meeting_transcript"]
#             })
#         else:
#             result = agent_flow.invoke({
#                 "fireflies_summary": json.dumps(state["fireflies_summary"])
#             })
        
#         # Parse the result into a structured format
#         summary_data = {
#             "overview": result.strip()
#         }
        
#         return {
#             "agent_summary": [
#                 # HumanMessage(content=json.dumps(summary_data, indent=2))
#                 summary_data
#             ]
#         }
    
#     except Exception as e:
#         print(f"Error in summarizer: {e}")
#         return {"agent_summary": f"Failed to generate summary: {str(e)}"}
    

# def anonymizer(state):
#     """
#     Function to create the anonymizer node.
#     """
    
#     anonymizer_prompt = ChatPromptTemplate.from_messages([
#         ("system", """You are a data privacy and internal controls assistant. You are an expert at anonymizing sensitive information in meeting summaries.
        
#         Your task is to:
#         - Remove all personal names and replace them with generic roles
#         - Remove any confidential information, especially related to payments, budgets, or financial figures
#         - Remove any sensitive business information that shouldn't be shared broadly
#         - Preserve the overall meaning and context of the summary
#         - Maintain the same level of detail except for the sensitive information
#         - Ensure data privacy according to GDPR and general internal control standards such as ISO 27001, SOC 2, and HIPAA (where applicable). 
        
#         The output should be a clean, anonymized version of the input text that protects privacy while maintaining usefulness."""),
#         ("human", """Please anonymize the following meeting summary by removing names and confidential information:
        
#         {agent_summary}
        
#         Return only the anonymized text without explanations.""")
#     ])
    
#     anonymize_flow = anonymizer_prompt | llm | StrOutputParser()
    
#     try:
#         anonymized_result = anonymize_flow.invoke({
#             "agent_summary": state["agent_summary"][0]['overview']
#         })
        
#         response_data = {
#             "anonymized_overview": anonymized_result.strip()
#         }
        
#         return {
#             "agent_summary_anonymized": [
#                 # HumanMessage(content=json.dumps(response_data, indent=2))
#                 response_data
#             ]
#         }
    
#     except Exception as e:
#         print(f"Error in anonymizer: {e}")
#         return {"agent_summary_anonymized": f"Failed to anonymize the summary: {str(e)}"}
    

# def writer(state):
#     """
#     Function to create the writer node for blog posts.
#     """

#     blog_post_prompt = ChatPromptTemplate.from_messages([
#         ("system", """You are a skilled content writer tasked with creating an engaging blog post based on an anonymized meeting summary.
        
#         Your goal is to:
#         - Transform the key points of the summary into a narrative format suitable for a blog.
#         - Make the content informative and interesting for a general audience or relevant stakeholders (without revealing confidential details).
#         - Use a professional yet approachable tone.
#         - Ensure the blog post flows well and is easy to read.
        
#         Do not include any placeholders like [Role] or [Initiative]; write as if the information is naturally generalized based on the input."""),
#         ("human", """Please write a blog post based on the following anonymized meeting overview:

#         {anonymized_summary}

#         Generate only the blog post content itself.""")
#     ])

#     blog_post_flow = blog_post_prompt | llm | StrOutputParser()
    
#     try:
#         anonymized_overview = state["agent_summary_anonymized"][0]['anonymized_overview']

#         blog_post_result = blog_post_flow.invoke({
#             "anonymized_summary": anonymized_overview
#         })

#         return {"blog_post": blog_post_result.strip()}

#     except Exception as e:
#         print(f"Error in writer: {e}")
#         return {"blog_post": f"Failed to create blog post: {str(e)}"}


# '''def build_summarizer_graph():
#     """
#     Function to create flow graph for the AI Agent.
#     """
#     graph_builder = StateGraph(State)

#     # Add Nodes
#     graph_builder.add_node("create_summary", summarizer)
#     graph_builder.add_node("anonymize_output", anonymizer)
#     graph_builder.add_node("create_blog_post", writer)

#     # Define Flow
#     graph_builder.add_edge("create_summary", "anonymize_output")
#     graph_builder.add_edge("anonymize_output", "create_blog_post")

#     # Set entry point
#     graph_builder.set_entry_point("create_summary")

#     return graph_builder.compile()


# agent = build_summarizer_graph()

# # With Conversation
# agent_response = agent.invoke({
#     "messages": [],
#     "fireflies_summary": fireflies_summary,
#     "meeting_transcript": meeting_transcript,
#     "agent_summary": {},
#     "agent_summary_anonymized": {},
#     "blog_post": ""
# })

# agent_summary = agent_response['agent_summary'][0]['overview']
# anonymized_summary = agent_response['agent_summary_anonymized'][0]['anonymized_overview']
# blog_post = agent_response['blog_post']

# # Saving Agent Summary
# with open('../output/agent_summary.txt', 'w') as f:
#     f.write(agent_summary)

# print("\nAgent's summary saved.")

# # Saving Anonymized Summary
# with open('../output/anonymized_summary.txt', 'w') as f:
#     f.write(anonymized_summary)

# print("Anonymized summary saved.")

# # Saving Blog Post
# with open('../output/blog_post.txt', 'w') as f:
#     f.write(blog_post)

# print("Blog post generated.")

# # Publishing to WordPress
# with open('../output/blog_post.txt', 'r') as file:
#     lines = file.readlines()

# title = lines[0].strip()
# content = ''.join(lines[2:]).strip()

# post_data = {
#     "title": title,
#     "content": content,
#     # "status": "publish"  # Use 'draft' if you don't want to publish immediately
#     "status": "draft"
# }

# response = requests.post(
#     WP_URL,
#     headers=WP_HEADER,
#     json=post_data
# )

# if response.status_code == 201:
#     print("Post created successfully.")
# else:
#     print("Failed to create post. Status Code: ", response.status_code)'''

# def build_summarizer_graph():
#     """
#     Function to create flow graph for the AI Agent.
#     """
#     graph_builder = StateGraph(State)

#     # Add Nodes
#     graph_builder.add_node("create_summary", summarizer)
#     graph_builder.add_node("anonymize_output", anonymizer)
#     graph_builder.add_node("create_blog_post", writer)

#     # Define Flow
#     graph_builder.add_edge("create_summary", "anonymize_output")
#     graph_builder.add_edge("anonymize_output", "create_blog_post")

#     # Set entry point
#     graph_builder.set_entry_point("create_summary")

#     return graph_builder.compile()


# agent = build_summarizer_graph()

# # With Conversation
# agent_response = agent.invoke({
#     "messages": [],
#     "fireflies_summary": fireflies_summary,
#     "meeting_transcript": meeting_transcript,
#     "agent_summary": {},
#     "agent_summary_anonymized": {},
#     "blog_post": ""
# })

# agent_summary = agent_response['agent_summary'][0]['overview']
# anonymized_summary = agent_response['agent_summary_anonymized'][0]['anonymized_overview']
# blog_post = agent_response['blog_post']

# # Save files
# with open('agent_summary.txt', 'w') as f:
#     f.write(agent_summary)
# print("Agent's summary saved.")

# with open('anonymized_summary.txt', 'w') as f:
#     f.write(anonymized_summary)
# print("Anonymized summary saved.")

# with open('blog_post.txt', 'w') as f:
#     f.write(blog_post)
# print("Blog post generated and saved.")

# # Get user decision
# action = ask_user_for_post_action()

# if action == "yes":
#     # Post immediately
#     lines = blog_post.splitlines()
#     title = lines[0].strip()
#     content = '\n'.join(lines[2:]).strip()

#     post_data = {
#         "title": title,
#         "content": content,
#         "status": "publish"
#     }

#     response = requests.post(WP_URL, headers=WP_HEADER, json=post_data)
#     if response.status_code == 201:
#         print("✅ Post created successfully.")
#     else:
#         print(f"❌ Failed to create post. Status Code: {response.status_code}")

# elif action == "no":
#     print("❌ Post creation skipped as per user request.")

# elif action == "later":
#     schedule_input = input("Enter the datetime to schedule the post (YYYY-MM-DD HH:MM): ").strip()
#     try:
#         schedule_datetime = datetime.strptime(schedule_input, "%Y-%m-%d %H:%M")
#         wp_datetime = schedule_datetime.isoformat()

#         lines = blog_post.splitlines()
#         title = lines[0].strip()
#         content = '\n'.join(lines[2:]).strip()

#         post_data = {
#             "title": title,
#             "content": content,
#             "status": "future",
#             "date": wp_datetime
#         }

#         response = requests.post(WP_URL, headers=WP_HEADER, json=post_data)
#         if response.status_code == 201:
#             print(f"🕒 Post scheduled successfully for {wp_datetime}.")
#         else:
#             print(f"❌ Failed to schedule post. Status Code: {response.status_code}")
#     except ValueError:
#         print("Invalid date format. Use YYYY-MM-DD HH:MM.")

# elif action == "archive":
#     with open('archive_blog_post.txt', 'w') as f:
#         f.write(blog_post)
#     print("📦 Blog post archived.")