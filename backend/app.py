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
client = MongoClient(MONGO_URI)
db = client['your_database_name']  # Replace with your database name
schedules_collection = db.schedules

# Configure Gemini
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel('gemini-pro')

# Middleware for handling preflight requests
@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        response = make_response()
        response.headers.add("Access-Control-Allow-Origin", "http://localhost:3000")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS")
        response.headers.add("Access-Control-Allow-Credentials", "true")
        return response

def get_chat_prompt(message: str, video_title: Optional[str] = None, mode: str = 'general') -> str:
    """Generate appropriate prompt based on chat mode and context"""
    if mode == 'video':
        return f"""You are an AI tutor focusing specifically on the video: "{video_title}".
        Please answer the following question in the context of this video only: {message}
        If the question isn't directly related to this video, kindly remind the user that you're
        currently focused on discussing this specific video."""
    else:
        return f"""You are an AI learning assistant helping with educational content.
        Please answer the following question: {message}"""

def format_gemini_response(response) -> str:
    """Format and clean Gemini API response"""
    try:
        text = response.text.replace('```', '').strip()
        max_length = 1000
        if len(text) > max_length:
            text = text[:max_length] + "... (response truncated)"
        return text
    except Exception as e:
        return f"I apologize, but I encountered an error processing the response: {str(e)}"

def format_schedule_for_db(schedule, user_id, playlist_url, schedule_type, settings, title="Untitled Schedule"):
    """Format schedule data for MongoDB storage"""
    schedule_data = []
    current_date = datetime.now()
    
    for day, videos in schedule.items():
        day_number = int(day.split()[1])
        schedule_data.append({
            'day': day,
            'date': (current_date + timedelta(days=day_number - 1)).strftime('%Y-%m-%d'),
            'videos': [{**video, 'completed': False} for video in videos]
        })

    summary = get_schedule_summary(schedule)
    
    return {
        'userId': ObjectId(user_id),
        'title': title,
        'playlist_url': playlist_url,
        'schedule_type': schedule_type,
        'settings': settings,
        'schedule_data': schedule_data,
        'summary': summary,
        'status': 'active',
        'created_at': datetime.now(),
        'updated_at': datetime.now()
    }

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

        # Validate required fields
        if not user_id:
            return jsonify({'error': 'User ID is required'}), 400
        
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
        schedule_doc = format_schedule_for_db(
            schedule=schedule,
            user_id=user_id,
            playlist_url=playlist_url,
            schedule_type=schedule_type,
            settings=settings,
            title=title
        )

        # Save to MongoDB
        result = schedules_collection.insert_one(schedule_doc)
        
        # Get schedule summary
        summary = get_schedule_summary(schedule)

        return jsonify({
            'message': 'Schedule created successfully',
            'scheduleId': str(result.inserted_id),
            'schedule': schedule,
            'summary': summary
        })

    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/chat', methods=['POST', 'OPTIONS'])
def chat():
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    try:
        data = request.json
        if not data or 'message' not in data:
            return jsonify({'error': 'Message is required'}), 400

        message = data.get('message')
        video_title = data.get('videoTitle')
        mode = data.get('mode', 'general')

        # Generate prompt based on mode
        prompt = get_chat_prompt(message, video_title, mode)

        # Get response from Gemini
        try:
            response = model.generate_content(prompt)
            formatted_response = format_gemini_response(response)
            
            return jsonify({
                'response': formatted_response,
                'status': 'success'
            })
        except Exception as e:
            return jsonify({
                'error': f'Error generating response: {str(e)}',
                'status': 'error'
            }), 500

    except Exception as e:
        return jsonify({
            'error': f'Server error: {str(e)}',
            'status': 'error'
        }), 500

@app.route('/api/schedules/<user_id>', methods=['GET', 'OPTIONS'])
def get_user_schedules(user_id):
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    try:
        # Convert string user_id to ObjectId
        user_object_id = ObjectId(user_id)
        
        # Fetch schedules from MongoDB
        schedules = list(schedules_collection.find({'userId': user_object_id}))
        
        # Convert ObjectId to string for JSON serialization
        for schedule in schedules:
            schedule['_id'] = str(schedule['_id'])
            schedule['userId'] = str(schedule['userId'])
            # Convert datetime objects to ISO format strings
            schedule['created_at'] = schedule['created_at'].isoformat()
            schedule['updated_at'] = schedule['updated_at'].isoformat()
        
        return jsonify({'schedules': schedules})
    except Exception as e:
        return jsonify({'error': f'Error fetching schedules: {str(e)}'}), 500

