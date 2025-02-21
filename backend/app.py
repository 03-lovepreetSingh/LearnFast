from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta
from model import (
    fetch_playlist_details,
    create_schedule_time_based,
    create_schedule_day_based,
    validate_playlist_url
)

app = Flask(__name__)
CORS(app)

@app.route('/api/schedule', methods=['POST'])
def create_schedule():
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        playlist_url = data.get('playlistUrl')
        schedule_type = data.get('scheduleType')
        
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

        if schedule_type == 'daily':
            try:
                daily_hours = float(data.get('dailyHours', 2))
                daily_minutes = int(daily_hours * 60)
                if daily_minutes <= 10:
                    return jsonify({'error': 'Daily study time must be greater than 10 minutes'}), 400
                schedule = create_schedule_time_based(video_details, daily_minutes)
            except ValueError as e:
                return jsonify({'error': str(e)}), 400
        else:
            try:
                target_days = int(data.get('targetDays', 7))
                if target_days <= 0:
                    return jsonify({'error': 'Target days must be greater than 0'}), 400
                schedule = create_schedule_day_based(video_details, target_days)
            except ValueError as e:
                return jsonify({'error': str(e)}), 400

        return jsonify(schedule)

    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat()
    })

if __name__ == '__main__':
    app.run(debug=True)