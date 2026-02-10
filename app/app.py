from flask import Flask, request, render_template, jsonify, redirect, url_for, flash
import datetime
import json
import logging
import sqlite3
import os
import time

app = Flask(__name__)
app.secret_key = 'super_secret_key_change_me' # For flash messages

# Database setup
DB_PATH = 'webhook.db'

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS endpoints (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            response_status INTEGER DEFAULT 200,
            response_body TEXT DEFAULT '{"status": "ok"}',
            response_content_type TEXT DEFAULT 'application/json',
            delay_ms INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.execute('''
        CREATE TABLE IF NOT EXISTS requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            endpoint_id INTEGER,
            method TEXT,
            headers TEXT,
            body TEXT,
            query_params TEXT,
            remote_addr TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (endpoint_id) REFERENCES endpoints (id)
        )
    ''')
    conn.commit()
    conn.close()

# Initialize DB on startup
if not os.path.exists(DB_PATH):
    init_db()
else:
    # Ensure tables exist even if file exists (migration check simplified)
    init_db()

# Helper to format body for display
@app.template_filter('format_json')
def format_json(value):
    try:
        return json.dumps(json.loads(value), indent=2)
    except:
        return value

@app.route('/')
def index():
    conn = get_db_connection()
    endpoints = conn.execute('SELECT * FROM endpoints ORDER BY created_at DESC').fetchall()
    conn.close()
    return render_template('index.html', endpoints=endpoints)

@app.route('/create', methods=['POST'])
def create_endpoint():
    name = request.form['name']
    slug = request.form['slug']
    
    if not slug:
        slug = name.lower().replace(' ', '-')
        
    conn = get_db_connection()
    try:
        conn.execute('INSERT INTO endpoints (name, slug) VALUES (?, ?)', (name, slug))
        conn.commit()
        flash('Endpoint created successfully!', 'success')
    except sqlite3.IntegrityError:
        flash('Endpoint slug already exists!', 'error')
    finally:
        conn.close()
        
    return redirect(url_for('index'))

@app.route('/endpoint/<int:endpoint_id>')
def view_endpoint(endpoint_id):
    conn = get_db_connection()
    endpoint = conn.execute('SELECT * FROM endpoints WHERE id = ?', (endpoint_id,)).fetchone()
    requests_log = conn.execute('SELECT * FROM requests WHERE endpoint_id = ? ORDER BY timestamp DESC LIMIT 50', (endpoint_id,)).fetchall()
    conn.close()
    
    if not endpoint:
        return "Endpoint not found", 404
        
    return render_template('endpoint.html', endpoint=endpoint, requests=requests_log)

@app.route('/endpoint/<int:endpoint_id>/update', methods=['POST'])
def update_endpoint(endpoint_id):
    conn = get_db_connection()
    conn.execute('''
        UPDATE endpoints 
        SET response_status = ?, response_body = ?, response_content_type = ?, delay_ms = ?
        WHERE id = ?
    ''', (
        request.form['response_status'],
        request.form['response_body'],
        request.form['response_content_type'],
        request.form['delay_ms'],
        endpoint_id
    ))
    conn.commit()
    conn.close()
    flash('Settings updated!', 'success')
    return redirect(url_for('view_endpoint', endpoint_id=endpoint_id))

@app.route('/endpoint/<int:endpoint_id>/clear', methods=['POST'])
def clear_requests(endpoint_id):
    conn = get_db_connection()
    conn.execute('DELETE FROM requests WHERE endpoint_id = ?', (endpoint_id,))
    conn.commit()
    conn.close()
    flash('History cleared!', 'success')
    return redirect(url_for('view_endpoint', endpoint_id=endpoint_id))

@app.route('/hook/<slug>', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
def webhook_receiver(slug):
    conn = get_db_connection()
    endpoint = conn.execute('SELECT * FROM endpoints WHERE slug = ?', (slug,)).fetchone()
    
    if not endpoint:
        conn.close()
        return jsonify({"error": "Endpoint not found"}), 404
        
    # Process request data
    headers = dict(request.headers)
    body_content = request.get_data(as_text=True)
    query_params = dict(request.args)
    
    # Save to DB
    conn.execute('''
        INSERT INTO requests (endpoint_id, method, headers, body, query_params, remote_addr)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (
        endpoint['id'],
        request.method,
        json.dumps(headers),
        body_content,
        json.dumps(query_params),
        request.remote_addr
    ))
    conn.commit()
    
    # Handle response settings
    status = endpoint['response_status']
    body = endpoint['response_body']
    content_type = endpoint['response_content_type']
    delay = endpoint['delay_ms']
    
    conn.close()
    
    if delay > 0:
        time.sleep(delay / 1000.0)
        
    return body, status, {'Content-Type': content_type}

if __name__ == '__main__':
    # Ensure DB is ready
    init_db()
    app.run(host='0.0.0.0', port=5000)
