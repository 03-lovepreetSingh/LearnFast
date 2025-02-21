from pytubefix import Playlist
from datetime import timedelta

def fetch_playlist_details(playlist_url):
    """Fetch details of all videos in a playlist."""
    try:
        playlist = Playlist(playlist_url)
        if not playlist.videos:
            raise ValueError("The playlist is empty or inaccessible.")
        
        video_details = []
        for video in playlist.videos:
            video_details.append({
                "title": video.title,
                "duration": video.length,  # Duration in seconds
                "link": video.watch_url
            })
        
        return video_details
    except Exception as e:
        raise Exception(f"Error fetching playlist details: {e}")

def create_schedule_time_based(video_details, daily_time_minutes):
    """Create schedule based on daily time limit."""
    daily_time_seconds = (daily_time_minutes - 10) * 60  # Deduct 10 minutes and convert to seconds
    schedule = {}
    day = 1
    current_day_videos = []
    current_day_duration = 0

    for video in video_details:
        if current_day_duration + video["duration"] <= daily_time_seconds:
            current_day_videos.append({
                "title": video["title"],
                "duration": str(timedelta(seconds=video["duration"])),
                "link": video["link"]
            })
            current_day_duration += video["duration"]
        else:
            schedule[f"Day {day}"] = current_day_videos
            day += 1
            current_day_videos = [{
                "title": video["title"],
                "duration": str(timedelta(seconds=video["duration"])),
                "link": video["link"]
            }]
            current_day_duration = video["duration"]

    if current_day_videos:
        schedule[f"Day {day}"] = current_day_videos

    return schedule

def create_schedule_day_based(video_details, num_days):
    """Create schedule based on number of days."""
    total_duration = sum(video["duration"] for video in video_details)
    avg_daily_duration = total_duration / num_days
    schedule = {}
    current_day_duration = 0
    day = 1
    current_day_videos = []

    # Calculate approximate daily study time
    avg_daily_hours = round((total_duration / num_days) / 3600, 2)

    for video in video_details:
        if day < num_days and current_day_duration + video["duration"] > avg_daily_duration:
            schedule[f"Day {day}"] = current_day_videos
            day += 1
            current_day_videos = []
            current_day_duration = 0
        
        current_day_videos.append({
            "title": video["title"],
            "duration": str(timedelta(seconds=video["duration"])),
            "link": video["link"]
        })
        current_day_duration += video["duration"]

    if current_day_videos:
        schedule[f"Day {day}"] = current_day_videos

    # Add revision days if needed
    while day < num_days:
        day += 1
        schedule[f"Day {day}"] = [{
            "title": "Revision Day",
            "duration": "N/A",
            "link": None
        }]

    return {
        "schedule": schedule,
        "dailyHours": avg_daily_hours
    }

def format_duration(seconds):
    """Format duration in seconds to readable string."""
    return str(timedelta(seconds=seconds))

def validate_playlist_url(url):
    """Validate YouTube playlist URL."""
    if not url:
        raise ValueError("Playlist URL cannot be empty")
    if "youtube.com/playlist" not in url and "youtu.be" not in url:
        raise ValueError("Invalid YouTube playlist URL")
    return True

def get_schedule_summary(schedule):
    """Get summary of the schedule."""
    total_videos = sum(len(videos) for videos in schedule.values())
    total_days = len(schedule)
    return {
        "totalVideos": total_videos,
        "totalDays": total_days
    }

def main():
    try:
        # Get playlist link
        playlist_url = input("Please enter the playlist link: ").strip()
        validate_playlist_url(playlist_url)

        # Fetch playlist details
        print("\nFetching playlist details...")
        video_details = fetch_playlist_details(playlist_url)
        print(f"Found {len(video_details)} videos in the playlist.")

        # Get scheduling option
        print("\nChoose an option:")
        print("1. Schedule by daily study time (in minutes)")
        print("2. Schedule by number of days to complete the playlist")
        option = input("Enter your choice (1 or 2): ").strip()

        if option == "1":
            daily_time_minutes = int(input("Enter the amount of time you can dedicate daily (in minutes): "))
            if daily_time_minutes <= 10:
                raise ValueError("Daily study time must be greater than 10 minutes.")
            schedule = create_schedule_time_based(video_details, daily_time_minutes)
            print("\nSchedule created based on daily time limit:")
        elif option == "2":
            num_days = int(input("Enter the number of days to complete the playlist: "))
            if num_days <= 0:
                raise ValueError("Number of days must be greater than 0.")
            result = create_schedule_day_based(video_details, num_days)
            schedule = result["schedule"]
            print(f"\nSchedule created for {num_days} days:")
            print(f"Required daily study time: {result['dailyHours']} hours")
        else:
            raise ValueError("Invalid option selected. Please choose 1 or 2.")

        # Display schedule
        print("\nYour study schedule:")
        for day, videos in schedule.items():
            print(f"\n{day}:")
            for video in videos:
                print(f"- {video['title']} ({video['duration']})")

    except Exception as e:
        print(f"\nError: {e}")

if __name__ == "__main__":
    main()