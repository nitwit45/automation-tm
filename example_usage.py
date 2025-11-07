#!/usr/bin/env python3
"""
Example usage of DTM Bot
This script demonstrates various ways to use the bot
"""

from dtm_bot import DTMBot
from datetime import datetime

def example_basic_usage():
    """Basic usage example"""
    print("=== Basic Usage Example ===\n")
    
    # Initialize the bot
    bot = DTMBot()
    
    # Login (replace with your credentials)
    username = "your-email@example.com"
    password = "your-password"
    
    if bot.login(username, password):
        print("Login successful!\n")
        
        # Get task types
        task_types = bot.get_task_types()
        print(f"Found {len(task_types)} task types")
        
        # Get projects
        projects = bot.get_projects()
        print(f"Found {len(projects)} projects")
        
        # Start a task
        # Find PropTech project
        proptech_project = None
        for proj in projects:
            if 'PropTech' in proj['name']:
                proptech_project = proj
                break
        
        if proptech_project:
            # Find Development task type
            dev_task_type = None
            for tt in task_types:
                if tt['name'] == 'Development':
                    dev_task_type = tt
                    break
            
            if dev_task_type:
                # Start a development task
                success = bot.start_task(
                    task_type_id=dev_task_type['id'],
                    project_id=proptech_project['id'],
                    task_description="Example task - Working on mobile app features"
                )
                
                if success:
                    print("\n✓ Task started successfully!")
                    print("You can now end it from the home page or using bot.end_task()")


def example_with_categories():
    """Example with categories and activities"""
    print("\n=== Usage with Categories Example ===\n")
    
    bot = DTMBot()
    
    # Login
    if bot.login("your-email@example.com", "your-password"):
        
        # Get projects
        projects = bot.get_projects()
        proptech = next((p for p in projects if 'PropTech' in p['name']), None)
        
        if proptech:
            # Get categories for PropTech
            categories = bot.get_categories(proptech['id'])
            print(f"Found {len(categories)} categories for PropTech")
            
            # Find Mobile App category
            mobile_app = next((c for c in categories if 'Mobile' in c['name']), None)
            
            if mobile_app:
                # Get activities for Mobile App
                activities = bot.get_activities(proptech['id'], mobile_app['id'])
                print(f"Found {len(activities)} activities for Mobile App")
                
                # Find Development activity
                development = next((a for a in activities if 'Development' in a['name']), None)
                
                if development:
                    # Get task types
                    task_types = bot.get_task_types()
                    dev_type = next((t for t in task_types if t['name'] == 'Development'), None)
                    
                    if dev_type:
                        # Start task with full details
                        bot.start_task(
                            task_type_id=dev_type['id'],
                            project_id=proptech['id'],
                            task_description="Developing user authentication module",
                            category_id=mobile_app['id'],
                            activity_id=development['id']
                        )


def example_bug_fixing():
    """Example for starting a bug fixing task"""
    print("\n=== Bug Fixing Task Example ===\n")
    
    bot = DTMBot()
    
    if bot.login("your-email@example.com", "your-password"):
        task_types = bot.get_task_types()
        projects = bot.get_projects()
        
        # Find Bug Fixing task type
        bug_fixing = next((t for t in task_types if 'Bug Fixing' in t['name']), None)
        proptech = next((p for p in projects if 'PropTech' in p['name']), None)
        
        if bug_fixing and proptech:
            # Start bug fixing task with bug IDs
            bot.start_task(
                task_type_id=bug_fixing['id'],
                project_id=proptech['id'],
                task_description="Fixing login authentication issues",
                bug_id="1234,1235,1236"  # Multiple bug IDs
            )


def example_task_scheduling():
    """Example of scheduling tasks"""
    print("\n=== Task Scheduling Example ===\n")
    print("This shows how you could automate task creation")
    
    # You would need to install 'schedule' package: pip install schedule
    # import schedule
    # import time
    
    # def start_morning_task():
    #     bot = DTMBot()
    #     if bot.login("email", "password"):
    #         bot.start_task(...)
    
    # schedule.every().monday.at("09:00").do(start_morning_task)
    # schedule.every().tuesday.at("09:00").do(start_morning_task)
    
    print("See commented code in this function for scheduling implementation")


def example_end_task():
    """Example of ending a task"""
    print("\n=== End Task Example ===\n")
    
    bot = DTMBot()
    
    if bot.login("your-email@example.com", "your-password"):
        # End a specific task
        # You would get this task_id from your running tasks
        task_id = "f8f92b8f-a10a-46ee-918b-39030d95ba2d"
        
        # End the task
        bot.end_task(task_id)
        
        # You can also specify a custom end time
        # bot.end_task(task_id, end_datetime="2025-10-20T17:00:00")


def example_pause_task():
    """Example of pausing a task"""
    print("\n=== Pause Task Example ===\n")
    
    bot = DTMBot()
    
    if bot.login("your-email@example.com", "your-password"):
        task_id = "your-task-id-here"
        
        # Pause the task (e.g., for lunch break)
        bot.pause_task(task_id)


def example_daily_workflow():
    """Example of a complete daily workflow"""
    print("\n=== Daily Workflow Example ===\n")
    
    bot = DTMBot()
    
    if not bot.login("your-email@example.com", "your-password"):
        print("Login failed")
        return
    
    # Morning - Start daily task
    print("Morning: Starting development task...")
    task_types = bot.get_task_types()
    projects = bot.get_projects()
    
    dev_type = next((t for t in task_types if t['name'] == 'Development'), None)
    proptech = next((p for p in projects if 'PropTech' in p['name']), None)
    
    if dev_type and proptech:
        bot.start_task(
            task_type_id=dev_type['id'],
            project_id=proptech['id'],
            task_description="Daily development - Mobile app features"
        )
    
    # Later - you would end the task when done
    # bot.end_task(task_id)


def print_menu():
    """Print example menu"""
    print("\n" + "="*50)
    print("DTM Bot - Example Usage")
    print("="*50)
    print("\n1. Basic Usage")
    print("2. Usage with Categories and Activities")
    print("3. Bug Fixing Task")
    print("4. Task Scheduling")
    print("5. End Task")
    print("6. Pause Task")
    print("7. Daily Workflow")
    print("0. Exit")
    print("\nNote: Update credentials in the code before running")


if __name__ == "__main__":
    print_menu()
    
    choice = input("\nSelect an example to run (0-7): ")
    
    examples = {
        '1': example_basic_usage,
        '2': example_with_categories,
        '3': example_bug_fixing,
        '4': example_task_scheduling,
        '5': example_end_task,
        '6': example_pause_task,
        '7': example_daily_workflow
    }
    
    if choice in examples:
        print("\n" + "="*50)
        examples[choice]()
        print("\n" + "="*50)
    elif choice == '0':
        print("\nGoodbye!")
    else:
        print("\nInvalid choice!")

