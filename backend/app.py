from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from datetime import datetime, timedelta
from pymongo import MongoClient
from bson import ObjectId
import os
from dotenv import load_dotenv
import google.generativeai as genai
from typing import Optional
from model import (
    fetch_playlist_details,
    create_schedule_time_based,
    create_schedule_day_based,
    validate_playlist_url,
    get_schedule_summary
)

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Updated CORS configuration
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "expose_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True,
        "max_age": 120
    }
})

# MongoDB connection
MONGO_URI = os.getenv('MONGODB_URI')
DB_NAME = os.getenv('DB_NAME', 'your_database_name')
client = MongoClient(MONGO_URI)
db = client[DB_NAME]
schedules_collection = db.schedules

# Configure Gemini
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel('gemini-pro')

# Helper Functions
def validate_object_id(id_string: str) -> bool:
    try:
        ObjectId(id_string)
        return True
    except:
        return False

def format_schedule_response(schedule):
    if not schedule:
        return None
    
    schedule['_id'] = str(schedule['_id'])
    schedule['userId'] = str(schedule['userId'])
    schedule['created_at'] = schedule['created_at'].isoformat()
    schedule['updated_at'] = schedule['updated_at'].isoformat()
    
    for day_schedule in schedule['schedule_data']:
        if isinstance(day_schedule['date'], datetime):
            day_schedule['date'] = day_schedule['date'].strftime('%Y-%m-%d')
    
    return schedule# Middleware for handling preflight requests
@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        response = make_response()
        response.headers.add("Access-Control-Allow-Origin", "http://localhost:3000")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS")
        response.headers.add("Access-Control-Allow-Credentials", "true")
        return response

@app.route('/api/schedules/detail/<schedule_id>', methods=['GET', 'OPTIONS'])
def get_schedule_detail(schedule_id):
    if request.method == "OPTIONS":
        return jsonify({}), 200

    try:
        if not validate_object_id(schedule_id):
            return jsonify({'error': 'Invalid schedule ID format'}), 400

        schedule = schedules_collection.find_one({'_id': ObjectId(schedule_id)})
        
        if not schedule:
            return jsonify({'error': 'Schedule not found'}), 404

        formatted_schedule = format_schedule_response(schedule)
        return jsonify({'schedule': formatted_schedule})

    except Exception as e:
        print(f"Error fetching schedule: {str(e)}")
        return jsonify({'error': 'Failed to fetch schedule'}), 500

@app.route('/api/schedule', methods=['POST', 'OPTIONS'])
def create_schedule():
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Extract request data
        user_id = data.get('userId')
        playlist_url = data.get('playlistUrl')
        schedule_type = data.get('scheduleType')
        title = data.get('title', 'Untitled Schedule')
        completed_videos = data.get('completedVideos', [])
        last_day_number = data.get('lastDayNumber', 0)
        completed_video_details = data.get('completedVideoDetails', [])
        is_adjustment = data.get('isAdjustment', False)
        old_schedule_id = data.get('oldScheduleId')

        # Validate required fields
        if not all([user_id, playlist_url, schedule_type]):
            return jsonify({'error': 'Missing required fields'}), 400

        # Validate playlist URL
        try:
            validate_playlist_url(playlist_url)
        except ValueError as e:
            return jsonify({'error': str(e)}), 400

        # Fetch video details
        try:
            video_details = fetch_playlist_details(playlist_url)
            if not video_details:
                return jsonify({'error': 'No videos found in playlist'}), 400
        except Exception as e:
            return jsonify({'error': f'Error fetching playlist: {str(e)}'}), 400

        # Generate schedule based on type
        if schedule_type == 'daily':
            try:
                daily_hours = float(data.get('dailyHours', 2))
                daily_minutes = int(daily_hours * 60)
                if daily_minutes <= 10:
                    return jsonify({'error': 'Daily study time must be greater than 10 minutes'}), 400
                
                schedule = create_schedule_time_based(
                    video_details=video_details,
                    daily_time_minutes=daily_minutes,
                    completed_videos=completed_videos,
                    last_day_number=last_day_number,
                    completed_video_details=completed_video_details
                )
                settings = {'daily_hours': daily_hours}
            except ValueError as e:
                return jsonify({'error': str(e)}), 400
        else:
            try:
                target_days = int(data.get('targetDays', 7))
                if target_days <= 0:
                    return jsonify({'error': 'Target days must be greater than 0'}), 400
                
                schedule = create_schedule_day_based(
                    video_details=video_details,
                    num_days=target_days,
                    completed_videos=completed_videos,
                    last_day_number=last_day_number,
                    completed_video_details=completed_video_details
                )
                settings = {'target_days': target_days}
            except ValueError as e:
                return jsonify({'error': str(e)}), 400

        # Format and save schedule to MongoDB
        schedule_doc = {
            'userId': ObjectId(user_id),
            'title': title,
            'playlist_url': playlist_url,
            'schedule_type': schedule_type,
            'settings': settings,
            'schedule_data': [
                {
                    'day': day,
                    'date': (datetime.now() + timedelta(days=int(day.split()[1]) - 1)).strftime('%Y-%m-%d'),
                    'videos': videos
                }
                for day, videos in schedule.items()
            ],
            'summary': get_schedule_summary(schedule),
            'status': 'active',
            'created_at': datetime.now(),
            'updated_at': datetime.now()
        }

        # If this is an adjustment, handle the old schedule
        if is_adjustment and old_schedule_id:
            try:
                old_schedule = schedules_collection.find_one({'_id': ObjectId(old_schedule_id)})
                if old_schedule:
                    # Copy completion status from old schedule
                    completed_map = {
                        video['link']: video['completed']
                        for day in old_schedule['schedule_data']
                        for video in day['videos']
                    }
                    for day in schedule_doc['schedule_data']:
                        for video in day['videos']:
                            if video['link'] in completed_map:
                                video['completed'] = completed_map[video['link']]
                    
                    # Delete old schedule
                    schedules_collection.delete_one({'_id': ObjectId(old_schedule_id)})
            except Exception as e:
                return jsonify({'error': f'Error handling schedule adjustment: {str(e)}'}), 500

        # Save to MongoDB
        result = schedules_collection.insert_one(schedule_doc)
        
        return jsonify({
            'message': 'Schedule created successfully',
            'scheduleId': str(result.inserted_id),
            'schedule': schedule,
            'summary': schedule_doc['summary']
        })

    except Exception as e:
        print(f"Error creating schedule: {str(e)}")
        return jsonify({'error': 'Failed to create schedule'}), 500

