"""
SafeVoice Scanner - Database Module
Handles SQLite database operations for scan history logging.
"""

import sqlite3
import os
from datetime import datetime

# Database file path (same directory as this script)
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "safevoice.db")


def get_connection():
    """Create and return a database connection with row factory enabled."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize the database and create the scan_logs table if it doesn't exist."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scan_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT NOT NULL,
            scan_type TEXT NOT NULL DEFAULT 'url',
            result TEXT NOT NULL,
            heuristic_score INTEGER DEFAULT 0,
            api_result TEXT DEFAULT 'unknown',
            threat_types TEXT DEFAULT '',
            heuristic_flags TEXT DEFAULT '',
            timestamp TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()


def log_scan(url, scan_type, result, heuristic_score, api_result, threat_types, heuristic_flags):
    """
    Insert a new scan record into the database.

    Args:
        url: The scanned URL
        scan_type: 'url' or 'qr'
        result: 'safe' or 'dangerous'
        heuristic_score: Numeric risk score (0-100)
        api_result: 'safe', 'dangerous', or 'error'
        threat_types: Comma-separated threat type string
        heuristic_flags: Comma-separated heuristic flag string
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO scan_logs (url, scan_type, result, heuristic_score, api_result, threat_types, heuristic_flags, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        url,
        scan_type,
        result,
        heuristic_score,
        api_result,
        threat_types,
        heuristic_flags,
        datetime.now().isoformat()
    ))
    conn.commit()
    conn.close()


def get_history(limit=50):
    """
    Retrieve scan history ordered by most recent first.

    Args:
        limit: Maximum number of records to return (default 50)

    Returns:
        List of scan log dictionaries
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, url, scan_type, result, heuristic_score, api_result,
               threat_types, heuristic_flags, timestamp
        FROM scan_logs
        ORDER BY id DESC
        LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()

    # Convert Row objects to dictionaries
    return [dict(row) for row in rows]


def clear_history():
    """Delete all scan history records from the database."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM scan_logs")
    conn.commit()
    conn.close()
