from flask import Flask, request, jsonify
from flask_cors import CORS
from model import fetch_playlist_details, create_schedule_time_based, create_schedule_day_based

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
        
        if not playlist_url:
            return jsonify({'error': 'Playlist URL is required'}), 400

        # Fetch video details from playlist
        video_details = fetch_playlist_details(playlist_url)

        if schedule_type == 'daily':
            daily_hours = data.get('dailyHours', 2)
            daily_minutes = int(daily_hours * 60)
            if daily_minutes <= 10:
                return jsonify({'error': 'Daily study time must be greater than 10 minutes'}), 400
            schedule = create_schedule_time_based(video_details, daily_minutes)
        else:
            target_days = data.get('targetDays', 7)
            if target_days <= 0:
                return jsonify({'error': 'Number of days must be greater than 0'}), 400
            schedule = create_schedule_day_based(video_details, target_days)

        return jsonify(schedule)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    app.run(debug=True)