@app.route('/api/schedules/<user_id>', methods=['GET', 'OPTIONS'])
def get_user_schedules(user_id):
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    try:
        if not validate_object_id(user_id):
            return jsonify({'error': 'Invalid user ID format'}), 400

        schedules = list(schedules_collection.find({'userId': ObjectId(user_id)}))
        formatted_schedules = [format_schedule_response(schedule) for schedule in schedules]
        
        return jsonify({'schedules': formatted_schedules})
    except Exception as e:
        print(f"Error fetching user schedules: {str(e)}")
        return jsonify({'error': 'Failed to fetch schedules'}), 500@app.route('/api/schedules/<schedule_id>/adjust', methods=['POST', 'OPTIONS'])
def adjust_schedule(schedule_id):
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    try:
        data = request.json
        if not data or 'newDailyHours' not in data:
            return jsonify({'error': 'New daily hours required'}), 400

        if not validate_object_id(schedule_id):
            return jsonify({'error': 'Invalid schedule ID format'}), 400

        old_schedule = schedules_collection.find_one({'_id': ObjectId(schedule_id)})
        if not old_schedule:
            return jsonify({'error': 'Schedule not found'}), 404

        # Prepare data for new schedule creation
        adjustment_data = {
            'userId': str(old_schedule['userId']),
            'playlistUrl': old_schedule['playlist_url'],
            'scheduleType': 'daily',
            'dailyHours': float(data['newDailyHours']),
            'title': old_schedule['title'],
            'isAdjustment': True,
            'oldScheduleId': schedule_id
        }

        # Get completed videos information
        completed_videos = []
        completed_video_details = []
        for day in old_schedule['schedule_data']:
            for video in day['videos']:
                if video.get('completed'):
                    completed_videos.append(video['link'])
                    completed_video_details.append(video)

        adjustment_data['completedVideos'] = completed_videos
        adjustment_data['completedVideoDetails'] = completed_video_details

        # Create new schedule
        return create_schedule()

    except Exception as e:
        print(f"Error adjusting schedule: {str(e)}")
        return jsonify({'error': 'Failed to adjust schedule'}), 500

@app.route('/api/schedules/<schedule_id>/progress', methods=['PUT', 'OPTIONS'])
def update_video_progress(schedule_id):
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    try:
        data = request.json
        if not data or 'videoId' not in data:
            return jsonify({'error': 'Video ID required'}), 400

        if not validate_object_id(schedule_id):
            return jsonify({'error': 'Invalid schedule ID format'}), 400

        video_id = data['videoId']
        completed = data.get('completed', True)
        
        result = schedules_collection.update_one(
            {
                '_id': ObjectId(schedule_id),
                'schedule_data.videos.link': video_id
            },
            {
                '$set': {
                    'schedule_data.$[].videos.$[video].completed': completed,
                    'updated_at': datetime.now()
                }
            },
            array_filters=[{'video.link': video_id}]
        )
        
        if result.matched_count == 0:
            return jsonify({'error': 'Schedule or video not found'}), 404
            
        return jsonify({'message': 'Progress updated successfully'})
    except Exception as e:
        print(f"Error updating progress: {str(e)}")
        return jsonify({'error': 'Failed to update progress'}), 500

