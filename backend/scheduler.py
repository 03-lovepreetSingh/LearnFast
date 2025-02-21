from pytubefix import Playlist
from datetime import timedelta
import concurrent.futures

def fetch_video_details(video):
    """Fetches video details (title, duration, link) in parallel."""
    try:
        return {
            "title": video.title,
            "duration": video.length if video.length else 0,  # Handle NoneType durations
            "link": video.watch_url
        }
    except Exception as e:
        print(f"Error fetching video details: {e}")
        return None

def fetch_playlist_details(playlist_url):
    """Fetches all video details from a playlist concurrently."""
    try:
        playlist = Playlist(playlist_url)
        if not playlist.video_urls:
            raise ValueError("The playlist is empty or inaccessible.")

        with concurrent.futures.ThreadPoolExecutor() as executor:
            results = list(executor.map(fetch_video_details, playlist.videos))

        return [video for video in results if video]  # Remove None results
    except Exception as e:
        raise Exception(f"Error fetching playlist details: {e}")

def create_schedule_time_based(video_details, daily_time_minutes):
    """Creates a study schedule based on daily available time."""
    daily_time_seconds = (daily_time_minutes - 10) * 60  # Deduct 10 minutes
    schedule = {}
    day = 1
    current_day_videos = []
    current_day_duration = 0

    for video in video_details:
        if current_day_duration + video["duration"] <= daily_time_seconds:
            current_day_videos.append(f"({video['title']}) {video['link']} ({timedelta(seconds=video['duration'])})")
            current_day_duration += video["duration"]
        else:
            schedule[f"Day {day}"] = current_day_videos
            day += 1
            current_day_videos = [f"({video['title']}) {video['link']} ({timedelta(seconds=video['duration'])})"]
            current_day_duration = video["duration"]

    if current_day_videos:
        schedule[f"Day {day}"] = current_day_videos

    return schedule

def create_schedule_day_based(video_details, num_days):
    """Creates a study schedule based on the number of days."""
    total_duration = sum(video["duration"] for video in video_details)
    avg_daily_duration = total_duration // num_days  # Ensure no decimal values
    avg_hours = avg_daily_duration // 3600
    avg_minutes = (avg_daily_duration % 3600) // 60

    print(f"\nYou have to give approximately {avg_hours} hours {avg_minutes} minutes a day.")

    schedule = {}
    current_day_duration = 0
    day = 1
    current_day_videos = []

    for video in video_details:
        if day < num_days and current_day_duration + video["duration"] > avg_daily_duration:
            schedule[f"Day {day}"] = current_day_videos
            day += 1
            current_day_videos = []
            current_day_duration = 0
        current_day_videos.append(f"({video['title']}) {video['link']} ({timedelta(seconds=video['duration'])})")
        current_day_duration += video["duration"]

    if current_day_videos:
        schedule[f"Day {day}"] = current_day_videos

    while day < num_days:
        day += 1
        schedule[f"Day {day}"] = ["Revision Day"]

    return schedule

def display_schedule(schedule):
    """Displays the study schedule in a formatted manner."""
    for day, videos in schedule.items():
        print(f"{day}: {videos}")

def main():
    try:
        # Step 1: Get playlist link
        playlist_url = input("Please enter the playlist link: ").strip()
        if not playlist_url:
            raise ValueError("Playlist link cannot be empty.")

        # Step 2: Fetch playlist details
        print("\nFetching playlist details... This may take a while.")
        video_details = fetch_playlist_details(playlist_url)
        print(f"Found {len(video_details)} videos in the playlist.")

        # Step 3: Ask for the starting video number
        start_video = int(input("Enter the video number to start from: "))
        if start_video < 1 or start_video > len(video_details):
            raise ValueError("Invalid video number. Please enter a valid number.")

        # Slice the list to start from the selected video
        video_details = video_details[start_video - 1:]  # Adjusting for 0-based index

        # Step 4: Ask for scheduling option
        print("\nChoose an option:")
        print("1. Schedule by daily study time (in minutes)")
        print("2. Schedule by number of days to complete the playlist")
        option = input("Enter your choice (1 or 2): ").strip()

        if option == "1":
            daily_time_minutes = int(input("Enter the amount of time you can dedicate daily (in minutes): "))
            if daily_time_minutes <= 10:
                raise ValueError("Daily study time must be greater than 10 minutes.")
            schedule = create_schedule_time_based(video_details, daily_time_minutes)
        elif option == "2":
            num_days = int(input("Enter the number of days to complete the playlist: "))
            if num_days <= 0:
                raise ValueError("Number of days must be greater than 0.")
            schedule = create_schedule_day_based(video_details, num_days)
        else:
            raise ValueError("Invalid option selected. Please choose 1 or 2.")

        # Step 5: Display the schedule
        print("\nYour study schedule:")
        display_schedule(schedule)

    except Exception as e:
        print(f"\nError: {e}")

if __name__ == "__main__":
    main()

