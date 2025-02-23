# app.py

from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta
from pymongo import MongoClient
from bson import ObjectId
import os
from dotenv import load_dotenv
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
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# MongoDB connection
MONGO_URI = os.getenv('MONGODB_URI')
client = MongoClient(MONGO_URI)
db = client['your_database_name']  # Replace with your database name
schedules_collection = db.schedules

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

@app.route('/api/health', methods=['GET'])
def health_check():
    try:
        # Check MongoDB connection
        client.admin.command('ping')
        return jsonify({
            'status': 'healthy',
            'database': 'connected',
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'database': 'disconnected',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)