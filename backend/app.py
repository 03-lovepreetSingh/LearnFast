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
    get_schedule_summary,
    parse_duration,
    format_duration,
    get_video_thumbnail,
    extract_video_id
)

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Simple CORS configuration
CORS(app)

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    return response

# Configure app settings
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max-limit

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
    
    try:
        formatted_schedule = {
            '_id': str(schedule['_id']),
            'userId': str(schedule['userId']),
            'title': schedule.get('title', 'Untitled'),
            'playlist_url': schedule.get('playlist_url', ''),
            'schedule_type': schedule.get('schedule_type', ''),
            'settings': schedule.get('settings', {}),
            'status': schedule.get('status', 'active'),
            'created_at': schedule['created_at'].isoformat() if isinstance(schedule.get('created_at'), datetime) else None,
            'updated_at': schedule['updated_at'].isoformat() if isinstance(schedule.get('updated_at'), datetime) else None,
            'summary': schedule.get('summary', {}),
            'schedule_data': []
        }

        for day_schedule in schedule.get('schedule_data', []):
            formatted_day = {
                'day': day_schedule.get('day', ''),
                'date': (day_schedule['date'].strftime('%Y-%m-%d') 
                        if isinstance(day_schedule.get('date'), datetime)
                        else day_schedule.get('date', '')),
                'videos': [
                    {
                        'title': video.get('title', ''),
                        'duration': video.get('duration', '00:00:00'),
                        'link': video.get('link', ''),
                        'thumbnail': video.get('thumbnail', ''),
                        'completed': video.get('completed', False)
                    }
                    for video in day_schedule.get('videos', [])
                ]
            }
            formatted_schedule['schedule_data'].append(formatted_day)

        return formatted_schedule
    except Exception as e:
        print(f"Error formatting schedule: {str(e)}")
        return None

# Error handlers
@app.errorhandler(500)
def handle_500_error(e):
    response = jsonify({
        'error': 'Internal server error',
        'message': str(e),
        'status': 'error'
    })
    return response, 500

@app.errorhandler(404)
def handle_404_error(e):
    response = jsonify({
        'error': 'Not found',
        'message': str(e),
        'status': 'error'
    })
    return response, 404@app.route('/api/schedules/<schedule_id>', methods=['GET', 'OPTIONS'])
def get_schedule_detail(schedule_id):
    if request.method == "OPTIONS":
        return '', 204

    try:
        print(f"Fetching schedule with ID: {schedule_id}")

        if not validate_object_id(schedule_id):
            return jsonify({'error': 'Invalid schedule ID format'}), 400

        schedule = schedules_collection.find_one({'_id': ObjectId(schedule_id)})
        
        if not schedule:
            return jsonify({'error': 'Schedule not found'}), 404

        formatted_schedule = format_schedule_response(schedule)
        if not formatted_schedule:
            return jsonify({'error': 'Error formatting schedule'}), 500

        return jsonify({'schedule': formatted_schedule})

    except Exception as e:
        print(f"Error fetching schedule: {str(e)}")
        return jsonify({'error': 'Failed to fetch schedule', 'message': str(e)}), 500

@app.route('/api/schedule', methods=['POST', 'OPTIONS'])
def create_schedule():
    if request.method == 'OPTIONS':
        return '', 204

    try:
        print("Received create schedule request")
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Extract and validate request data
        user_id = data.get('userId')
        playlist_url = data.get('playlistUrl')
        schedule_type = data.get('scheduleType')
        title = data.get('title', 'Untitled Schedule')
        completed_videos = data.get('completedVideos', [])
        last_day_number = data.get('lastDayNumber', 0)
        completed_video_details = data.get('completedVideoDetails', [])
        is_adjustment = data.get('isAdjustment', False)
        old_schedule_id = data.get('oldScheduleId')

        if not all([user_id, playlist_url, schedule_type]):
            return jsonify({'error': 'Missing required fields'}), 400

        try:
            validate_playlist_url(playlist_url)
        except ValueError as e:
            return jsonify({'error': str(e)}), 400

        # Fetch video details
        try:
            print("Fetching playlist details...")
            video_details = fetch_playlist_details(playlist_url)
            if not video_details:
                return jsonify({'error': 'No videos found in playlist'}), 400
            print(f"Found {len(video_details)} videos")
        except Exception as e:
            print(f"Error fetching playlist: {str(e)}")
            return jsonify({'error': f'Error fetching playlist: {str(e)}'}), 400

        # Generate schedule
        try:
            if schedule_type == 'daily':
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
            else:
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

            # Create MongoDB document
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
                        'videos': [
                            {
                                'title': video['title'],
                                'duration': video['duration'],
                                'link': video['link'],
                                'thumbnail': video['thumbnail'],
                                'completed': video['link'] in (completed_videos or [])
                            } for video in videos
                        ]
                    }
                    for day, videos in schedule.items()
                ],
                'summary': get_schedule_summary(schedule),
                'status': 'active',
                'created_at': datetime.now(),
                'updated_at': datetime.now()
            }

            # Handle schedule adjustment
            if is_adjustment and old_schedule_id:
                try:
                    old_schedule = schedules_collection.find_one({'_id': ObjectId(old_schedule_id)})
                    if old_schedule:
                        completed_map = {
                            video['link']: video['completed']
                            for day in old_schedule['schedule_data']
                            for video in day['videos']
                        }
                        for day in schedule_doc['schedule_data']:
                            for video in day['videos']:
                                if video['link'] in completed_map:
                                    video['completed'] = completed_map[video['link']]
                        
                        schedules_collection.delete_one({'_id': ObjectId(old_schedule_id)})
                except Exception as e:
                    print(f"Error handling adjustment: {str(e)}")
                    return jsonify({'error': f'Error handling schedule adjustment: {str(e)}'}), 500

            # Save to MongoDB
            result = schedules_collection.insert_one(schedule_doc)
            
            formatted_schedule = format_schedule_response(schedule_doc)
            return jsonify({
                'message': 'Schedule created successfully',
                'scheduleId': str(result.inserted_id),
                'schedule': formatted_schedule
            })

        except ValueError as e:
            return jsonify({'error': str(e)}), 400

    except Exception as e:
        print(f"Error creating schedule: {str(e)}")
        return jsonify({'error': 'Failed to create schedule', 'message': str(e)}), 500

