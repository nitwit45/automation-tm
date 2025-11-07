# DTM Bot - Task Manager

A modern web interface for automated task management.

## Quick Start

1. **Install dependencies:**
   ```bash
   pipenv install
   ```

2. **Run the web app:**
   ```bash
   pipenv run python app.py
   ```

3. **Open in browser:**
   ```
   http://localhost:5000
   ```

## Service Management

For production use, the app runs as a systemd service:

```bash
# Check status
./manage_service.sh status

# Restart service
./manage_service.sh restart

# View logs
./manage_service.sh logs

# Start/stop service
./manage_service.sh start
./manage_service.sh stop
```

## Features

- **Task Management**: Start, pause, and end tasks
- **Calendar View**: Visual task tracking
- **Secure Login**: Session-based authentication
- **Real-time Updates**: Live task status
- **Mobile Friendly**: Works on desktop and mobile

## API Endpoints

- `GET /` - Main dashboard
- `POST /api/login` - User authentication
- `POST /api/tasks/start` - Start new task
- `POST /api/tasks/end/<task_id>` - End task
- `GET /api/tasks` - Get tasks for date

## Production URL

When running on server: `http://72.60.20.140:5000`
