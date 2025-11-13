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
- **Bulk Upload**: Upload multiple tasks via CSV file
- **Calendar View**: Visual task tracking
- **Secure Login**: Session-based authentication
- **Real-time Updates**: Live task status
- **Mobile Friendly**: Works on desktop and mobile

### Bulk Upload Feature
Upload multiple tasks at once using a CSV file. Perfect for:
- Adding historical tasks
- Planning tasks for multiple days
- Importing tasks from other systems

See [BULK_UPLOAD_GUIDE.md](BULK_UPLOAD_GUIDE.md) for detailed instructions.

## API Endpoints

- `GET /` - Main dashboard
- `POST /api/login` - User authentication
- `POST /api/tasks/start` - Start new task
- `POST /api/tasks/end/<task_id>` - End task
- `GET /api/tasks` - Get tasks for date
- `GET /api/tasks/csv-template` - Download CSV template for bulk upload
- `POST /api/tasks/bulk-upload` - Upload multiple tasks via CSV file

## Production URL

When running on server: `http://72.60.20.140:5000`
