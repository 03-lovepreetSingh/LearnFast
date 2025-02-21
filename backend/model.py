from pytubefix import Playlist
from datetime import timedelta
import re

def validate_playlist_url(url):
    """Validate YouTube playlist URL."""
    if not url:
        raise ValueError("Playlist URL cannot be empty")
    if "youtube.com/playlist" not in url and "youtu.be" not in url:
        raise ValueError("Invalid YouTube playlist URL")
    return True

def format_duration(seconds):
    """Format duration in seconds to HH:MM:SS."""
    return str(timedelta(seconds=seconds))

def fetch_playlist_details(playlist_url):
    """Fetch details of all videos in a playlist."""
    try:
        playlist = Playlist(playlist_url)
        if not playlist.videos:
            raise ValueError("The playlist is empty or inaccessible.")
        
        video_details = []
        for video in playlist.videos:
            try:
                video_details.append({
                    "title": video.title,
                    "duration": format_duration(video.length),
                    "link": video.watch_url
                })
            except Exception as e:
                print(f"Error processing video: {str(e)}")
                continue
        
        if not video_details:
            raise ValueError("No valid videos found in playlist")
        
        return video_details
    except Exception as e:
        raise Exception(f"Error fetching playlist details: {str(e)}")

def create_schedule_time_based(video_details, daily_time_minutes):
    """Create schedule based on daily time limit."""
    try:
        daily_time_seconds = (daily_time_minutes - 10) * 60
        schedule = {}
        day = 1
        current_day_videos = []
        current_day_duration = 0

        for video in video_details:
            # Convert duration string to seconds
            duration_parts = video["duration"].split(':')
            video_duration = sum(x * int(t) for x, t in zip([3600, 60, 1], duration_parts))

            if current_day_duration + video_duration <= daily_time_seconds:
                current_day_videos.append({
                    "title": video["title"],
                    "duration": video["duration"],
                    "link": video["link"]
                })
                current_day_duration += video_duration
            else:
                if current_day_videos:
                    schedule[f"Day {day}"] = current_day_videos
                    day += 1
                current_day_videos = [{
                    "title": video["title"],
                    "duration": video["duration"],
                    "link": video["link"]
                }]
                current_day_duration = video_duration

        if current_day_videos:
            schedule[f"Day {day}"] = current_day_videos

        return schedule
    except Exception as e:
        raise ValueError(f"Error creating time-based schedule: {str(e)}")

def create_schedule_day_based(video_details, num_days):
    """Create schedule based on number of days."""
    try:
        # Calculate total duration
        total_duration = 0
        for video in video_details:
            duration_parts = video["duration"].split(':')
            total_duration += sum(x * int(t) for x, t in zip([3600, 60, 1], duration_parts))

        avg_daily_duration = total_duration / num_days
        schedule = {}
        current_day_duration = 0
        day = 1
        current_day_videos = []

        for video in video_details:
            duration_parts = video["duration"].split(':')
            video_duration = sum(x * int(t) for x, t in zip([3600, 60, 1], duration_parts))

            if day < num_days and current_day_duration + video_duration > avg_daily_duration:
                if current_day_videos:
                    schedule[f"Day {day}"] = current_day_videos
                    day += 1
                current_day_videos = []
                current_day_duration = 0

            current_day_videos.append({
                "title": video["title"],
                "duration": video["duration"],
                "link": video["link"]
            })
            current_day_duration += video_duration

        if current_day_videos:
            schedule[f"Day {day}"] = current_day_videos

        # Add revision days if needed
        while day < num_days:
            day += 1
            schedule[f"Day {day}"] = [{
                "title": "Revision Day",
                "duration": "00:00:00",
                "link": None
            }]

        return schedule
    except Exception as e:
        raise ValueError(f"Error creating day-based schedule: {str(e)}")

def get_schedule_summary(schedule):
    """Get summary of the schedule."""
    total_videos = sum(len(videos) for videos in schedule.values())
    total_days = len(schedule)
    return {
        "totalVideos": total_videos,
        "totalDays": total_days
    }