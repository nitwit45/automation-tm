#!/usr/bin/env python3
"""
DTM GUI - Graphical User Interface for DTM Bot
Simple Tkinter-based GUI for task management
"""

try:
    import tkinter as tk
    from tkinter import ttk, messagebox, scrolledtext
    GUI_AVAILABLE = True
except ImportError:
    GUI_AVAILABLE = False
    print("Tkinter not available. Please install tkinter for GUI support.")

import json
import os
from datetime import datetime
from dtm_bot import DTMBot


class DTMGui:
    """GUI application for DTM Bot"""
    
    def __init__(self, root):
        self.root = root
        self.root.title("DTM Bot - Task Manager")
        self.root.geometry("800x700")
        
        self.bot = DTMBot()
        self.config_file = os.path.expanduser('~/.dtm_config.json')
        self.config = self.load_config()
        
        self.logged_in = False
        
        # Create main interface
        self.create_widgets()
        
        # Check if already configured
        if self.config.get('username'):
            self.username_entry.insert(0, self.config['username'])
    
    def load_config(self):
        """Load configuration"""
        if os.path.exists(self.config_file):
            try:
                with open(self.config_file, 'r') as f:
                    return json.load(f)
            except:
                return {}
        return {}
    
    def save_config(self):
        """Save configuration"""
        try:
            with open(self.config_file, 'w') as f:
                json.dump(self.config, f, indent=2)
        except Exception as e:
            self.log(f"Error saving configuration: {e}")
    
    def create_widgets(self):
        """Create GUI widgets"""
        
        # Create notebook for tabs
        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(fill='both', expand=True, padx=5, pady=5)
        
        # Login Tab
        self.login_frame = ttk.Frame(self.notebook)
        self.notebook.add(self.login_frame, text="Login")
        self.create_login_tab()
        
        # Start Task Tab
        self.start_frame = ttk.Frame(self.notebook)
        self.notebook.add(self.start_frame, text="Start Task")
        self.create_start_task_tab()
        
        # End Task Tab
        self.end_frame = ttk.Frame(self.notebook)
        self.notebook.add(self.end_frame, text="End Task")
        self.create_end_task_tab()
        
        # Log Tab
        self.log_frame = ttk.Frame(self.notebook)
        self.notebook.add(self.log_frame, text="Log")
        self.create_log_tab()
        
        # Status bar
        self.status_var = tk.StringVar()
        self.status_var.set("Not logged in")
        self.status_bar = ttk.Label(self.root, textvariable=self.status_var, 
                                    relief=tk.SUNKEN, anchor=tk.W)
        self.status_bar.pack(side=tk.BOTTOM, fill=tk.X)
    
    def create_login_tab(self):
        """Create login tab"""
        frame = ttk.LabelFrame(self.login_frame, text="Login Credentials", padding=20)
        frame.pack(fill='both', expand=True, padx=10, pady=10)
        
        # Username
        ttk.Label(frame, text="Username/Email:").grid(row=0, column=0, sticky=tk.W, pady=5)
        self.username_entry = ttk.Entry(frame, width=40)
        self.username_entry.grid(row=0, column=1, pady=5, padx=5)
        
        # Password
        ttk.Label(frame, text="Password:").grid(row=1, column=0, sticky=tk.W, pady=5)
        self.password_entry = ttk.Entry(frame, width=40, show="*")
        self.password_entry.grid(row=1, column=1, pady=5, padx=5)
        
        # Login button
        self.login_button = ttk.Button(frame, text="Login", command=self.do_login)
        self.login_button.grid(row=2, column=0, columnspan=2, pady=20)
        
        # Status
        self.login_status = ttk.Label(frame, text="", foreground="blue")
        self.login_status.grid(row=3, column=0, columnspan=2)
        
        # Info
        info_text = """
        After logging in, you can:
        - Start new tasks
        - End running tasks
        - View task history
        
        Your session will persist for the duration of this application.
        """
        info_label = ttk.Label(frame, text=info_text, justify=tk.LEFT, 
                              foreground="gray")
        info_label.grid(row=4, column=0, columnspan=2, pady=20)
    
    def create_start_task_tab(self):
        """Create start task tab"""
        frame = ttk.Frame(self.start_frame, padding=10)
        frame.pack(fill='both', expand=True)
        
        # Task Type
        ttk.Label(frame, text="Task Type:").grid(row=0, column=0, sticky=tk.W, pady=5)
        self.task_type_var = tk.StringVar()
        self.task_type_combo = ttk.Combobox(frame, textvariable=self.task_type_var, 
                                           width=50, state='readonly')
        self.task_type_combo.grid(row=0, column=1, pady=5, padx=5, sticky=tk.W)
        
        # Project
        ttk.Label(frame, text="Project:").grid(row=1, column=0, sticky=tk.W, pady=5)
        self.project_var = tk.StringVar()
        self.project_combo = ttk.Combobox(frame, textvariable=self.project_var, 
                                         width=50, state='readonly')
        self.project_combo.grid(row=1, column=1, pady=5, padx=5, sticky=tk.W)
        self.project_combo.bind('<<ComboboxSelected>>', self.on_project_select)
        
        # Category
        ttk.Label(frame, text="Category (optional):").grid(row=2, column=0, 
                                                           sticky=tk.W, pady=5)
        self.category_var = tk.StringVar()
        self.category_combo = ttk.Combobox(frame, textvariable=self.category_var, 
                                          width=50, state='readonly')
        self.category_combo.grid(row=2, column=1, pady=5, padx=5, sticky=tk.W)
        self.category_combo.bind('<<ComboboxSelected>>', self.on_category_select)
        
        # Activity
        ttk.Label(frame, text="Activity (optional):").grid(row=3, column=0, 
                                                           sticky=tk.W, pady=5)
        self.activity_var = tk.StringVar()
        self.activity_combo = ttk.Combobox(frame, textvariable=self.activity_var, 
                                          width=50, state='readonly')
        self.activity_combo.grid(row=3, column=1, pady=5, padx=5, sticky=tk.W)
        
        # Bug ID
        ttk.Label(frame, text="Bug ID (optional):").grid(row=4, column=0, 
                                                         sticky=tk.W, pady=5)
        self.bug_id_entry = ttk.Entry(frame, width=50)
        self.bug_id_entry.grid(row=4, column=1, pady=5, padx=5, sticky=tk.W)
        
        # Task Description
        ttk.Label(frame, text="Task Description:").grid(row=5, column=0, 
                                                        sticky=tk.NW, pady=5)
        self.task_desc_text = tk.Text(frame, width=50, height=5)
        self.task_desc_text.grid(row=5, column=1, pady=5, padx=5, sticky=tk.W)
        
        # Buttons
        button_frame = ttk.Frame(frame)
        button_frame.grid(row=6, column=0, columnspan=2, pady=20)
        
        ttk.Button(button_frame, text="Load Data", 
                  command=self.load_task_data).pack(side=tk.LEFT, padx=5)
        ttk.Button(button_frame, text="Start Task", 
                  command=self.start_task).pack(side=tk.LEFT, padx=5)
        ttk.Button(button_frame, text="Clear", 
                  command=self.clear_task_form).pack(side=tk.LEFT, padx=5)
    
    def create_end_task_tab(self):
        """Create end task tab"""
        frame = ttk.LabelFrame(self.end_frame, text="End Running Task", padding=20)
        frame.pack(fill='both', expand=True, padx=10, pady=10)
        
        ttk.Label(frame, text="Task ID:").grid(row=0, column=0, sticky=tk.W, pady=5)
        self.end_task_id_entry = ttk.Entry(frame, width=50)
        self.end_task_id_entry.grid(row=0, column=1, pady=5, padx=5)
        
        # Last task info
        if self.config.get('last_task'):
            last = self.config['last_task']
            info = f"Last started task:\n"
            info += f"  Type: {last.get('task_type')}\n"
            info += f"  Project: {last.get('project')}\n"
            info += f"  Description: {last.get('description')}\n"
            info += f"  Started: {last.get('started_at')}"
            
            info_label = ttk.Label(frame, text=info, justify=tk.LEFT, 
                                 foreground="blue")
            info_label.grid(row=1, column=0, columnspan=2, pady=10)
        
        # Buttons
        button_frame = ttk.Frame(frame)
        button_frame.grid(row=2, column=0, columnspan=2, pady=20)
        
        ttk.Button(button_frame, text="End Task", 
                  command=self.end_task).pack(side=tk.LEFT, padx=5)
        ttk.Button(button_frame, text="Pause Task", 
                  command=self.pause_task).pack(side=tk.LEFT, padx=5)
        
        # Help text
        help_text = """
        To end a task:
        1. Get the Task ID from the home page
        2. Enter it above
        3. Click 'End Task'
        
        Note: You can find the task ID in the URL when viewing 
        the task on the home page.
        """
        help_label = ttk.Label(frame, text=help_text, justify=tk.LEFT, 
                             foreground="gray")
        help_label.grid(row=3, column=0, columnspan=2)
    
    def create_log_tab(self):
        """Create log tab"""
        frame = ttk.Frame(self.log_frame, padding=10)
        frame.pack(fill='both', expand=True)
        
        # Log text area
        self.log_text = scrolledtext.ScrolledText(frame, width=80, height=30, 
                                                  wrap=tk.WORD)
        self.log_text.pack(fill='both', expand=True)
        
        # Clear log button
        ttk.Button(frame, text="Clear Log", 
                  command=self.clear_log).pack(pady=5)
        
        # Initial log message
        self.log("DTM Bot initialized")
        self.log(f"Configuration: {self.config_file}")
    
    def log(self, message):
        """Add message to log"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        log_message = f"[{timestamp}] {message}\n"
        if hasattr(self, 'log_text'):
            self.log_text.insert(tk.END, log_message)
            self.log_text.see(tk.END)
    
    def clear_log(self):
        """Clear log"""
        self.log_text.delete(1.0, tk.END)
        self.log("Log cleared")
    
    def do_login(self):
        """Perform login"""
        username = self.username_entry.get()
        password = self.password_entry.get()
        
        if not username or not password:
            messagebox.showerror("Error", "Please enter username and password")
            return
        
        self.login_status.config(text="Logging in...", foreground="blue")
        self.login_button.config(state='disabled')
        self.root.update()
        
        try:
            if self.bot.login(username, password):
                self.logged_in = True
                self.login_status.config(text="✓ Login successful!", 
                                       foreground="green")
                self.status_var.set(f"Logged in as {username}")
                
                # Save username (not password for security)
                self.config['username'] = username
                self.save_config()
                
                self.log(f"Logged in as {username}")
                
                # Load initial data
                self.load_task_data()
                
                messagebox.showinfo("Success", "Login successful!")
            else:
                self.login_status.config(text="✗ Login failed", 
                                       foreground="red")
                self.log("Login failed")
                messagebox.showerror("Error", "Login failed. Check credentials.")
        except Exception as e:
            self.login_status.config(text=f"✗ Error: {e}", 
                                   foreground="red")
            self.log(f"Login error: {e}")
            messagebox.showerror("Error", f"Login error: {e}")
        finally:
            self.login_button.config(state='normal')
    
    def load_task_data(self):
        """Load task types and projects"""
        if not self.logged_in:
            messagebox.showwarning("Warning", "Please login first")
            return
        
        self.log("Loading task types and projects...")
        
        try:
            # Load task types
            task_types = self.bot.get_task_types()
            if task_types:
                self.config['task_types'] = task_types
                names = [f"{tt['name']}" for tt in task_types]
                self.task_type_combo['values'] = names
                self.log(f"Loaded {len(task_types)} task types")
            
            # Load projects
            projects = self.bot.get_projects()
            if projects:
                self.config['projects'] = projects
                names = [f"{p['name']}" for p in projects]
                self.project_combo['values'] = names
                self.log(f"Loaded {len(projects)} projects")
            
            self.save_config()
            messagebox.showinfo("Success", "Data loaded successfully")
            
        except Exception as e:
            self.log(f"Error loading data: {e}")
            messagebox.showerror("Error", f"Error loading data: {e}")
    
    def on_project_select(self, event):
        """Handle project selection"""
        project_name = self.project_var.get()
        projects = self.config.get('projects', [])
        
        project = next((p for p in projects if p['name'] == project_name), None)
        if project:
            self.log(f"Loading categories for {project_name}...")
            try:
                categories = self.bot.get_categories(project['id'])
                if categories:
                    names = [c['name'] for c in categories]
                    self.category_combo['values'] = names
                    self.log(f"Loaded {len(categories)} categories")
            except Exception as e:
                self.log(f"Error loading categories: {e}")
    
    def on_category_select(self, event):
        """Handle category selection"""
        category_name = self.category_var.get()
        project_name = self.project_var.get()
        
        projects = self.config.get('projects', [])
        project = next((p for p in projects if p['name'] == project_name), None)
        
        if project:
            try:
                categories = self.bot.get_categories(project['id'])
                category = next((c for c in categories if c['name'] == category_name), 
                              None)
                
                if category:
                    self.log(f"Loading activities for {category_name}...")
                    activities = self.bot.get_activities(project['id'], 
                                                        category['id'])
                    if activities:
                        names = [a['name'] for a in activities]
                        self.activity_combo['values'] = names
                        self.log(f"Loaded {len(activities)} activities")
            except Exception as e:
                self.log(f"Error loading activities: {e}")
    
    def start_task(self):
        """Start a new task"""
        if not self.logged_in:
            messagebox.showwarning("Warning", "Please login first")
            return
        
        # Get values
        task_type_name = self.task_type_var.get()
        project_name = self.project_var.get()
        task_desc = self.task_desc_text.get(1.0, tk.END).strip()
        
        if not task_type_name or not project_name or not task_desc:
            messagebox.showerror("Error", 
                               "Please fill in Task Type, Project, and Description")
            return
        
        # Find IDs
        task_types = self.config.get('task_types', [])
        projects = self.config.get('projects', [])
        
        task_type = next((t for t in task_types if t['name'] == task_type_name), 
                        None)
        project = next((p for p in projects if p['name'] == project_name), None)
        
        if not task_type or not project:
            messagebox.showerror("Error", "Invalid task type or project")
            return
        
        # Optional fields
        category_id = None
        activity_id = None
        
        category_name = self.category_var.get()
        if category_name:
            categories = self.bot.get_categories(project['id'])
            category = next((c for c in categories if c['name'] == category_name), 
                          None)
            if category:
                category_id = category['id']
        
        activity_name = self.activity_var.get()
        if activity_name and category_id:
            activities = self.bot.get_activities(project['id'], category_id)
            activity = next((a for a in activities if a['name'] == activity_name), 
                          None)
            if activity:
                activity_id = activity['id']
        
        bug_id = self.bug_id_entry.get() or None
        
        # Confirm
        confirm_msg = f"Start task?\n\n"
        confirm_msg += f"Type: {task_type_name}\n"
        confirm_msg += f"Project: {project_name}\n"
        confirm_msg += f"Description: {task_desc[:100]}..."
        
        if not messagebox.askyesno("Confirm", confirm_msg):
            return
        
        # Start task
        self.log("Starting task...")
        try:
            success = self.bot.start_task(
                task_type_id=task_type['id'],
                project_id=project['id'],
                task_description=task_desc,
                category_id=category_id,
                activity_id=activity_id,
                bug_id=bug_id
            )
            
            if success:
                self.log("✓ Task started successfully!")
                
                # Save last task
                self.config['last_task'] = {
                    'task_type': task_type_name,
                    'project': project_name,
                    'description': task_desc,
                    'started_at': datetime.now().isoformat()
                }
                self.save_config()
                
                messagebox.showinfo("Success", "Task started successfully!")
                self.clear_task_form()
            else:
                self.log("✗ Failed to start task")
                messagebox.showerror("Error", "Failed to start task")
                
        except Exception as e:
            self.log(f"Error starting task: {e}")
            messagebox.showerror("Error", f"Error starting task: {e}")
    
    def clear_task_form(self):
        """Clear task form"""
        self.task_type_var.set('')
        self.project_var.set('')
        self.category_var.set('')
        self.activity_var.set('')
        self.bug_id_entry.delete(0, tk.END)
        self.task_desc_text.delete(1.0, tk.END)
    
    def end_task(self):
        """End a task"""
        if not self.logged_in:
            messagebox.showwarning("Warning", "Please login first")
            return
        
        task_id = self.end_task_id_entry.get().strip()
        if not task_id:
            messagebox.showerror("Error", "Please enter Task ID")
            return
        
        if not messagebox.askyesno("Confirm", f"End task {task_id}?"):
            return
        
        self.log(f"Ending task {task_id}...")
        try:
            success = self.bot.end_task(task_id)
            if success:
                self.log("✓ Task ended successfully!")
                messagebox.showinfo("Success", "Task ended successfully!")
                self.end_task_id_entry.delete(0, tk.END)
            else:
                self.log("✗ Failed to end task")
                messagebox.showerror("Error", "Failed to end task")
        except Exception as e:
            self.log(f"Error ending task: {e}")
            messagebox.showerror("Error", f"Error ending task: {e}")
    
    def pause_task(self):
        """Pause a task"""
        if not self.logged_in:
            messagebox.showwarning("Warning", "Please login first")
            return
        
        task_id = self.end_task_id_entry.get().strip()
        if not task_id:
            messagebox.showerror("Error", "Please enter Task ID")
            return
        
        if not messagebox.askyesno("Confirm", f"Pause task {task_id}?"):
            return
        
        self.log(f"Pausing task {task_id}...")
        try:
            success = self.bot.pause_task(task_id)
            if success:
                self.log("✓ Task paused successfully!")
                messagebox.showinfo("Success", "Task paused successfully!")
            else:
                self.log("✗ Failed to pause task")
                messagebox.showerror("Error", "Failed to pause task")
        except Exception as e:
            self.log(f"Error pausing task: {e}")
            messagebox.showerror("Error", f"Error pausing task: {e}")


def main():
    """Main entry point for GUI"""
    if not GUI_AVAILABLE:
        print("Tkinter is not available. Please install tkinter:")
        print("  Ubuntu/Debian: sudo apt-get install python3-tk")
        print("  Fedora: sudo dnf install python3-tkinter")
        print("  macOS: tkinter is included with Python")
        return
    
    root = tk.Tk()
    app = DTMGui(root)
    root.mainloop()


if __name__ == "__main__":
    main()

