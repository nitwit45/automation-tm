#!/usr/bin/env python3
"""
Flask API Backend for DTM Bot
Modern web interface for task management
"""

from flask import Flask, render_template, jsonify, request, session, send_file
from dtm_bot import DTMBot
from datetime import datetime, timedelta
import json
import os
import csv
import io
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.secret_key = os.urandom(24)

# Bot instance will be stored per session
bots = {}

def get_bot():
    """Get or create bot instance for current session"""
    session_id = session.get('session_id')
    if session_id and session_id in bots:
        bot = bots[session_id]
        # Check if DTM session is still valid
        if not bot.is_session_valid():
            print(f"  DTM session invalid, clearing session {session_id}")
            try:
                del bots[session_id]
            except KeyError:
                # Session already cleared by another concurrent request
                pass
            session.clear()
            return None
        return bot
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

@app.route('/api/tasks/resume/<task_id>', methods=['POST'])
def resume_task(task_id):
    """Resume a paused task"""
    bot = get_bot()
    if not bot:
        return jsonify({'success': False, 'message': 'Not logged in'}), 401
    
    data = request.json or {}
    resume_datetime = data.get('resume_datetime')
    
    success = bot.resume_task(task_id, resume_datetime)
    
    if success:
        return jsonify({
            'success': True,
            'message': 'Task resumed successfully'
        })
    else:
        return jsonify({
            'success': False,
            'message': 'Failed to resume task'
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
                    # Check if task status contains "On Going", "Pause", or "On Hold"
                    if len(task_row) > 8:  # Ensure we have status field
                        status = task_row[8] if isinstance(task_row[8], str) else ''
                        status_lower = status.lower()
                        if 'on going' in status_lower or 'pause' in status_lower or 'on hold' in status_lower or 'hold' in status_lower:
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

@app.route('/api/tasks/csv-template', methods=['GET'])
def download_csv_template():
    """Download CSV template for bulk task upload"""
    bot = get_bot()
    if not bot:
        return jsonify({'success': False, 'message': 'Not logged in'}), 401
    
    # Create CSV template with headers and example data
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write headers
    writer.writerow([
        'task_type',
        'project',
        'category',
        'activity',
        'description',
        'start_date',
        'start_time',
        'end_time'
    ])
    
    # Write example row with actual values from the system
    writer.writerow([
        'Development',
        'PropTech',
        'Mobile App',
        'Development',
        'Example task description',
        '2025-11-13',
        '09:00',
        '10:00'
    ])
    
    # Create a bytes buffer for the file
    output.seek(0)
    byte_output = io.BytesIO()
    byte_output.write(output.getvalue().encode('utf-8'))
    byte_output.seek(0)
    
    return send_file(
        byte_output,
        mimetype='text/csv',
        as_attachment=True,
        download_name='dtm_tasks_template.csv'
    )

@app.route('/api/tasks/bulk-upload', methods=['POST'])
def bulk_upload_tasks():
    """Upload CSV file with multiple tasks"""
    bot = get_bot()
    if not bot:
        return jsonify({'success': False, 'message': 'Not logged in'}), 401
    
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file provided'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'success': False, 'message': 'No file selected'}), 400
    
    if not file.filename.endswith('.csv'):
        return jsonify({'success': False, 'message': 'File must be a CSV'}), 400
    
    try:
        # Read CSV file
        stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
        csv_reader = csv.DictReader(stream)
        
        tasks = []
        errors = []
        row_num = 1
        
        # Get reference data for validation
        task_types = bot.get_task_types()
        projects = bot.get_projects()
        
        # Create lookup dictionaries
        task_type_map = {tt['name'].lower(): tt['id'] for tt in task_types}
        project_map = {p['name'].lower(): p['id'] for p in projects}
        
        for row in csv_reader:
            row_num += 1
            
            # Validate required fields
            if not row.get('task_type'):
                errors.append(f"Row {row_num}: task_type is required")
                continue
            
            if not row.get('project'):
                errors.append(f"Row {row_num}: project is required")
                continue
            
            if not row.get('description'):
                errors.append(f"Row {row_num}: description is required")
                continue
            
            if not row.get('start_date'):
                errors.append(f"Row {row_num}: start_date is required")
                continue
            
            if not row.get('start_time'):
                errors.append(f"Row {row_num}: start_time is required")
                continue
            
            if not row.get('end_time'):
                errors.append(f"Row {row_num}: end_time is required")
                continue
            
            # Find task type ID
            task_type_name = row['task_type'].strip().lower()
            task_type_id = task_type_map.get(task_type_name)
            
            if not task_type_id:
                errors.append(f"Row {row_num}: Invalid task_type '{row['task_type']}'")
                continue
            
            # Find project ID
            project_name = row['project'].strip().lower()
            project_id = project_map.get(project_name)
            
            if not project_id:
                errors.append(f"Row {row_num}: Invalid project '{row['project']}'")
                continue
            
            # Get category and activity IDs if provided
            category_id = None
            activity_id = None
            
            if row.get('category') and row['category'].strip():
                categories = bot.get_categories(project_id)
                category_map = {c['name'].lower(): c['id'] for c in categories}
                category_id = category_map.get(row['category'].strip().lower())
            
            if row.get('activity') and row['activity'].strip() and category_id:
                activities = bot.get_activities(project_id, category_id)
                activity_map = {a['name'].lower(): a['id'] for a in activities}
                activity_id = activity_map.get(row['activity'].strip().lower())
            
            # Parse dates and times
            try:
                start_date = row['start_date'].strip()
                start_time = row['start_time'].strip()
                end_time = row['end_time'].strip()
                
                # Validate date format
                datetime.strptime(start_date, '%Y-%m-%d')
                
                # Validate time formats (support HH:MM or HH:MM:SS)
                if len(start_time.split(':')) == 2:
                    start_time += ':00'
                if len(end_time.split(':')) == 2:
                    end_time += ':00'
                
                # Parse times to validate them
                start_time_obj = datetime.strptime(start_time, '%H:%M:%S')
                end_time_obj = datetime.strptime(end_time, '%H:%M:%S')
                
                # Combine date and time for start datetime
                start_datetime = f"{start_date} {start_time}"
                
                # Convert end_time to 12-hour format with AM/PM for end_task method
                end_time_12hr = end_time_obj.strftime('%I:%M %p')
                end_datetime = f"{start_date} {end_time_12hr}"
                
            except ValueError as e:
                errors.append(f"Row {row_num}: Invalid date/time format - {str(e)}")
                continue
            
            # Add task to the list
            tasks.append({
                'row_num': row_num,
                'task_type_id': task_type_id,
                'project_id': project_id,
                'category_id': category_id,
                'activity_id': activity_id,
                'description': row['description'].strip(),
                'start_datetime': start_datetime,
                'end_datetime': end_datetime
            })
        
        # Return validation results without processing if there are errors
        if errors:
            return jsonify({
                'success': False,
                'message': 'Validation errors found',
                'errors': errors,
                'valid_tasks': len(tasks)
            }), 400
        
        # Process tasks one by one
        results = []
        for task in tasks:
            try:
                # Start the task
                success = bot.start_task(
                    task_type_id=task['task_type_id'],
                    project_id=task['project_id'],
                    category_id=task['category_id'],
                    activity_id=task['activity_id'],
                    task_description=task['description'],
                    start_datetime=task['start_datetime']
                )
                
                if success:
                    # Get the task ID from the most recent task
                    # We need to fetch the task to get its ID so we can end it
                    start_date = task['start_datetime'].split()[0]
                    tasks_result = bot.get_my_tasks(start_date)
                    
                    task_id = None
                    if tasks_result and tasks_result.get('success'):
                        if tasks_result.get('raw_response') and tasks_result['raw_response'].get('data'):
                            # Get the most recent task (should be the one we just created)
                            recent_tasks = tasks_result['raw_response']['data']
                            if recent_tasks:
                                task_id = recent_tasks[0][0]  # First column is task ID
                    
                    # End the task if we found its ID
                    if task_id:
                        bot.end_task(task_id, task['end_datetime'])
                        results.append({
                            'row': task['row_num'],
                            'success': True,
                            'message': 'Task created and completed'
                        })
                    else:
                        results.append({
                            'row': task['row_num'],
                            'success': True,
                            'message': 'Task created but could not auto-complete',
                            'warning': 'Could not find task ID'
                        })
                else:
                    results.append({
                        'row': task['row_num'],
                        'success': False,
                        'message': 'Failed to create task'
                    })
                    
            except Exception as e:
                results.append({
                    'row': task['row_num'],
                    'success': False,
                    'message': f'Error: {str(e)}'
                })
        
        # Count successes and failures
        successes = sum(1 for r in results if r['success'])
        failures = len(results) - successes
        
        return jsonify({
            'success': True,
            'message': f'Processed {len(results)} tasks',
            'stats': {
                'total': len(results),
                'success': successes,
                'failed': failures
            },
            'results': results
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error processing CSV: {str(e)}'
        }), 500

if __name__ == '__main__':
    print("""
╔══════════════════════════════════════════╗
║    DTM Bot - Modern Web Interface        ║
║                                          ║
║    http://localhost:5000                 ║
╚══════════════════════════════════════════╝
    """)
    app.run(debug=True, host='0.0.0.0', port=5000)

