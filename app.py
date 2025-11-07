#!/usr/bin/env python3
"""
Flask API Backend for DTM Bot
Modern web interface for task management
"""

from flask import Flask, render_template, jsonify, request, session
from dtm_bot import DTMBot
from datetime import datetime, timedelta
import json
import os

app = Flask(__name__)
app.secret_key = os.urandom(24)

# Bot instance will be stored per session
bots = {}

def get_bot():
    """Get or create bot instance for current session"""
    session_id = session.get('session_id')
    if session_id and session_id in bots:
        return bots[session_id]
    return None

def create_bot():
    """Create new bot instance"""
    session_id = os.urandom(16).hex()
    session['session_id'] = session_id
    bots[session_id] = DTMBot()
    return bots[session_id]

@app.route('/')
def index():
    """Main page"""
    return render_template('index.html')

@app.route('/api/login', methods=['POST'])
def login():
    """Login endpoint"""
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'success': False, 'message': 'Username and password required'}), 400
    
    bot = create_bot()
    
    if bot.login(username, password):
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'username': username
        })
    else:
        return jsonify({
            'success': False,
            'message': 'Invalid credentials'
        }), 401

@app.route('/api/logout', methods=['POST'])
def logout():
    """Logout endpoint"""
    session_id = session.get('session_id')
    if session_id and session_id in bots:
        del bots[session_id]
    session.clear()
    return jsonify({'success': True, 'message': 'Logged out'})

@app.route('/api/task-types', methods=['GET'])
def get_task_types():
    """Get available task types"""
    bot = get_bot()
    if not bot:
        return jsonify({'success': False, 'message': 'Not logged in'}), 401
    
    task_types = bot.get_task_types()
    return jsonify({'success': True, 'data': task_types})

@app.route('/api/projects', methods=['GET'])
def get_projects():
    """Get available projects"""
    bot = get_bot()
    if not bot:
        return jsonify({'success': False, 'message': 'Not logged in'}), 401
    
    projects = bot.get_projects()
    return jsonify({'success': True, 'data': projects})

@app.route('/api/categories/<project_id>', methods=['GET'])
def get_categories(project_id):
    """Get categories for a project"""
    bot = get_bot()
    if not bot:
        return jsonify({'success': False, 'message': 'Not logged in'}), 401
    
    categories = bot.get_categories(project_id)
    return jsonify({'success': True, 'data': categories})

@app.route('/api/activities/<project_id>/<category_id>', methods=['GET'])
def get_activities(project_id, category_id):
    """Get activities for a project and category"""
    bot = get_bot()
    if not bot:
        return jsonify({'success': False, 'message': 'Not logged in'}), 401
    
    activities = bot.get_activities(project_id, category_id)
    return jsonify({'success': True, 'data': activities})

@app.route('/api/tasks/start', methods=['POST'])
def start_task():
    """Start a new task"""
    bot = get_bot()
    if not bot:
        return jsonify({'success': False, 'message': 'Not logged in'}), 401
    
    data = request.json
    
    success = bot.start_task(
        task_type_id=data.get('task_type_id'),
        project_id=data.get('project_id'),
        task_description=data.get('description'),
        category_id=data.get('category_id'),
        activity_id=data.get('activity_id'),
        bug_id=data.get('bug_id'),
        start_datetime=data.get('start_datetime')
    )
    
    if success:
        return jsonify({
            'success': True,
            'message': 'Task started successfully'
        })
    else:
        return jsonify({
            'success': False,
            'message': 'Failed to start task'
        }), 400

@app.route('/api/tasks/end/<task_id>', methods=['POST'])
def end_task(task_id):
    """End a task"""
    bot = get_bot()
    if not bot:
        return jsonify({'success': False, 'message': 'Not logged in'}), 401
    
    data = request.json or {}
    end_datetime = data.get('end_datetime')
    
    success = bot.end_task(task_id, end_datetime)
    
    if success:
        return jsonify({
            'success': True,
            'message': 'Task ended successfully'
        })
    else:
        return jsonify({
            'success': False,
            'message': 'Failed to end task'
        }), 400

@app.route('/api/tasks/pause/<task_id>', methods=['POST'])
def pause_task(task_id):
    """Pause a task"""
    bot = get_bot()
    if not bot:
        return jsonify({'success': False, 'message': 'Not logged in'}), 401
    
    data = request.json or {}
    pause_datetime = data.get('pause_datetime')
    
    success = bot.pause_task(task_id, pause_datetime)
    
    if success:
        return jsonify({
            'success': True,
            'message': 'Task paused successfully'
        })
    else:
        return jsonify({
            'success': False,
            'message': 'Failed to pause task'
        }), 400

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    """Get tasks for a specific date"""
    bot = get_bot()
    if not bot:
        return jsonify({'success': False, 'message': 'Not logged in'}), 401
    
    search_date = request.args.get('date', datetime.now().strftime('%Y-%m-%d'))
    
    result = bot.get_my_tasks(search_date)
    return jsonify(result)

@app.route('/api/tasks/ongoing', methods=['GET'])
def get_ongoing_tasks():
    """Get ongoing/active tasks"""
    bot = get_bot()
    if not bot:
        return jsonify({'success': False, 'message': 'Not logged in'}), 401

    # Check the last 7 days for ongoing tasks (since tasks can span multiple days)
    ongoing_tasks = []
    today = datetime.now()

    for days_back in range(7):  # Check last 7 days
        check_date = (today - timedelta(days=days_back)).strftime('%Y-%m-%d')
        result = bot.get_my_tasks(check_date)

        if result and result.get('success'):
            if result.get('raw_response') and result['raw_response'].get('data'):
                for task_row in result['raw_response']['data']:
                    # Check if task status contains "On Going" or "Pause"
                    if len(task_row) > 8:  # Ensure we have status field
                        status = task_row[8] if isinstance(task_row[8], str) else ''
                        if 'On Going' in status or 'Pause' in status or 'on going' in status.lower():
                            # Avoid duplicates by checking task ID
                            task_id = task_row[0] if len(task_row) > 0 else None
                            if task_id and not any(t[0] == task_id for t in ongoing_tasks):
                                ongoing_tasks.append(task_row)

    return jsonify({
        'success': True,
        'tasks': ongoing_tasks,
        'count': len(ongoing_tasks),
        'checked_days': 7
    })

@app.route('/api/status', methods=['GET'])
def get_status():
    """Check login status"""
    bot = get_bot()
    if bot:
        return jsonify({
            'success': True,
            'logged_in': True
        })
    else:
        return jsonify({
            'success': False,
            'logged_in': False
        })

if __name__ == '__main__':
    print("""
╔══════════════════════════════════════════╗
║    DTM Bot - Modern Web Interface        ║
║                                          ║
║    http://localhost:5000                 ║
╚══════════════════════════════════════════╝
    """)
    app.run(debug=True, host='0.0.0.0', port=5000)