@app.route('/api/schedules/detail/<schedule_id>', methods=['GET', 'OPTIONS'])
def get_schedule_detail(schedule_id):
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    try:
        # Convert string schedule_id to ObjectId
        schedule_object_id = ObjectId(schedule_id)
        
        # Fetch schedule from MongoDB
        schedule = schedules_collection.find_one({'_id': schedule_object_id})
        
        if not schedule:
            return jsonify({'error': 'Schedule not found'}), 404
            
        # Convert ObjectId to string for JSON serialization
        schedule['_id'] = str(schedule['_id'])
        schedule['userId'] = str(schedule['userId'])
        
        # Convert datetime objects to ISO format strings
        schedule['created_at'] = schedule['created_at'].isoformat()
        schedule['updated_at'] = schedule['updated_at'].isoformat()
        
        # Format dates in schedule_data
        for day_schedule in schedule['schedule_data']:
            if isinstance(day_schedule['date'], datetime):
                day_schedule['date'] = day_schedule['date'].strftime('%Y-%m-%d')
        
        return jsonify({'schedule': schedule})
    except Exception as e:
        return jsonify({'error': f'Error fetching schedule: {str(e)}'}), 500

@app.route('/api/schedules/<schedule_id>', methods=['DELETE', 'OPTIONS'])
def delete_schedule(schedule_id):
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    try:
        # Convert string schedule_id to ObjectId
        schedule_object_id = ObjectId(schedule_id)
        
        # Delete schedule from MongoDB
        result = schedules_collection.delete_one({'_id': schedule_object_id})
        
        if result.deleted_count == 0:
            return jsonify({'error': 'Schedule not found'}), 404
            
        return jsonify({'message': 'Schedule deleted successfully'})
    except Exception as e:
        return jsonify({'error': f'Error deleting schedule: {str(e)}'}), 500

@app.route('/api/schedules/<schedule_id>/progress', methods=['PUT', 'OPTIONS'])
def update_video_progress(schedule_id):
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    try:
        data = request.json
        if not data or 'videoId' not in data:
            return jsonify({'error': 'Video ID is required'}), 400
            
        video_id = data['videoId']
        completed = data.get('completed', True)
        
        # Convert string schedule_id to ObjectId
        schedule_object_id = ObjectId(schedule_id)
        
        # Update video completion status
        result = schedules_collection.update_one(
            {
                '_id': schedule_object_id,
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
        return jsonify({'error': f'Error updating progress: {str(e)}'}), 500

@app.route('/api/schedules/<schedule_id>/verify-video', methods=['POST', 'OPTIONS'])
def verify_video(schedule_id):
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    try:
        data = request.json
        if not data or 'videoTitle' not in data:
            return jsonify({'error': 'Video title is required'}), 400

        video_title = data['videoTitle']
        schedule_object_id = ObjectId(schedule_id)
        
        # Check if video exists in schedule
        schedule = schedules_collection.find_one({
            '_id': schedule_object_id,
            'schedule_data.videos.title': video_title
        })
        
        if not schedule:
            return jsonify({
                'exists': False,
                'message': 'Video not found in schedule'
            })
            
        return jsonify({
            'exists': True,
            'message': 'Video found in schedule'
        })

    except Exception as e:
        return jsonify({'error': f'Error verifying video: {str(e)}'}), 500

@app.route('/api/schedules/<schedule_id>/video-context/<video_title>', methods=['GET', 'OPTIONS'])
def get_video_context(schedule_id, video_title):
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    try:
        schedule_object_id = ObjectId(schedule_id)
        
        # Find the video in the schedule
        schedule = schedules_collection.find_one({
            '_id': schedule_object_id,
            'schedule_data.videos.title': video_title
        })
        
        if not schedule:
            return jsonify({'error': 'Video not found'}), 404

        # Extract video details
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
        return jsonify({'error': f'Error fetching video context: {str(e)}'}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    try:
        # Check MongoDB connection
        client.admin.command('ping')
        
        # Check Gemini API connection
        try:
            test_response = model.generate_content("Test connection")
            gemini_status = "connected"
        except Exception as e:
            gemini_status = f"disconnected (Error: {str(e)})"

        return jsonify({
            'status': 'healthy',
            'database': 'connected',
            'gemini_api': gemini_status,
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'database': 'disconnected',
            'gemini_api': 'unknown',
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
    print("Starting LearnFast API Server")
    print(f"MongoDB URI: {MONGO_URI[:20]}..." if MONGO_URI else "MongoDB URI not set")
    print(f"Gemini API Key: {'*' * 20}" if GOOGLE_API_KEY else "Gemini API Key not set")
    print("\nAPI Routes:")
    print("============")
    for rule in app.url_map.iter_rules():
        if rule.endpoint != 'static':
            print(f"{rule.rule} [{', '.join(rule.methods - {'OPTIONS', 'HEAD'})}]")
    print("\nServer is running in development mode")
    
    app.run(debug=True, port=5000)