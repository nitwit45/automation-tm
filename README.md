# DTM Bot - Modern Task Manager

A complete solution for automated task management with a beautiful web interface.

## ✨ Features

- 🎨 **Modern Web UI** - Beautiful calendar-based interface
- 🔐 **Secure Authentication** - CSRF token handling & session management
- ✅ **Task Management** - Start, pause, and end tasks with ease
- 📅 **Calendar Integration** - Visual task tracking and scheduling
- 🎯 **Real-time Updates** - Live task status and notifications
- 📱 **Responsive Design** - Works on desktop and mobile
- ⚡ **Fast & Lightweight** - Built with Flask and modern JavaScript
- 🎨 **Dark Theme** - Beautiful dark UI with gradient accents

## Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Make scripts executable:
```bash
chmod +x dtm_bot.py dtm_cli.py dtm_gui.py
```

## Quick Test

Test if the bot works with your credentials:

```bash
python run_test.py
```

You should see:
```
✓ Login successful!
Found 23 task types
Found 45 projects
Bot is ready!
```

## Quick Start a Task

Test starting a task immediately:

```bash
python quick_start.py
```

This will start a test task for "Testing DTM Bot - Mobile app development"

## Programmatic Usage

You can also use the bot in your Python scripts:

```python
from dtm_bot import DTMBot

# Initialize bot
bot = DTMBot()

# Login
bot.login('your-email@example.com', 'your-password')

# Get available task types
task_types = bot.get_task_types()
print(f"Found {len(task_types)} task types")

# Get available projects
projects = bot.get_projects()
print(f"Found {len(projects)} projects")

# Start a task
bot.start_task(
    task_type_id='f9a90956-da1a-11ee-be37-000c294719a8',  # Development
    project_id='37894d6b-507e-11ef-b808-000c294719a8',     # PropTech
    task_description='Working on mobile app features',
    category_id='37c0d4e9-507e-11ef-b808-000c294719a8',   # Mobile App
    activity_id='37c38772-507e-11ef-b808-000c294719a8'    # Development
)

# End a task
bot.end_task('task-uuid-here')

# Pause a task
bot.pause_task('task-uuid-here')
```

## Example Workflow

### Morning - Start your day

```bash
# Start a development task
python dtm_cli.py start -i

# Select:
# - Task Type: Development
# - Project: PropTech
# - Category: Mobile App
# - Activity: Development
# - Description: Implementing user authentication
```

### During the day - Switch tasks

```bash
# End current task
python dtm_cli.py end current-task-id

# Start new task
python dtm_cli.py start -t "Bug Fixing" -p "PropTech" -d "Fixing login issues"
```

### End of day - Close your task

```bash
# End the task
python dtm_cli.py end task-id-here
```

## Advanced Usage

### Python Interactive Mode

For experimentation and testing:

```bash
python -i dtm_bot.py
```

Then in the Python shell:

```python
# Bot is already initialized as 'bot'
bot.login('your-email', 'your-password')
bot.get_task_types()
bot.start_task(...)
```

### Custom Scripts

Create your own automation scripts:

```python
# my_task_automation.py
from dtm_bot import DTMBot
import schedule
import time

bot = DTMBot()
bot.login('email', 'password')

def start_daily_task():
    """Start a daily task at 9 AM"""
    bot.start_task(
        task_type_id='development-id',
        project_id='proptech-id',
        task_description='Daily development work'
    )

# Schedule task to start at 9 AM
schedule.every().day.at("09:00").do(start_daily_task)

while True:
    schedule.run_pending()
    time.sleep(60)
```

## Configuration

Configuration is stored in `~/.dtm_config.json`:

```json
{
  "username": "your-email@example.com",
  "task_types": [...],
  "projects": [...],
  "last_task": {
    "task_type": "Development",
    "project": "PropTech",
    "description": "Working on features",
    "started_at": "2025-10-20T10:00:00"
  }
}
```

**Note:** For security, avoid saving passwords in the config file. The bot will prompt for password if not saved.

## API Reference

### DTMBot Class

#### Methods

- `login(username, password)` - Login to DTM system
- `get_task_types()` - Get available task types
- `get_projects()` - Get available projects
- `get_categories(project_id)` - Get categories for a project
- `get_activities(project_id, category_id)` - Get activities
- `start_task(...)` - Start a new task
- `end_task(task_id, end_datetime=None)` - End a task
- `pause_task(task_id, pause_datetime=None)` - Pause a task
- `get_my_tasks(search_date=None)` - Get your tasks for a date

## Troubleshooting

### Login Issues

If you're having trouble logging in:

1. Verify credentials are correct
2. Check if you can login through the web interface
3. Ensure the base URL is correct (default: `https://dtm.payable.lk`)

### Task Not Starting

If tasks aren't starting:

1. Run `python dtm_cli.py setup` to refresh task types and projects
2. Verify you have access to the selected project
3. Check if all required fields are provided

### Configuration Issues

Delete the config file and run setup again:

```bash
rm ~/.dtm_config.json
python dtm_cli.py setup
```

## Security Notes

- **Don't commit credentials** to version control
- Use environment variables for sensitive data in production
- Consider using a password manager integration
- The bot stores session cookies temporarily during runtime

## Future Enhancements

Planned features for future versions:

- [ ] GUI interface with tkinter or PyQt
- [ ] Browser automation with Selenium (if API endpoints change)
- [ ] Task templates for common workflows
- [ ] Time tracking and reporting
- [ ] Integration with calendar apps
- [ ] Desktop notifications
- [ ] Mobile app companion

## License

This is a utility tool for internal use. Check with your organization's policies before use.

## Contributing

To add new features:

1. Create a new branch
2. Implement your feature
3. Test thoroughly
4. Submit for review

## Support

For issues or questions:
- Check the troubleshooting section
- Review the example scripts
- Contact your system administrator

---

**Version:** 1.0.0  
**Last Updated:** October 2025

