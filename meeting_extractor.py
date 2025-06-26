# meeting_extractor.py

import requests
import os
import json
from datetime import datetime
from typing import List, Tuple, Dict

class FirefliesMeetingExtractor:
    def __init__(self, api_key: str, base_url: str):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }

    def fetch_meetings(self, from_timestamp: str, to_timestamp: str) -> List[dict]:
        query = """
        query Transcripts($limit: Int, $skip: Int, $fromDate: DateTime, $toDate: DateTime) {
            transcripts(limit: $limit, skip: $skip, fromDate: $fromDate, toDate: $toDate) {
                id
                title
                transcript_url
                dateString
                audio_url
                video_url
                sentences {
                    raw_text
                    speaker_name
                    speaker_id
                }
            }
        }
        """

        variables = {
            "limit": 50,
            "skip": 0,
            "fromDate": from_timestamp,
            "toDate": to_timestamp
        }

        data = {
            "query": query,
            "variables": variables
        }

        try:
            response = requests.post(self.base_url, headers=self.headers, json=data)
            response.raise_for_status()
            transcripts = response.json().get("data", {}).get("transcripts", [])
            return transcripts
        except requests.exceptions.RequestException as error:
            print(f"Error: {error}")
            if hasattr(error, 'response') and error.response is not None:
                print("Response content:", error.response.text)
            return []

    def get_summary(self, transcript_id: str) -> Dict:
        query = """
        query Transcript($transcriptId: String!) {
            transcript(id: $transcriptId) {
                summary {
                    keywords
                    action_items
                    outline
                    shorthand_bullet
                    overview
                    bullet_gist
                    gist
                    short_summary
                }
            }
        }
        """

        data = {
            "query": query,
            "variables": {
                "transcriptId": transcript_id
            }
        }

        try:
            response = requests.post(self.base_url, headers=self.headers, json=data)
            response.raise_for_status()
            summary_data = response.json().get("data", {}).get("transcript", {}).get("summary", {})
            return summary_data
        except requests.exceptions.RequestException as error:
            print(f"Error: {error}")
            if hasattr(error, 'response') and error.response is not None:
                print("Response content:", error.response.text)
            return {}

    @staticmethod
    def group_speaker_text(data: List[dict]) -> str:
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

    @staticmethod
    def parse_date_range(start_str: str, end_str: str) -> Tuple[str, str]:
        """
        Converts DD-MM-YYYY HH:MM format into ISO 8601 Zulu time strings for API compatibility.
        """
        start_time = datetime.strptime(start_str, "%d-%m-%Y %H:%M")
        end_time = datetime.strptime(end_str, "%d-%m-%Y %H:%M")
        return (start_time.isoformat() + 'Z', end_time.isoformat() + 'Z')

    def extract_meeting_data(self, from_timestamp: str, to_timestamp: str, meeting_number: int, output_dir: str = '../output') -> Dict:
        meetings = self.fetch_meetings(from_timestamp, to_timestamp)
        if not meetings:
            print(f"❌ No meetings found between {from_timestamp} and {to_timestamp}")
            return {}

        print(f"✅ Found {len(meetings)} meeting(s):")
        for i, meeting in enumerate(meetings):
            print(f"{i+1}: {meeting['title']} at {meeting['dateString']}")

        if meeting_number < 1 or meeting_number > len(meetings):
            raise ValueError(f"❌ Invalid meeting number: {meeting_number}. Valid range: 1 to {len(meetings)}")

        selected_meeting = meetings[meeting_number - 1]
        transcript = self.group_speaker_text(selected_meeting['sentences'])
        summary = self.get_summary(selected_meeting['id'])

        os.makedirs(output_dir, exist_ok=True)

        with open(os.path.join(output_dir, 'fireflies_summary.json'), 'w') as file:
            json.dump(summary, file, indent=2)

        with open(os.path.join(output_dir, 'meeting_transcript.txt'), 'w') as file:
            file.write(transcript)

        return {
            "meeting_title": selected_meeting['title'],
            "meeting_time": selected_meeting['dateString'],
            "meeting_id": selected_meeting['id'],
            "transcript": transcript,
            "summary": summary
        }
