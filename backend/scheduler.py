from pytubefix import Playlist
from datetime import timedelta
import concurrent.futures

def fetch_video_details(video):
    try:
        return {
            "title": video.title,
            "duration": video.length,  # Duration in seconds
            "link": video.watch_url,
            "thumbnail": video.thumbnail_url  # Fetching thumbnail
        }
    except Exception as e:
        print(f"Error fetching video details: {e}")
        return None

def fetch_playlist_details(playlist_url):
    try:
        playlist = Playlist(playlist_url)
        if not playlist.video_urls:
            raise ValueError("The playlist is empty or inaccessible.")
        
        video_details = []
        with concurrent.futures.ThreadPoolExecutor() as executor:
            results = list(executor.map(fetch_video_details, playlist.videos))
        
        return [video for video in results if video]
    except Exception as e:
        raise Exception(f"Error fetching playlist details: {e}")

def create_schedule_time_based(video_details, daily_time_minutes):
    daily_time_seconds = (daily_time_minutes - 10) * 60  # Deduct 10 minutes and convert to seconds
    schedule = {}
    day = 1
    current_day_videos = []
    current_day_duration = 0

    for video in video_details:
        video_entry = f"({video['thumbnail']}) ({video['title']}) {video['link']} ({timedelta(seconds=video['duration'])})"
        
        if current_day_duration + video["duration"] <= daily_time_seconds:
            current_day_videos.append(video_entry)
            current_day_duration += video["duration"]
        else:
            schedule[f"Day {day}"] = current_day_videos
            day += 1
            current_day_videos = [video_entry]
            current_day_duration = video["duration"]

    if current_day_videos:
        schedule[f"Day {day}"] = current_day_videos

    return schedule

def create_schedule_day_based(video_details, num_days):
    total_duration = sum(video["duration"] for video in video_details)
    avg_daily_duration = total_duration // num_days  # Ensuring no decimal time
    schedule = {}
    current_day_duration = 0
    day = 1
    current_day_videos = []

    avg_hours = avg_daily_duration // 3600
    avg_minutes = (avg_daily_duration % 3600) // 60
    print(f"\nYou have to give approximately {avg_hours} hours {avg_minutes} minutes a day.")

    for video in video_details:
        video_entry = f"({video['thumbnail']}) ({video['title']}) {video['link']} ({timedelta(seconds=video['duration'])})"
        
        if day < num_days and current_day_duration + video["duration"] > avg_daily_duration:
            schedule[f"Day {day}"] = current_day_videos
            day += 1
            current_day_videos = []
            current_day_duration = 0
        current_day_videos.append(video_entry)
        current_day_duration += video["duration"]

    if current_day_videos:
        schedule[f"Day {day}"] = current_day_videos

    while day < num_days:
        day += 1
        schedule[f"Day {day}"] = ["Revision Day"]

    return schedule

def display_schedule(schedule):
    for day, videos in schedule.items():
        print(f"{day}: {videos}")

def main():
    try:
        playlist_url = input("Please enter the playlist link: ").strip()
        if not playlist_url:
            raise ValueError("Playlist link cannot be empty.")

        print("\nFetching playlist details... This may take a while.")
        video_details = fetch_playlist_details(playlist_url)
        print(f"Found {len(video_details)} videos in the playlist.")

        start_video = int(input("Enter the video number to start from: "))
        if start_video < 1 or start_video > len(video_details):
            raise ValueError("Invalid start video number.")
        
        video_details = video_details[start_video - 1:]

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

        print("\nYour study schedule:")
        display_schedule(schedule)

    except Exception as e:
        print(f"\nError: {e}")

if __name__ == "__main__":
    main()

