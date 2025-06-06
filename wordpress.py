import os
import base64
import requests
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

WP_USERNAME = os.getenv("WORDPRESS_USERNAME")
WP_PASSWORD = os.getenv("WORDPRESS_APPLICATION_PASSWORD")
WP_URL = "https://winniio.io/wp-json/wp/v2/posts"

WP_CREDENTIALS = WP_USERNAME + ":" + WP_PASSWORD
WP_TOKEN = base64.b64encode(WP_CREDENTIALS.encode())
WP_HEADER = {"Authorization": "Basic " + WP_TOKEN.decode("utf-8")}

def post_to_wordpress(title: str, content: str, status: str = "draft", scheduled_time: str = None):
    data = {
        "title": title,
        "content": content,
        "status": status,
    }

    if status == "future" and scheduled_time:
        data["date"] = scheduled_time  # ISO 8601 format (UTC)

    response = requests.post(WP_URL, headers=WP_HEADER, json=data)
    return response
