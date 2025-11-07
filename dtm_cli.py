#!/usr/bin/env python3
"""
DTM CLI - Command Line Interface for DTM Bot
Easy-to-use command line interface for task management
"""

import argparse
import json
import os
from datetime import datetime
from getpass import getpass
from dtm_bot import DTMBot


class DTMCli:
    """CLI interface for DTM Bot"""
    
    def __init__(self):
        self.bot = DTMBot()
        self.config_file = os.path.expanduser('~/.dtm_config.json')
        self.config = self.load_config()
    
    def load_config(self):
        """Load configuration from file"""
        if os.path.exists(self.config_file):
            try:
                with open(self.config_file, 'r') as f:
                    return json.load(f)
            except:
                return {}
        return {}
    
    def save_config(self):
        """Save configuration to file"""
        try:
            with open(self.config_file, 'w') as f:
                json.dump(self.config, f, indent=2)
            print(f"✓ Configuration saved to {self.config_file}")
        except Exception as e:
            print(f"✗ Error saving configuration: {e}")
    
    def setup(self):
        """Interactive setup"""
        print("\n=== DTM Bot Setup ===\n")
        
        username = input("Enter your username/email: ")
        password = getpass("Enter your password: ")
        
        print("\nAttempting login...")
        if self.bot.login(username, password):
            save_creds = input("\nSave credentials? (not recommended for security) [y/N]: ")
            if save_creds.lower() == 'y':
                self.config['username'] = username
                self.config['password'] = password
            
            # Fetch and save common data
            print("\nFetching task types...")
            task_types = self.bot.get_task_types()
            if task_types:
                self.config['task_types'] = task_types
                print(f"  Found {len(task_types)} task types")
            
            print("\nFetching projects...")
            projects = self.bot.get_projects()
            if projects:
                self.config['projects'] = projects
                print(f"  Found {len(projects)} projects")
            
            self.save_config()
            print("\n✓ Setup complete!")
        else:
            print("\n✗ Setup failed. Please check your credentials.")
    
    def login(self, username=None, password=None):
        """Login to DTM"""
        if not username:
            username = self.config.get('username')
        if not password:
            password = self.config.get('password')
        
        if not username or not password:
            print("Error: No credentials provided. Run 'setup' first.")
            return False
        
        return self.bot.login(username, password)
    
    def list_task_types(self):
        """List available task types"""
        task_types = self.config.get('task_types', [])
        
        if not task_types:
            print("Fetching task types...")
            task_types = self.bot.get_task_types()
        
        if task_types:
            print("\n=== Available Task Types ===\n")
            for i, tt in enumerate(task_types, 1):
                print(f"{i:2d}. {tt['name']}")
                print(f"    ID: {tt['id']}")
        else:
            print("No task types found.")
    
    def list_projects(self):
        """List available projects"""
        projects = self.config.get('projects', [])
        
        if not projects:
            print("Fetching projects...")
            projects = self.bot.get_projects()
        
        if projects:
            print("\n=== Available Projects ===\n")
            for i, proj in enumerate(projects, 1):
                print(f"{i:2d}. {proj['name']}")
                print(f"    ID: {proj['id']}")
        else:
            print("No projects found.")
    
    def start_task_interactive(self):
        """Interactive task start"""
        print("\n=== Start New Task ===\n")
        
        # Login if needed
        if not self.login():
            return
        
        # Select task type
        task_types = self.bot.get_task_types() or self.config.get('task_types', [])
        if not task_types:
            print("Error: No task types available")
            return
        
        print("\nSelect Task Type:")
        for i, tt in enumerate(task_types, 1):
            print(f"{i:2d}. {tt['name']}")
        
        tt_idx = int(input("\nEnter task type number: ")) - 1
        task_type = task_types[tt_idx]
        
        # Select project
        projects = self.bot.get_projects() or self.config.get('projects', [])
        if not projects:
            print("Error: No projects available")
            return
        
        print("\nSelect Project:")
        for i, proj in enumerate(projects, 1):
            print(f"{i:2d}. {proj['name']}")
        
        proj_idx = int(input("\nEnter project number: ")) - 1
        project = projects[proj_idx]
        
        # Get categories
        categories = self.bot.get_categories(project['id'])
        category = None
        if categories:
            print("\nSelect Category (or press Enter to skip):")
            for i, cat in enumerate(categories, 1):
                print(f"{i:2d}. {cat['name']}")
            
            cat_input = input("\nEnter category number (or press Enter): ")
            if cat_input:
                cat_idx = int(cat_input) - 1
                category = categories[cat_idx]
        
        # Get activities
        activity = None
        if category:
            activities = self.bot.get_activities(project['id'], category['id'])
            if activities:
                print("\nSelect Activity (or press Enter to skip):")
                for i, act in enumerate(activities, 1):
                    print(f"{i:2d}. {act['name']}")
                
                act_input = input("\nEnter activity number (or press Enter): ")
                if act_input:
                    act_idx = int(act_input) - 1
                    activity = activities[act_idx]
        
        # Get task description
        task_desc = input("\nEnter task description: ")
        
        # Bug ID if needed
        bug_id = None
        if 'bug' in task_type['name'].lower():
            bug_id = input("\nEnter bug ID (optional): ")
        
        # Confirm
        print("\n=== Task Summary ===")
        print(f"Task Type: {task_type['name']}")
        print(f"Project: {project['name']}")
        if category:
            print(f"Category: {category['name']}")
        if activity:
            print(f"Activity: {activity['name']}")
        print(f"Description: {task_desc}")
        if bug_id:
            print(f"Bug ID: {bug_id}")
        
        confirm = input("\nStart this task? [Y/n]: ")
        if confirm.lower() != 'n':
            # Start the task
            success = self.bot.start_task(
                task_type_id=task_type['id'],
                project_id=project['id'],
                task_description=task_desc,
                category_id=category['id'] if category else None,
                activity_id=activity['id'] if activity else None,
                bug_id=bug_id if bug_id else None
            )
            
            if success:
                # Save last task info
                self.config['last_task'] = {
                    'task_type': task_type['name'],
                    'project': project['name'],
                    'description': task_desc,
                    'started_at': datetime.now().isoformat()
                }
                self.save_config()
    
    def start_task_quick(self, task_type_name, project_name, description):
        """Quick start task with saved preferences"""
        if not self.login():
            return
        
        # Find task type
        task_types = self.bot.get_task_types() or self.config.get('task_types', [])
        task_type = None
        for tt in task_types:
            if task_type_name.lower() in tt['name'].lower():
                task_type = tt
                break
        
        if not task_type:
            print(f"Error: Task type '{task_type_name}' not found")
            return
        
        # Find project
        projects = self.bot.get_projects() or self.config.get('projects', [])
        project = None
        for proj in projects:
            if project_name.lower() in proj['name'].lower():
                project = proj
                break
        
        if not project:
            print(f"Error: Project '{project_name}' not found")
            return
        
        # Start task
        success = self.bot.start_task(
            task_type_id=task_type['id'],
            project_id=project['id'],
            task_description=description
        )
        
        if success:
            self.config['last_task'] = {
                'task_type': task_type['name'],
                'project': project['name'],
                'description': description,
                'started_at': datetime.now().isoformat()
            }
            self.save_config()
    
    def end_task(self, task_id):
        """End a specific task"""
        if not self.login():
            return
        
        print(f"\nEnding task {task_id}...")
        self.bot.end_task(task_id)
    
    def show_last_task(self):
        """Show last started task"""
        last_task = self.config.get('last_task')
        if last_task:
            print("\n=== Last Task ===")
            print(f"Task Type: {last_task.get('task_type')}")
            print(f"Project: {last_task.get('project')}")
            print(f"Description: {last_task.get('description')}")
            print(f"Started at: {last_task.get('started_at')}")
        else:
            print("No last task found.")


