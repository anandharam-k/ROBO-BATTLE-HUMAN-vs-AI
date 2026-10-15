"""
ROBO BATTLE — HUMAN vs AI
Python Flask Backend Service
APIs for Score Management, Match Verification, and Player Statistics
"""

import os
import sys
import json
from datetime import datetime

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from backend.python.database import init_db, add_score, get_top_scores, record_match, get_player_stats

# Try importing Flask; if not available, provide WSGI micro-app
try:
    from flask import Flask, request, jsonify
    from flask_cors import CORS
    HAS_FLASK = True
except ImportError:
    HAS_FLASK = False

if HAS_FLASK:
    app = Flask(__name__)
    CORS(app)

    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({
            "status": "online",
            "service": "Robo Battle Python API",
            "timestamp": datetime.utcnow().isoformat()
        })

    @app.route('/api/scores', methods=['GET', 'POST'])
    def handle_scores():
        if request.method == 'GET':
            limit = int(request.args.get('limit', 10))
            scores = get_top_scores(limit=limit)
            return jsonify({"success": True, "scores": scores})
        
        elif request.method == 'POST':
            data = request.get_json() or {}
            player_name = str(data.get("player_name", "CyberPilot")).strip()[:20]
            score = int(data.get("score", 0))
            kills = int(data.get("kills", 0))
            time_remaining = int(data.get("time_remaining", 0))
            accuracy = float(data.get("accuracy", 0.0))
            
            # Anti-tampering validation
            if kills > 15:
                return jsonify({"success": False, "error": "Invalid kills count. Maximum is 15."}), 400
            if time_remaining < 0 or time_remaining > 300:
                return jsonify({"success": False, "error": "Invalid time window. Must be between 0 and 300 seconds."}), 400
            
            # Validate mathematical consistency
            # Max possible score calculation: 15 kills (up to 500*3 + 250*7 + 150*5 = 1500+1750+750 = 4000)
            # + time remaining bonus (300*10 = 3000) + accuracy bonus (up to 1000) = ~8000
            if score > 15000:
                return jsonify({"success": False, "error": "Score exceeds physical match limits."}), 400

            inserted_id = add_score(player_name, score, kills, time_remaining, accuracy)
            return jsonify({
                "success": True,
                "message": "Score verified and recorded",
                "id": inserted_id,
                "verified": True
            })

    @app.route('/api/stats', methods=['GET'])
    def handle_stats():
        player_name = request.args.get('player')
        stats = get_player_stats(player_name=player_name)
        return jsonify({"success": True, "stats": stats})

    @app.route('/api/match-result', methods=['POST'])
    def handle_match_result():
        data = request.get_json() or {}
        record_match(data)
        return jsonify({"success": True, "message": "Match telemetry logged successfully"})

else:
    # Standard Python wsgiref fallback runner
    from wsgiref.simple_server import make_server
    import urllib.parse

    def application(environ, start_response):
        path = environ.get('PATH_INFO', '')
        method = environ.get('REQUEST_METHOD', 'GET')
        
        headers = [
            ('Content-Type', 'application/json'),
            ('Access-Control-Allow-Origin', '*'),
            ('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'),
            ('Access-Control-Allow-Headers', 'Content-Type')
        ]
        
        if method == 'OPTIONS':
            start_response('200 OK', headers)
            return [b'{}']
            
        if path == '/api/health':
            start_response('200 OK', headers)
            return [json.dumps({"status": "online", "service": "Robo Battle Python API (Native WSGI)"}).encode()]
            
        elif path == '/api/scores' and method == 'GET':
            scores = get_top_scores(10)
            start_response('200 OK', headers)
            return [json.dumps({"success": True, "scores": scores}).encode()]
            
        elif path == '/api/scores' and method == 'POST':
            try:
                content_length = int(environ.get('CONTENT_LENGTH', 0))
                body = environ['wsgi.input'].read(content_length)
                data = json.loads(body.decode('utf-8'))
                inserted_id = add_score(
                    data.get("player_name", "Pilot"),
                    data.get("score", 0),
                    data.get("kills", 0),
                    data.get("time_remaining", 0),
                    data.get("accuracy", 0.0)
                )
                start_response('200 OK', headers)
                return [json.dumps({"success": True, "id": inserted_id}).encode()]
            except Exception as e:
                start_response('400 Bad Request', headers)
                return [json.dumps({"success": False, "error": str(e)}).encode()]
                
        elif path == '/api/stats':
            stats = get_player_stats()
            start_response('200 OK', headers)
            return [json.dumps({"success": True, "stats": stats}).encode()]
            
        start_response('404 Not Found', headers)
        return [json.dumps({"error": "Not Found"}).encode()]

if __name__ == '__main__':
    init_db()
    port = int(os.environ.get("PORT", 5000))
    print(f"Starting Robo Battle Backend on port {port}...")
    if HAS_FLASK:
        app.run(host='0.0.0.0', port=port, debug=False)
    else:
        from wsgiref.simple_server import make_server
        server = make_server('0.0.0.0', port, application)
        print(f"WSGI server running on http://0.0.0.0:{port}")
        server.serve_forever()
