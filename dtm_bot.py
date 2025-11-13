#!/usr/bin/env python3
"""
DTM Bot - Daily Task Monitor Bot
A bot to start and end tasks programmatically
"""

import requests
import json
from datetime import datetime
from typing import Optional, Dict, List
import sys


class DTMBot:
    """Bot for interacting with Daily Task Monitor system"""
    
    def __init__(self, base_url: str = "https://dtm.payable.lk"):
        self.base_url = base_url
        self.session = requests.Session()
        self.csrf_token = None
        self.task_types = []
        self.projects = []
        self.categories = []
        self.activities = []
        
    def _get_csrf_token(self) -> None:
        """Refresh CSRF token from the home page"""
        try:
            # Get home page to refresh CSRF token
            home_page = self.session.get(f"{self.base_url}/home")

            if home_page.status_code == 200 and 'csrf-token' in home_page.text:
                start = home_page.text.find('csrf-token') + len('csrf-token" content="')
                end = home_page.text.find('"', start)
                self.csrf_token = home_page.text[start:end]
                print(f"  ✓ CSRF token refreshed: {self.csrf_token[:20]}...")
            else:
                print("  ⚠ Could not refresh CSRF token, using existing one")
        except Exception as e:
            print(f"  ⚠ Error refreshing CSRF token: {e}")

    def is_session_valid(self) -> bool:
        """Check if the current DTM session is still valid"""
        try:
            # Try to access the home page
            response = self.session.get(f"{self.base_url}/home", allow_redirects=True)

            print(f"  Session check: status={response.status_code}, url={response.url}")

            # Check for success indicators (same as login method)
            if response.status_code == 200:
                response_text = response.text.lower()
                has_logout = 'logout' in response_text
                is_home_url = '/home' in response.url
                has_login_form = 'login' in response_text and ('form' in response_text or 'password' in response_text)

                print(f"  Session check details: logout={has_logout}, home_url={is_home_url}, login_form={has_login_form}")

                # Valid session indicators: logout link present, or we're on home page
                if has_logout or is_home_url:
                    print("  ✓ Session is valid")
                    return True

                # If we see login form elements but no logout, session is invalid
                if has_login_form:
                    print("  ✗ Session is invalid (login form detected)")
                    return False

            # If we get redirected to login page, session is invalid
            if response.status_code in [301, 302, 303] and 'login' in response.headers.get('Location', '').lower():
                print("  ✗ Session is invalid (redirect to login)")
                return False

            # If final URL contains login, session is invalid
            if 'login' in response.url.lower():
                print("  ✗ Session is invalid (final URL contains login)")
                return False

            # Default to invalid if we can't determine
            print("  ✗ Session validation inconclusive, defaulting to invalid")
            return False

        except Exception as e:
            print(f"  ⚠ Error checking session validity: {e}")
            return False

    def login(self, username: str, password: str) -> bool:
        """Login to the DTM system"""
        try:
            print(f"Attempting to login as {username}...")
            
            # Get login page to retrieve CSRF token
            login_page = self.session.get(f"{self.base_url}/login")
            
            if login_page.status_code != 200:
                print(f"✗ Failed to load login page. Status: {login_page.status_code}")
                return False
            
            # Extract CSRF token from the page
            if 'csrf-token' in login_page.text:
                start = login_page.text.find('csrf-token') + len('csrf-token" content="')
                end = login_page.text.find('"', start)
                self.csrf_token = login_page.text[start:end]
                print(f"  CSRF token retrieved: {self.csrf_token[:20]}...")
            else:
                print("✗ Could not find CSRF token")
                return False
            
            # Perform login with correct field names
            login_data = {
                'sys_login_user': username,
                'sys_login_pwd': password,
                '_token': self.csrf_token
            }
            
            print("  Sending login request...")
            response = self.session.post(
                f"{self.base_url}/login", 
                data=login_data,
                allow_redirects=True
            )
            
            # Check if login was successful
            # Success indicators: redirect to /home or presence of logout link
            if response.status_code == 200:
                if 'logout' in response.text.lower() or '/home' in response.url:
                    print("✓ Login successful!")
                    print(f"  Session established")
                    # Update CSRF token from the new page if available
                    if 'csrf-token' in response.text:
                        start = response.text.find('csrf-token') + len('csrf-token" content="')
                        end = response.text.find('"', start)
                        self.csrf_token = response.text[start:end]
                    return True
                else:
                    print("✗ Login failed - Invalid credentials or access denied")
                    return False
            else:
                print(f"✗ Login failed - Status code: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"✗ Login error: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def get_task_types(self) -> List[Dict]:
        """Fetch available task types"""
        try:
            response = self.session.get(
                f"{self.base_url}/taskTypeList",
                params={'status': 1, '_token': self.csrf_token}
            )
            
            if response.status_code == 200:
                self.task_types = response.json()
                return self.task_types
            return []
        except Exception as e:
            print(f"Error fetching task types: {e}")
            return []
    
    def get_projects(self) -> List[Dict]:
        """Fetch available projects"""
        try:
            response = self.session.get(
                f"{self.base_url}/productList",
                params={'status': 1, '_token': self.csrf_token}
            )
            
            if response.status_code == 200:
                self.projects = response.json()
                return self.projects
            return []
        except Exception as e:
            print(f"Error fetching projects: {e}")
            return []
    
    def get_categories(self, project_id: str) -> List[Dict]:
        """Fetch categories for a specific project"""
        try:
            response = self.session.get(
                f"{self.base_url}/categoryList",
                params={
                    'status': 1,
                    'project': project_id,
                    '_token': self.csrf_token
                }
            )
            
            if response.status_code == 200:
                try:
                    # Try parsing as JSONP first
                    response_text = response.text
                    if response_text.startswith('jsonCallback(') and response_text.endswith(')'):
                        json_str = response_text[13:-1]
                        self.categories = json.loads(json_str)
                    else:
                        self.categories = response.json()
                    return self.categories
                except:
                    # Try as regular JSON
                    self.categories = response.json()
                    return self.categories
            return []
        except Exception as e:
            print(f"Error fetching categories: {e}")
            return []
    
    def get_activities(self, project_id: str, category_id: str) -> List[Dict]:
        """Fetch activities for a specific project and category"""
        try:
            response = self.session.get(
                f"{self.base_url}/activityList",
                params={
                    'status': 1,
                    'project': project_id,
                    'categoryId': category_id,
                    '_token': self.csrf_token
                }
            )
            
            if response.status_code == 200:
                try:
                    # Try parsing as JSONP first
                    response_text = response.text
                    if response_text.startswith('jsonCallback(') and response_text.endswith(')'):
                        json_str = response_text[13:-1]
                        self.activities = json.loads(json_str)
                    else:
                        self.activities = response.json()
                    return self.activities
                except:
                    # Try as regular JSON
                    self.activities = response.json()
                    return self.activities
            return []
        except Exception as e:
            print(f"Error fetching activities: {e}")
            return []
    
    def start_task(
        self,
        task_type_id: str,
        project_id: str,
        task_description: str,
        category_id: Optional[str] = None,
        activity_id: Optional[str] = None,
        bug_id: Optional[str] = None,
        start_datetime: Optional[str] = None
    ) -> bool:
        """
        Start a new task
        
        Args:
            task_type_id: ID of the task type
            project_id: ID of the project
            task_description: Description of the task
            category_id: Optional category ID
            activity_id: Optional activity ID
            bug_id: Optional bug ID (for bug fixing tasks)
            start_datetime: Optional start datetime (defaults to now)
        """
        try:
            # Get current datetime if not provided
            if not start_datetime:
                now = datetime.now()
                date_str = now.strftime('%Y-%m-%d')
                time_str = now.strftime('%I:%M:%S %p')
            else:
                # Parse the provided datetime
                dt = datetime.fromisoformat(start_datetime)
                date_str = dt.strftime('%Y-%m-%d')
                time_str = dt.strftime('%I:%M:%S %p')
            
            # Get task type text
            task_type_text = "Development"  # Default
            for tt in self.task_types:
                if tt['id'] == task_type_id:
                    task_type_text = tt['name']
                    break
            
            # Prepare form data
            form_data = {
                '_token': self.csrf_token,
                'taskType': task_type_id,
                'taskTypeText': task_type_text,
                'project': project_id,
                'task': task_description,
                'dtime': date_str,
                'dtime_only': time_str
            }
            
            # Add optional fields
            if category_id:
                form_data['category'] = category_id
            if activity_id:
                form_data['activity'] = activity_id
            if bug_id:
                form_data['bugId'] = bug_id
            
            # Submit the task
            response = self.session.post(
                f"{self.base_url}/user-save",
                data=form_data
            )
            
            if response.status_code == 200:
                print("✓ Task started successfully!")
                print(f"  Task: {task_description}")
                print(f"  Started at: {date_str} {time_str}")
                return True
            else:
                print(f"✗ Failed to start task. Status code: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"✗ Error starting task: {e}")
            return False
    
    def get_my_tasks(self, search_date: Optional[str] = None) -> Dict:
        """
        Get list of my tasks
        
        Args:
            search_date: Date to search for (YYYY-MM-DD format)
        
        Returns:
            Dictionary with tasks list, total hours, and task status
        """
        try:
            if not search_date:
                search_date = datetime.now().strftime('%Y-%m-%d')

            print(f"Fetching tasks for date: {search_date}")

            # Ensure we're on the home page first (establish proper session state)
            self.session.get(f"{self.base_url}/home")

            # Refresh CSRF token before making the request (DTM might require fresh token)
            self._get_csrf_token()

            # Prepare form data for DataTables request (full format)
            form_data = {
                'callback': 'jsonCallback',
                'draw': '1',
                'start': '0',
                'length': '5',  # Match browser request (length=5)
                'search_time': search_date,
                '_token': self.csrf_token,
                'search[value]': '',
                'search[regex]': 'false'
            }

            # Add columns parameters (DataTables format) - match browser exactly
            for i in range(10):
                form_data[f'columns[{i}][data]'] = str(i)
                form_data[f'columns[{i}][name]'] = ''
                form_data[f'columns[{i}][searchable]'] = 'true'
                form_data[f'columns[{i}][orderable]'] = 'false'
                form_data[f'columns[{i}][search][value]'] = ''
                form_data[f'columns[{i}][search][regex]'] = 'false'

            # Add required headers to match browser request exactly
            headers = {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Accept': 'text/javascript, application/javascript, application/ecmascript, application/x-ecmascript, */*; q=0.01',
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': f"{self.base_url}/home",
                'Accept-Encoding': 'gzip, deflate, br, zstd',
                'Accept-Language': 'en-US,en;q=0.9',
                'Connection': 'keep-alive'
            }

            response = self.session.post(
                f"{self.base_url}/myTaskList",
                params={'callback': 'jsonCallback'},  # Query parameter
                data=form_data,  # POST body (also includes callback)
                headers=headers
            )

            if response.status_code == 200:
                try:
                    # Response is JSONP format: jsonCallback({...})
                    # We need to strip the callback wrapper
                    response_text = response.text

                    # Extract JSON from JSONP
                    if response_text.startswith('jsonCallback(') and response_text.endswith(')'):
                        json_str = response_text[13:-1]  # Remove 'jsonCallback(' and ')'
                        data = json.loads(json_str)
                    else:
                        # Try parsing as regular JSON
                        data = response.json()
                    
                    # Extract task information
                    tasks = []
                    if 'data' in data:
                        for row in data['data']:
                            # Parse the HTML/text data from the response
                            # The response contains HTML, so we need to extract the relevant info
                            tasks.append({
                                'raw_data': row  # Store raw data for now
                            })
                    
                    result = {
                        'success': True,
                        'tasks': tasks,
                        'total_hours': data.get('totalHr', '0:00'),
                        'task_status': data.get('taskStatus', ''),
                        'total_records': data.get('recordsTotal', 0),
                        'raw_response': data  # Include raw response for debugging
                    }
                    
                    return result
                    
                except json.JSONDecodeError as e:
                    print(f"  ✗ Failed to parse JSON response: {e}")
                    return {
                        'success': False,
                        'tasks': [],
                        'total_hours': '0:00',
                        'task_status': '',
                        'error': 'Failed to parse response'
                    }
            else:
                print(f"  ✗ Failed to fetch tasks. Status: {response.status_code}")
                return {
                    'success': False,
                    'tasks': [],
                    'total_hours': '0:00',
                    'task_status': '',
                    'error': f'HTTP {response.status_code}'
                }
                
        except Exception as e:
            print(f"  ✗ Error fetching tasks: {e}")
            import traceback
            traceback.print_exc()
            return {
                'success': False,
                'tasks': [],
                'total_hours': '0:00',
                'task_status': '',
                'error': str(e)
            }
    
    def end_task(self, task_id: str, end_datetime: Optional[str] = None) -> bool:
        """
        End a running task
        
        Args:
            task_id: ID of the task to end
            end_datetime: Optional end datetime in format "YYYY-MM-DD HH:MM AM/PM" (defaults to now)
        """
        try:
            # Get current datetime if not provided
            if not end_datetime:
                now = datetime.now()
                task_time = now.strftime('%Y-%m-%d')
                task_time_only = now.strftime('%I:%M %p')
            else:
                # Parse datetime string in format "YYYY-MM-DD HH:MM AM/PM"
                dt = datetime.strptime(end_datetime, '%Y-%m-%d %I:%M %p')
                task_time = dt.strftime('%Y-%m-%d')
                task_time_only = dt.strftime('%I:%M %p')
            
            # Prepare the update request
            update_req = {
                "task_time": task_time,
                "task_time_only": task_time_only
            }
            
            # Encode the request
            import base64
            myreq = base64.b64encode(json.dumps(update_req).encode()).decode()
            
            # End the task (status 4 = end)
            response = self.session.get(
                f"{self.base_url}/task/updatetask/4/{task_id}/{myreq}"
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    print("✓ Task ended successfully!")
                    print(f"  Ended at: {task_time} {task_time_only}")
                    return True
                else:
                    print(f"✗ Failed to end task: {result.get('message')}")
                    return False
            else:
                print(f"✗ Failed to end task. Status code: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"✗ Error ending task: {e}")
            return False
    
    def pause_task(self, task_id: str, pause_datetime: Optional[str] = None) -> bool:
        """
        Pause a running task
        
        Args:
            task_id: ID of the task to pause
            pause_datetime: Optional pause datetime in format "YYYY-MM-DD HH:MM AM/PM" (defaults to now)
        """
        try:
            # Get current datetime if not provided
            if not pause_datetime:
                now = datetime.now()
                task_time = now.strftime('%Y-%m-%d')
                task_time_only = now.strftime('%I:%M %p')
            else:
                # Parse datetime string in format "YYYY-MM-DD HH:MM AM/PM"
                dt = datetime.strptime(pause_datetime, '%Y-%m-%d %I:%M %p')
                task_time = dt.strftime('%Y-%m-%d')
                task_time_only = dt.strftime('%I:%M %p')
            
            # Prepare the update request
            update_req = {
                "task_time": task_time,
                "task_time_only": task_time_only
            }
            
            # Encode the request
            import base64
            myreq = base64.b64encode(json.dumps(update_req).encode()).decode()
            
            # Pause the task (status 1 = pause)
            response = self.session.get(
                f"{self.base_url}/task/updatetask/1/{task_id}/{myreq}"
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    print("✓ Task paused successfully!")
                    print(f"  Paused at: {task_time} {task_time_only}")
                    return True
                else:
                    print(f"✗ Failed to pause task: {result.get('message')}")
                    return False
            else:
                print(f"✗ Failed to pause task. Status code: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"✗ Error pausing task: {e}")
            return False
    
    def resume_task(self, task_id: str, resume_datetime: Optional[str] = None) -> bool:
        """
        Resume a paused task
        
        Args:
            task_id: ID of the task to resume
            resume_datetime: Optional resume datetime in format "YYYY-MM-DD HH:MM AM/PM" (defaults to now)
        """
        try:
            # Get current datetime if not provided
            if not resume_datetime:
                now = datetime.now()
                task_time = now.strftime('%Y-%m-%d')
                task_time_only = now.strftime('%I:%M %p')
            else:
                # Parse datetime string in format "YYYY-MM-DD HH:MM AM/PM"
                dt = datetime.strptime(resume_datetime, '%Y-%m-%d %I:%M %p')
                task_time = dt.strftime('%Y-%m-%d')
                task_time_only = dt.strftime('%I:%M %p')
            
            # Prepare the update request
            update_req = {
                "task_time": task_time,
                "task_time_only": task_time_only
            }
            
            # Encode the request
            import base64
            myreq = base64.b64encode(json.dumps(update_req).encode()).decode()
            
            # Resume the task (status 2 = continue/resume)
            url = f"{self.base_url}/task/updatetask/2/{task_id}/{myreq}"
            print(f"  Resuming task with URL: {url}")
            print(f"  Task ID: {task_id}")
            print(f"  Resume time: {task_time} {task_time_only}")
            
            response = self.session.get(url)
            
            print(f"  Response status: {response.status_code}")
            print(f"  Response URL: {response.url}")
            
            if response.status_code == 200:
                try:
                    result = response.json()
                    print(f"  Response body: {result}")
                    if result.get('success'):
                        print("✓ Task resumed successfully!")
                        print(f"  Resumed at: {task_time} {task_time_only}")
                        return True
                    else:
                        print(f"✗ Failed to resume task: {result.get('message')}")
                        return False
                except Exception as e:
                    print(f"✗ Failed to parse response: {e}")
                    print(f"  Response text: {response.text[:500]}")
                    return False
            else:
                print(f"✗ Failed to resume task. Status code: {response.status_code}")
                print(f"  Response text: {response.text[:500]}")
                return False
                
        except Exception as e:
            print(f"✗ Error resuming task: {e}")
            return False


def print_banner():
    """Print bot banner"""
    print("""
╔══════════════════════════════════════════╗
║      DTM Bot - Task Monitor Bot          ║
║      PropTech Task Automation            ║
╚══════════════════════════════════════════╝
    """)


def main():
    """Main CLI interface"""
    print_banner()
    
    # Initialize bot
    bot = DTMBot()
    
    # Example usage
    print("Bot initialized. Use the following methods:")
    print("  - bot.login(username, password)")
    print("  - bot.get_task_types()")
    print("  - bot.get_projects()")
    print("  - bot.start_task(...)")
    print("  - bot.end_task(task_id)")
    print("  - bot.pause_task(task_id)")
    print("  - bot.resume_task(task_id)")
    print("\nFor interactive mode, use: python -i dtm_bot.py")
    
    return bot


if __name__ == "__main__":
    bot = main()

