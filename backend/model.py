# model.py

from pytubefix import Playlist
from datetime import timedelta
import re
import concurrent.futures

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

def get_video_thumbnail(video_id):
    """Get video thumbnail URL."""
    return f"https://img.youtube.com/vi/{video_id}/mqdefault.jpg"

def extract_video_id(url):
    """Extract video ID from YouTube URL."""
    pattern = r'(?:v=|\/)([0-9A-Za-z_-]{11}).*'
    match = re.search(pattern, url)
    return match.group(1) if match else None

def parse_duration(duration_str):
    """Convert duration string to seconds."""
    parts = duration_str.split(':')
    if len(parts) == 3:
        hours, minutes, seconds = map(int, parts)
        return hours * 3600 + minutes * 60 + seconds
    elif len(parts) == 2:
        minutes, seconds = map(int, parts)
        return minutes * 60 + seconds
    return int(parts[0])

def fetch_single_video(video):
    """Fetch details for a single video."""
    try:
        video_id = extract_video_id(video.watch_url)
        return {
            "title": video.title,
            "duration": format_duration(video.length),
            "link": video.watch_url,
            "thumbnail": get_video_thumbnail(video_id)
        }
    except Exception as e:
        print(f"Error processing video: {str(e)}")
        return None

def fetch_playlist_details(playlist_url):
    """Fetch details of all videos in a playlist using concurrent processing."""
    try:
        playlist = Playlist(playlist_url)
        if not playlist.videos:
            raise ValueError("The playlist is empty or inaccessible.")
        
        # Use ThreadPoolExecutor for parallel processing
        with concurrent.futures.ThreadPoolExecutor() as executor:
            # Process videos concurrently
            video_details = list(executor.map(fetch_single_video, playlist.videos))
        
        # Filter out None values (failed videos)
        video_details = [video for video in video_details if video is not None]
        
        if not video_details:
            raise ValueError("No valid videos found in playlist")
        
        return video_details
    except Exception as e:
        raise Exception(f"Error fetching playlist details: {str(e)}")

def create_schedule_time_based(video_details, daily_time_minutes, completed_videos=None, last_day_number=0, completed_video_details=None):
    """Create schedule based on daily time limit."""
    try:
        completed_videos = completed_videos or []
        completed_video_details = completed_video_details or []
        daily_time_seconds = (daily_time_minutes - 10) * 60
        schedule = {}
        
        # First, preserve completed videos in their original days
        for video in completed_video_details:
            day_key = f"Day {last_day_number}"
            if day_key not in schedule:
                schedule[day_key] = []
            schedule[day_key].append(video)

        # Start scheduling remaining videos from the next day
        current_day = last_day_number + 1
        current_day_videos = []
        current_day_duration = 0

        # Schedule only non-completed videos
        remaining_videos = [
            video for video in video_details 
            if video['link'] not in completed_videos
        ]

        for video in remaining_videos:
            video_duration = parse_duration(video["duration"])

            if current_day_duration + video_duration <= daily_time_seconds:
                current_day_videos.append(video)
                current_day_duration += video_duration
            else:
                if current_day_videos:
                    schedule[f"Day {current_day}"] = current_day_videos
                    current_day += 1
                current_day_videos = [video]
                current_day_duration = video_duration

        if current_day_videos:
            schedule[f"Day {current_day}"] = current_day_videos

        return schedule

    except Exception as e:
        raise ValueError(f"Error creating time-based schedule: {str(e)}")

def create_schedule_day_based(video_details, num_days, completed_videos=None, last_day_number=0, completed_video_details=None):
    """Create schedule based on number of days."""
    try:
        completed_videos = completed_videos or []
        completed_video_details = completed_video_details or []
        schedule = {}

        # First, preserve completed videos in their original days
        for video in completed_video_details:
            day_key = f"Day {last_day_number}"
            if day_key not in schedule:
                schedule[day_key] = []
            schedule[day_key].append(video)

        # Calculate total duration for remaining videos
        remaining_videos = [
            video for video in video_details 
            if video['link'] not in completed_videos
        ]

        if not remaining_videos:
            return schedule

        total_duration = sum(
            parse_duration(video["duration"])
            for video in remaining_videos
        )

        # Calculate average daily duration for remaining days
        remaining_days = num_days - last_day_number
        if remaining_days <= 0:
            remaining_days = 1
        avg_daily_duration = total_duration / remaining_days

        # Start scheduling from the next day
        current_day = last_day_number + 1
        current_day_videos = []
        current_day_duration = 0

        for video in remaining_videos:
            video_duration = parse_duration(video["duration"])

            if current_day < num_days and current_day_duration + video_duration > avg_daily_duration:
                if current_day_videos:
                    schedule[f"Day {current_day}"] = current_day_videos
                    current_day += 1
                current_day_videos = []
                current_day_duration = 0

            current_day_videos.append(video)
            current_day_duration += video_duration

        if current_day_videos:
            schedule[f"Day {current_day}"] = current_day_videos

        # Add revision days if needed
        while current_day < num_days:
            current_day += 1
            schedule[f"Day {current_day}"] = [{
                "title": "Revision Day",
                "duration": "00:00:00",
                "link": None,
                "thumbnail": None
            }]

        return schedule

    except Exception as e:
        raise ValueError(f"Error creating day-based schedule: {str(e)}")

def get_schedule_summary(schedule):
    """Get summary of the schedule."""
    total_videos = sum(len(videos) for videos in schedule.values())
    total_days = len(schedule)
    total_duration = sum(
        sum(parse_duration(video["duration"]) for video in videos if video["duration"] != "00:00:00")
        for videos in schedule.values()
    )
    
    return {
        "totalVideos": total_videos,
        "totalDays": total_days,
        "totalDuration": format_duration(total_duration),
        "averageDailyDuration": format_duration(total_duration // total_days) if total_days > 0 else "00:00:00"
    }