def main():
    """Main CLI entry point"""
    parser = argparse.ArgumentParser(
        description='DTM Bot - Command Line Interface for Task Management'
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Setup command
    subparsers.add_parser('setup', help='Initial setup and configuration')
    
    # List commands
    subparsers.add_parser('list-tasks', help='List available task types')
    subparsers.add_parser('list-projects', help='List available projects')
    
    # Start task commands
    start_parser = subparsers.add_parser('start', help='Start a new task')
    start_parser.add_argument('--interactive', '-i', action='store_true', 
                             help='Interactive mode')
    start_parser.add_argument('--type', '-t', help='Task type name')
    start_parser.add_argument('--project', '-p', help='Project name')
    start_parser.add_argument('--description', '-d', help='Task description')
    
    # End task command
    end_parser = subparsers.add_parser('end', help='End a running task')
    end_parser.add_argument('task_id', help='Task ID to end')
    
    # Show last task
    subparsers.add_parser('last', help='Show last started task')
    
    args = parser.parse_args()
    
    cli = DTMCli()
    
    if args.command == 'setup':
        cli.setup()
    elif args.command == 'list-tasks':
        cli.list_task_types()
    elif args.command == 'list-projects':
        cli.list_projects()
    elif args.command == 'start':
        if args.interactive or not (args.type and args.project and args.description):
            cli.start_task_interactive()
        else:
            cli.start_task_quick(args.type, args.project, args.description)
    elif args.command == 'end':
        cli.end_task(args.task_id)
    elif args.command == 'last':
        cli.show_last_task()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()