@app.route('/api/schedules/<user_id>', methods=['GET', 'OPTIONS'])
def get_user_schedules(user_id):
    if request.method == 'OPTIONS':
        return '', 204

    try:
        if not validate_object_id(user_id):
            return jsonify({'error': 'Invalid user ID format'}), 400

        schedules = list(schedules_collection.find({'userId': ObjectId(user_id)}))
        formatted_schedules = [format_schedule_response(schedule) for schedule in schedules]
        formatted_schedules = [s for s in formatted_schedules if s is not None]  # Filter out None values
        
        return jsonify({'schedules': formatted_schedules})
    except Exception as e:
        print(f"Error fetching user schedules: {str(e)}")
        return jsonify({'error': 'Failed to fetch schedules', 'message': str(e)}), 500@app.route('/api/schedules/<schedule_id>/adjust', methods=['POST', 'OPTIONS'])
def adjust_schedule(schedule_id):
    if request.method == 'OPTIONS':
        return '', 204

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
            'oldScheduleId': schedule_id,
            'completedVideos': [],
            'completedVideoDetails': []
        }

        # Get completed videos information
        for day in old_schedule['schedule_data']:
            for video in day['videos']:
                if video.get('completed'):
                    adjustment_data['completedVideos'].append(video['link'])
                    adjustment_data['completedVideoDetails'].append(video)

        # Create new schedule
        request.json = adjustment_data
        return create_schedule()

    except Exception as e:
        print(f"Error adjusting schedule: {str(e)}")
        return jsonify({'error': 'Failed to adjust schedule', 'message': str(e)}), 500

@app.route('/api/schedules/<schedule_id>/progress', methods=['PUT', 'OPTIONS'])
def update_video_progress(schedule_id):
    if request.method == 'OPTIONS':
        return '', 204

    try:
        data = request.json
        if not data or 'videoId' not in data:
            return jsonify({'error': 'Video ID required'}), 400

        if not validate_object_id(schedule_id):
            return jsonify({'error': 'Invalid schedule ID format'}), 400

        video_id = data['videoId']
        completed = data.get('completed', True)
        
        # Update the video progress
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
            
        # Fetch updated schedule
        updated_schedule = schedules_collection.find_one({'_id': ObjectId(schedule_id)})
        formatted_schedule = format_schedule_response(updated_schedule)
        
        return jsonify({
            'message': 'Progress updated successfully',
            'schedule': formatted_schedule
        })

    except Exception as e:
        print(f"Error updating progress: {str(e)}")
        return jsonify({'error': 'Failed to update progress', 'message': str(e)}), 500

@app.route('/api/schedules/<schedule_id>/verify-video', methods=['POST', 'OPTIONS'])
def verify_video(schedule_id):
    if request.method == 'OPTIONS':
        return '', 204

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
        
        if not schedule:
            return jsonify({
                'exists': False,
                'message': 'Video not found in schedule'
            })

        # Find video details
        video_info = None
        day_info = None
        for day in schedule['schedule_data']:
            for video in day['videos']:
                if video['title'] == data['videoTitle']:
                    video_info = video
                    day_info = day
                    break
            if video_info:
                break

        return jsonify({
            'exists': True,
            'message': 'Video found in schedule',
            'video': video_info,
            'day': day_info['day'] if day_info else None
        })

    except Exception as e:
        print(f"Error verifying video: {str(e)}")
        return jsonify({'error': 'Failed to verify video', 'message': str(e)}), 500

@app.route('/api/schedules/<schedule_id>/video-context/<video_title>', methods=['GET', 'OPTIONS'])
def get_video_context(schedule_id, video_title):
    if request.method == 'OPTIONS':
        return '', 204

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
        day_info = None
        for day in schedule['schedule_data']:
            for video in day['videos']:
                if video['title'] == video_title:
                    video_info = video
                    day_info = day
                    break
            if video_info:
                break

        if not video_info:
            return jsonify({'error': 'Video details not found'}), 404

        return jsonify({
            'video': {
                'title': video_info['title'],
                'duration': video_info['duration'],
                'link': video_info['link'],
                'thumbnail': video_info['thumbnail'],
                'completed': video_info.get('completed', False)
            },
            'day': {
                'number': day_info['day'],
                'date': day_info['date']
            }
        })

    except Exception as e:
        print(f"Error fetching video context: {str(e)}")
        return jsonify({'error': 'Failed to fetch video context', 'message': str(e)}), 500

@app.route('/api/schedules/<schedule_id>', methods=['DELETE', 'OPTIONS'])
def delete_schedule(schedule_id):
    if request.method == 'OPTIONS':
        return '', 204

    try:
        if not validate_object_id(schedule_id):
            return jsonify({'error': 'Invalid schedule ID format'}), 400
        
        result = schedules_collection.delete_one({'_id': ObjectId(schedule_id)})
        if result.deleted_count == 0:
            return jsonify({'error': 'Schedule not found'}), 404
        
        return jsonify({'message': 'Schedule deleted successfully'})
    except Exception as e:
        print(f"Error deleting schedule: {str(e)}")
        return jsonify({'error': 'Failed to delete schedule', 'message': str(e)}), 500

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