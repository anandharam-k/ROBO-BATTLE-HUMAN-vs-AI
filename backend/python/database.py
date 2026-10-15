"""
ROBO BATTLE — HUMAN vs AI
SQLite Database Management Module
"""

import sqlite3
import os
import sys
import json
from datetime import datetime

DEFAULT_DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "database", "robobattle.db")

def get_connection(db_path=None):
    path = db_path or DEFAULT_DB_PATH
    os.makedirs(os.path.dirname(path), exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    return conn

def init_db(db_path=None):
    conn = get_connection(db_path)
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        matches_played INTEGER DEFAULT 0,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        total_kills INTEGER DEFAULT 0,
        high_score INTEGER DEFAULT 0
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS high_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_name TEXT NOT NULL,
        score INTEGER NOT NULL,
        kills INTEGER NOT NULL,
        enemies_total INTEGER DEFAULT 15,
        time_remaining INTEGER NOT NULL,
        accuracy REAL DEFAULT 0.0,
        match_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        verified INTEGER DEFAULT 1
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_name TEXT NOT NULL,
        result TEXT NOT NULL,
        score INTEGER NOT NULL,
        kills INTEGER NOT NULL,
        time_taken INTEGER NOT NULL,
        accuracy REAL DEFAULT 0.0,
        damage_dealt INTEGER DEFAULT 0,
        gestures_used INTEGER DEFAULT 0,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Seed with initial high scores if table is empty
    cursor.execute("SELECT COUNT(*) FROM high_scores")
    count = cursor.fetchone()[0]
    if count == 0:
        seed_data = [
            ("ApexPilot_01", 5420, 15, 142, 84.5),
            ("CyberViper", 4850, 15, 115, 79.0),
            ("NeonSpartan", 4200, 15, 94, 72.3),
            ("AegisCommander", 3650, 14, 0, 68.0),
            ("QuantumGhost", 3100, 12, 0, 64.2),
        ]
        for name, score, kills, time_rem, acc in seed_data:
            cursor.execute("""
                INSERT INTO high_scores (player_name, score, kills, time_remaining, accuracy)
                VALUES (?, ?, ?, ?, ?)
            """, (name, score, kills, time_rem, acc))
            cursor.execute("""
                INSERT OR IGNORE INTO players (username, matches_played, wins, total_kills, high_score)
                VALUES (?, 1, 1, ?, ?)
            """, (name, kills, score))
    conn.commit()
    conn.close()
    return True

def add_score(player_name, score, kills, time_remaining, accuracy, enemies_total=15, db_path=None):
    conn = get_connection(db_path)
    cursor = conn.cursor()

    # Server-side validation
    if kills > enemies_total:
        kills = enemies_total
    if time_remaining < 0:
        time_remaining = 0
    if time_remaining > 300:
        time_remaining = 300

    cursor.execute("""
        INSERT INTO high_scores (player_name, score, kills, enemies_total, time_remaining, accuracy)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (player_name, int(score), int(kills), int(enemies_total), int(time_remaining), float(accuracy)))

    # Update or insert player stats
    cursor.execute("SELECT * FROM players WHERE username = ?", (player_name,))
    player = cursor.fetchone()
    if player:
        new_high = max(player["high_score"], int(score))
        cursor.execute("""
            UPDATE players
            SET matches_played = matches_played + 1,
                wins = wins + (CASE WHEN ? >= 15 THEN 1 ELSE 0 END),
                losses = losses + (CASE WHEN ? < 15 THEN 1 ELSE 0 END),
                total_kills = total_kills + ?,
                high_score = ?
            WHERE username = ?
        """, (kills, kills, kills, new_high, player_name))
    else:
        cursor.execute("""
            INSERT INTO players (username, matches_played, wins, losses, total_kills, high_score)
            VALUES (?, 1, (CASE WHEN ? >= 15 THEN 1 ELSE 0 END), (CASE WHEN ? < 15 THEN 1 ELSE 0 END), ?, ?)
        """, (player_name, kills, kills, kills, int(score)))

    conn.commit()
    inserted_id = cursor.lastrowid
    conn.close()
    return inserted_id

def get_top_scores(limit=10, db_path=None):
    conn = get_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, player_name, score, kills, enemies_total, time_remaining, accuracy, match_date
        FROM high_scores
        ORDER BY score DESC, kills DESC, time_remaining DESC
        LIMIT ?
    """, (limit,))
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows

def record_match(match_data, db_path=None):
    conn = get_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO matches (player_name, result, score, kills, time_taken, accuracy, damage_dealt, gestures_used)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        match_data.get("player_name", "Commander"),
        match_data.get("result", "defeat"),
        int(match_data.get("score", 0)),
        int(match_data.get("kills", 0)),
        int(match_data.get("time_taken", 300)),
        float(match_data.get("accuracy", 0.0)),
        int(match_data.get("damage_dealt", 0)),
        int(match_data.get("gestures_used", 0))
    ))
    conn.commit()
    conn.close()
    return True

def get_player_stats(player_name=None, db_path=None):
    conn = get_connection(db_path)
    cursor = conn.cursor()
    if player_name:
        cursor.execute("SELECT * FROM players WHERE username = ?", (player_name,))
        player = cursor.fetchone()
        if player:
            conn.close()
            return dict(player)

    # General community statistics
    cursor.execute("""
        SELECT 
            COUNT(*) as total_matches,
            SUM(CASE WHEN result = 'victory' THEN 1 ELSE 0 END) as total_victories,
            SUM(kills) as total_kills,
            AVG(score) as avg_score,
            MAX(score) as record_score,
            AVG(accuracy) as avg_accuracy
        FROM matches
    """)
    stats = dict(cursor.fetchone() or {})
    conn.close()
    return stats

if __name__ == "__main__":
    init_db()
    if len(sys.argv) > 1:
        cmd = sys.argv[1]
        if cmd == "scores":
            print(json.dumps(get_top_scores()))
        elif cmd == "stats":
            print(json.dumps(get_player_stats()))
        elif cmd == "add" and len(sys.argv) >= 6:
            name = sys.argv[2]
            score = int(sys.argv[3])
            kills = int(sys.argv[4])
            time_rem = int(sys.argv[5])
            acc = float(sys.argv[6]) if len(sys.argv) > 6 else 50.0
            add_score(name, score, kills, time_rem, acc)
            print(f"Added score for {name}")
    else:
        print("Database initialized successfully at:", DEFAULT_DB_PATH)