@app.route('/api/schedules/<schedule_id>/verify-video', methods=['POST', 'OPTIONS'])
def verify_video(schedule_id):
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    try:
        data = request.json
        if not data or 'videoTitle' not in data:
            return jsonify({'error': 'Video title required'}), 400

        if not validate_object_id(schedule_id):
            return jsonify({'error': 'Invalid schedule ID format'}), 400

        schedule = schedules_collection.find_one({
            '_id': ObjectId(schedule_id),
            'schedule_data.videos.title': data['videoTitle']
        })
        
        return jsonify({
            'exists': bool(schedule),
            'message': 'Video found in schedule' if schedule else 'Video not found in schedule'
        })

    except Exception as e:
        print(f"Error verifying video: {str(e)}")
        return jsonify({'error': 'Failed to verify video'}), 500

@app.route('/api/schedules/<schedule_id>/video-context/<video_title>', methods=['GET', 'OPTIONS'])
def get_video_context(schedule_id, video_title):
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    try:
        if not validate_object_id(schedule_id):
            return jsonify({'error': 'Invalid schedule ID format'}), 400

        schedule = schedules_collection.find_one({
            '_id': ObjectId(schedule_id),
            'schedule_data.videos.title': video_title
        })
        
        if not schedule:
            return jsonify({'error': 'Video not found'}), 404

        video_info = None
        for day in schedule['schedule_data']:
            for video in day['videos']:
                if video['title'] == video_title:
                    video_info = video
                    break
            if video_info:
                break

        if not video_info:
            return jsonify({'error': 'Video details not found'}), 404

        return jsonify({
            'video': {
                'title': video_info['title'],
                'duration': video_info['duration'],
                'thumbnail': video_info['thumbnail'],
                'completed': video_info['completed']
            }
        })

    except Exception as e:
        print(f"Error fetching video context: {str(e)}")
        return jsonify({'error': 'Failed to fetch video context'}), 500

@app.route('/api/debug/schedule/<schedule_id>', methods=['GET'])
def debug_schedule(schedule_id):
    try:
        # Test MongoDB connection
        client.admin.command('ping')
        print(f"MongoDB connection successful")
        
        # Validate ID format
        if not validate_object_id(schedule_id):
            return jsonify({'error': 'Invalid schedule ID format'}), 400
        
        # Check if schedule exists
        schedule = schedules_collection.find_one({'_id': ObjectId(schedule_id)})
        
        if not schedule:
            print(f"Schedule not found: {schedule_id}")
            return jsonify({
                'exists': False,
                'message': 'Schedule not found',
                'id_checked': schedule_id,
                'database': DB_NAME
            })
            
        print(f"Schedule found: {schedule.get('title', 'Untitled')}")
        return jsonify({
            'exists': True,
            'message': 'Schedule found',
            'title': schedule.get('title'),
            'id': str(schedule['_id']),
            'database': DB_NAME
        })
        
    except Exception as e:
        print(f"Debug error: {str(e)}")
        return jsonify({
            'error': str(e),
            'mongodb_uri': MONGO_URI[:20] + '...' if MONGO_URI else 'Not set',
            'database': DB_NAME
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    try:
        # Check MongoDB connection
        client.admin.command('ping')
        
        # Check Gemini API
        test_response = model.generate_content("Test connection")
        gemini_status = "connected"

        return jsonify({
            'status': 'healthy',
            'database': 'connected',
            'database_name': DB_NAME,
            'gemini_api': gemini_status,
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        print(f"Health check error: {str(e)}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

if __name__ == '__main__':
    # Verify environment variables
    required_vars = ['MONGODB_URI', 'GOOGLE_API_KEY']
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print(f"Error: Missing required environment variables: {', '.join(missing_vars)}")
        print("Please check your .env file")
        exit(1)
    
    # Print startup information
    print("\n=== Starting LearnFast API Server ===")
    print(f"Database: {DB_NAME}")
    print(f"MongoDB URI: {MONGO_URI[:20]}..." if MONGO_URI else "MongoDB URI not set")
    print(f"Gemini API Key: {'*' * 20}" if GOOGLE_API_KEY else "Gemini API Key not set")
    print("\nAvailable Routes:")
    print("================")
    for rule in app.url_map.iter_rules():
        if rule.endpoint != 'static':
            print(f"{rule.rule} [{', '.join(rule.methods - {'OPTIONS', 'HEAD'})}]")
    print("\nServer is running in development mode")
    print("=====================================\n")
    
    app.run(debug=True, port=5000)