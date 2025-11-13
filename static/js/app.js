// DTM Task Manager - Main JavaScript

let calendar;
let taskTypes = [];
let projects = [];
let categories = [];
let activities = [];
let currentTaskId = null;
let selectedDate = null;

// Last selected values for task form
const LAST_TASK_VALUES_KEY = 'dtmLastTaskValues';

// Functions to manage last selected values
function saveLastTaskValues(formData) {
    const values = {
        taskType: formData.task_type_id,
        project: formData.project_id,
        category: formData.category_id,
        activity: formData.activity_id,
        description: formData.description,
        bugId: formData.bug_id
    };
    localStorage.setItem(LAST_TASK_VALUES_KEY, JSON.stringify(values));
}

function loadLastTaskValues() {
    const stored = localStorage.getItem(LAST_TASK_VALUES_KEY);
    return stored ? JSON.parse(stored) : {};
}

function clearLastTaskValues() {
    localStorage.removeItem(LAST_TASK_VALUES_KEY);
    showToast('Cleared', 'Last selected values have been cleared', 'success');
}

// Make functions globally available for HTML onclick
window.clearLastTaskValues = clearLastTaskValues;
window.closePauseTaskModal = closePauseTaskModal;
window.closeResumeTaskModal = closeResumeTaskModal;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

// Session monitoring
let sessionCheckInterval = null;

function initializeApp() {
    // Check if already logged in
    checkLoginStatus();

    // Setup event listeners
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('startTaskForm').addEventListener('submit', handleStartTask);
    document.getElementById('btnStartTask').addEventListener('click', () => openStartTaskModal());
    document.getElementById('btnLogout').addEventListener('click', handleLogout);
    document.getElementById('btnBulkUpload').addEventListener('click', openBulkUploadModal);
    document.getElementById('btnDownloadTemplate').addEventListener('click', downloadCSVTemplate);
    document.getElementById('bulkUploadForm').addEventListener('submit', handleBulkUpload);
    document.getElementById('csvFile').addEventListener('change', handleFileSelect);

    // Setup view switcher
    document.getElementById('btnCalendarView').addEventListener('click', showCalendarView);
    document.getElementById('btnOngoingView').addEventListener('click', showOngoingView);
    document.getElementById('btnRefreshOngoing').addEventListener('click', loadOngoingTasks);

    // Setup dynamic form changes
    document.getElementById('taskType').addEventListener('change', handleTaskTypeChange);
    document.getElementById('project').addEventListener('change', handleProjectChange);
    document.getElementById('category').addEventListener('change', handleCategoryChange);

    // Setup end task modal
    document.getElementById('endTaskForm').addEventListener('submit', handleEndTaskSubmit);
    document.getElementById('endTaskModal').addEventListener('click', (e) => {
        if (e.target.id === 'endTaskModal') {
            closeEndTaskModal();
        }
    });

    // Setup pause task modal
    document.getElementById('pauseTaskForm').addEventListener('submit', handlePauseTaskSubmit);
    document.getElementById('pauseTaskModal').addEventListener('click', (e) => {
        if (e.target.id === 'pauseTaskModal') {
            closePauseTaskModal();
        }
    });

    // Setup resume task modal
    document.getElementById('resumeTaskForm').addEventListener('submit', handleResumeTaskSubmit);
    document.getElementById('resumeTaskModal').addEventListener('click', (e) => {
        if (e.target.id === 'resumeTaskModal') {
            closeResumeTaskModal();
        }
    });

    // Start periodic session checking when logged in
    startSessionMonitoring();
}

function startSessionMonitoring() {
    // Check session every 5 minutes
    if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
    }
    sessionCheckInterval = setInterval(async () => {
        if (document.getElementById('appScreen').classList.contains('active')) {
            const result = await apiCall('status');
            if (!result || !result.logged_in) {
                showToast('Session expired', 'Your session has expired. Please login again.', 'error');
                showLoginScreen();
                stopSessionMonitoring();
            }
        }
    }, 5 * 60 * 1000); // 5 minutes
}

function stopSessionMonitoring() {
    if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
        sessionCheckInterval = null;
    }
}

// API Functions
async function apiCall(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(`/api/${endpoint}`, options);
        const result = await response.json();

        // Handle HTTP errors (401, 403, etc.)
        if (!response.ok) {
            if (response.status === 401) {
                showToast('Session expired', 'Please login again', 'error');
                showLoginScreen();
                return null;
            }
            // For other HTTP errors, still return the result for specific handling
        }

        // Handle application-level errors (success: false)
        if (result && result.success === false) {
            // Check if this is a session-related error
            const errorMessage = result.message || '';
            if (errorMessage.toLowerCase().includes('not logged in') ||
                errorMessage.toLowerCase().includes('session') ||
                errorMessage.toLowerCase().includes('login')) {
                showToast('Session expired', 'Please login again', 'error');
                showLoginScreen();
                return null;
            }
        }

        return result;
    } catch (error) {
        console.error('API Error:', error);
        showToast('Error', 'Network error occurred', 'error');
        return null;
    }
}

// Login Functions
async function checkLoginStatus() {
    const result = await apiCall('status');
    if (result && result.logged_in) {
        showAppScreen();
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    showLoading(true);
    
    const result = await apiCall('login', 'POST', { username, password });
    
    showLoading(false);
    
    if (result && result.success) {
        // Store username in localStorage for session persistence
        localStorage.setItem('dtmUserEmail', username);
        document.getElementById('userEmail').textContent = username;
        showToast('Welcome!', 'Login successful', 'success');
        showAppScreen();
    } else {
        const errorMsg = document.getElementById('loginError');
        errorMsg.textContent = result?.message || 'Login failed';
        errorMsg.classList.add('active');
        setTimeout(() => errorMsg.classList.remove('active'), 5000);
    }
}

async function handleLogout() {
    if (!confirm('Are you sure you want to logout?')) return;
    
    await apiCall('logout', 'POST');
    // Clear stored email
    localStorage.removeItem('dtmUserEmail');
    showLoginScreen();
    showToast('Logged out', 'You have been logged out', 'success');
}

// Screen Management
function showLoginScreen() {
    document.getElementById('appScreen').classList.remove('active');
    document.getElementById('loginScreen').classList.add('active');
    document.getElementById('password').value = '';
    // Clear email display
    document.getElementById('userEmail').textContent = '';
    stopSessionMonitoring();
}

function showAppScreen() {
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('appScreen').classList.add('active');

    // Restore email from localStorage
    const storedEmail = localStorage.getItem('dtmUserEmail');
    if (storedEmail) {
        document.getElementById('userEmail').textContent = storedEmail;
    }

    // Initialize calendar
    initializeCalendar();

    // Initialize date picker
    initializeDatePicker();

    // Load initial data
    loadInitialData();

    // Load today's tasks and set as selected date
    const today = new Date().toISOString().split('T')[0];
    selectedDate = today;
    loadTasks();

    // Start session monitoring
    startSessionMonitoring();
}

function initializeDatePicker() {
    const datePicker = document.getElementById('taskDate');
    
    // Set to today
    const today = new Date();
    datePicker.value = today.toISOString().split('T')[0];
    datePicker.max = today.toISOString().split('T')[0];  // Can't select future dates
    
    // Listen for date changes
    datePicker.addEventListener('change', function() {
        loadTasks(this.value);
    });
}

// Calendar Functions
function initializeCalendar() {
    const calendarEl = document.getElementById('calendar');

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        events: [],
        eventClick: function(info) {
            handleEventClick(info.event);
        },
        dateClick: function(info) {
            const clickedDate = info.dateStr;

            // Check if the click was on a plus icon
            if (info.jsEvent && info.jsEvent.target && info.jsEvent.target.classList.contains('calendar-plus-icon')) {
                // Open start task modal for this date
                openStartTaskModal(clickedDate);
                return;
            }

            // Regular date click - load tasks for the clicked date
            // Update selected date tracking
            updateSelectedDate(clickedDate);

            document.getElementById('taskDate').value = clickedDate;
            loadTasks(clickedDate);
        },
        dayCellContent: function(info) {
            // Add a plus icon to each day cell
            const plusIcon = document.createElement('i');
            plusIcon.className = 'fas fa-plus calendar-plus-icon';
            plusIcon.title = 'View tasks for this day';

            // Format date as YYYY-MM-DD using local timezone to avoid date shifts
            const year = info.date.getFullYear();
            const month = String(info.date.getMonth() + 1).padStart(2, '0');
            const day = String(info.date.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            
            plusIcon.setAttribute('data-date', dateStr);

            // Check if this date is selected
            const isSelected = selectedDate === dateStr;

            // Return both the day number and the plus icon
            return {
                html: `<div class="day-cell-content ${isSelected ? 'selected-date' : ''}">
                    <span class="day-number">${info.dayNumberText}</span>
                    <span class="plus-icon-wrapper">${plusIcon.outerHTML}</span>
                </div>`
            };
        },
        height: 'auto'
    });

    calendar.render();
}

function updateSelectedDate(dateStr) {
    // Update the selected date
    selectedDate = dateStr;

    // Re-render the calendar to show the selected date highlighting
    calendar.render();
}

function handleEventClick(event) {
    // Show task details or options to end/pause
    if (event.extendedProps && event.extendedProps.taskId) {
        const taskId = event.extendedProps.taskId;
        openEndTaskModal(taskId, {
            title: event.title,
            description: event.extendedProps.description,
            project: event.extendedProps.project
        });
    }
}

// Data Loading
async function loadInitialData() {
    showLoading(true);
    
    // Load task types
    const taskTypesResult = await apiCall('task-types');
    if (taskTypesResult && taskTypesResult.success) {
        taskTypes = taskTypesResult.data;
        populateTaskTypes();
    }
    
    // Load projects
    const projectsResult = await apiCall('projects');
    if (projectsResult && projectsResult.success) {
        projects = projectsResult.data;
        populateProjects();
    }
    
    showLoading(false);
}

async function loadTasks(date) {
    if (!date) {
        date = document.getElementById('taskDate').value;
    }
    
    showLoading(true);
    
    const result = await apiCall(`tasks?date=${date}`);
    
    showLoading(false);
    
    if (result && result.success) {
        displayTasks(result);
        updateStats(result);
    } else {
        console.error('Failed to load tasks:', result);
        displayEmptyState();
    }
}

function displayTasks(result) {
    const taskList = document.getElementById('taskList');
    taskList.innerHTML = '';
    
    console.log('Display tasks result:', result);
    
    // Check if we have tasks
    if (!result || !result.raw_response || !result.raw_response.data) {
        displayEmptyState();
        return;
    }
    
    const rawData = result.raw_response;
    
    // Check if there are actual tasks (not just "No Records")
    if (rawData.recordsTotal === 0 || 
        (rawData.data.length === 1 && rawData.data[0][0] === "No Records")) {
        displayEmptyState();
        return;
    }
    
    // Process tasks from raw response
    rawData.data.forEach((taskRow, index) => {
        const task = parseTaskRow(taskRow);
        if (task && task.index !== "No Records") {
            addTaskCard(task);
        }
    });
}

function parseTaskRow(row) {
    // The API returns HTML in the cells, we need to extract the text
    // row is an array: [#, Category/Project, Activity, TaskType, Task, StartTime, EndTime, Duration, Status, Actions]
    try {
        // row[0] is the number, rest are strings with HTML
        const startTime = extractText(row[5]);
        
        // Extract start date from startTime (format: "YY-MM-DD HH:MM:SS" or "25-11-03 10:00:00")
        let startDate = null;
        if (startTime) {
            const dateMatch = startTime.match(/(\d{2}-\d{2}-\d{2})/);
            if (dateMatch) {
                startDate = dateMatch[1]; // Keep in YY-MM-DD format for now
            }
        }
        
        // Extract real task ID (UUID) from actions HTML
        // Actions HTML contains links like: href='task/updatetask/1/d8286acf-7fdc-415b-ad43-fb4cc0c5b925'
        let taskId = row[0]; // Default to index
        if (row[9]) {
            const uuidMatch = row[9].match(/task\/updatetask\/\d+\/([a-f0-9\-]{36})/i);
            if (uuidMatch) {
                taskId = uuidMatch[1];
                console.log(`Extracted task UUID: ${taskId} for task index ${row[0]}`);
            } else {
                console.log(`No UUID found for task index ${row[0]}, using index as taskId`);
            }
        }
        
        const task = {
            index: row[0],  // The display number
            taskId: taskId,  // The real UUID task ID
            category: extractText(row[1]),
            activity: row[2] || 'N/A',  // Sometimes empty
            taskType: row[3],
            task: row[4],
            startTime: startTime,
            startDate: startDate, // Add start date
            endTime: extractText(row[6]),
            duration: row[7],
            status: extractText(row[8]),
            actions: row[9]
        };
        
        // Store task data for later use with BOTH index and taskId as keys
        if (task.index) {
            taskDataMap.set(String(task.index), task);
        }
        if (task.taskId) {
            taskDataMap.set(task.taskId, task);
        }
        
        return task;
    } catch (e) {
        console.error('Error parsing task row:', e, row);
        return null;
    }
}

function extractText(html) {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
}

function addTaskCard(task) {
    const taskList = document.getElementById('taskList');
    
    const statusLower = task.status.toLowerCase();
    const statusClass = statusLower.includes('on going') ? 'running' : 
                       (statusLower.includes('pause') || statusLower.includes('on hold') || statusLower.includes('hold')) ? 'paused' : 'completed';
    
    const taskCard = document.createElement('div');
    taskCard.className = 'task-card';
    taskCard.innerHTML = `
        <div class="task-card-header">
            <div class="task-type">${task.taskType}</div>
            <div class="task-status ${statusClass}">
                <i class="fas fa-circle"></i>
                ${task.status}
            </div>
        </div>
        <div class="task-description">${task.task}</div>
        <div class="task-meta">
            <div class="task-meta-item">
                <i class="fas fa-project-diagram"></i>
                <span>${task.category}</span>
            </div>
            <div class="task-meta-item">
                <i class="fas fa-list"></i>
                <span>${task.activity}</span>
            </div>
            <div class="task-meta-item">
                <i class="fas fa-clock"></i>
                <span>${task.startTime}</span>
            </div>
            <div class="task-meta-item">
                <i class="fas fa-hourglass"></i>
                <span>Duration: ${task.duration}</span>
            </div>
        </div>
        <div class="task-actions">
            ${statusClass === 'running' ? `
                <button class="btn btn-warning btn-sm" onclick="pauseTask('${task.taskId}')">
                    <i class="fas fa-pause"></i>
                    Pause
                </button>
                <button class="btn btn-danger btn-sm" onclick="endTask('${task.taskId}')">
                    <i class="fas fa-stop"></i>
                    End
                </button>
            ` : statusClass === 'paused' ? `
                <button class="btn btn-success btn-sm" onclick="resumeTask('${task.taskId}')">
                    <i class="fas fa-play"></i>
                    Resume
                </button>
                <button class="btn btn-danger btn-sm" onclick="endTask('${task.taskId}')">
                    <i class="fas fa-stop"></i>
                    End
                </button>
            ` : ''}
        </div>
    `;
    
    taskList.appendChild(taskCard);
}

function displayEmptyState() {
    const taskList = document.getElementById('taskList');
    taskList.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-inbox"></i>
            <p>No tasks for this date</p>
        </div>
    `;
}

function updateStats(result) {
    if (!result || !result.raw_response) {
        return;
    }
    
    const rawData = result.raw_response;
    
    // Update task count
    const taskCount = rawData.recordsTotal || 0;
    document.getElementById('taskCount').textContent = `${taskCount} ${taskCount === 1 ? 'task' : 'tasks'}`;
    document.getElementById('completedCount').textContent = taskCount;
    
    // Update total hours
    const totalHours = rawData.totalHr || '00:00:00';
    document.getElementById('totalHours').textContent = totalHours;
    
    // Update current status
    const statusHtml = rawData.taskStatus || 'No active task';
    const statusDiv = document.getElementById('currentStatus');
    
    // Extract just the text from HTML
    const statusText = extractText(statusHtml);
    statusDiv.textContent = statusText || 'No active task';
}

function populateTaskTypes() {
    const select = document.getElementById('taskType');
    select.innerHTML = '<option value="">Select task type...</option>';
    
    taskTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type.id;
        option.textContent = type.name;
        select.appendChild(option);
    });
}

function populateProjects() {
    const select = document.getElementById('project');
    select.innerHTML = '<option value="">Select project...</option>';
    
    projects.forEach(project => {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = project.name;
        select.appendChild(option);
    });
}

async function loadCategories(projectId) {
    const result = await apiCall(`categories/${projectId}`);
    if (result && result.success) {
        categories = result.data;
        populateCategories();
    }
}

function populateCategories() {
    const select = document.getElementById('category');
    select.innerHTML = '<option value="">Select category...</option>';
    
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        select.appendChild(option);
    });
}

async function loadActivities(projectId, categoryId) {
    const result = await apiCall(`activities/${projectId}/${categoryId}`);
    if (result && result.success) {
        activities = result.data;
        populateActivities();
    }
}

function populateActivities() {
    const select = document.getElementById('activity');
    select.innerHTML = '<option value="">Select activity...</option>';
    
    activities.forEach(activity => {
        const option = document.createElement('option');
        option.value = activity.id;
        option.textContent = activity.name;
        select.appendChild(option);
    });
}

// Form Handlers
function handleTaskTypeChange(e) {
    const selectedType = taskTypes.find(t => t.id === e.target.value);
    const bugIdGroup = document.getElementById('bugIdGroup');
    
    // Show bug ID field for bug-related tasks
    if (selectedType && (selectedType.name.includes('Bug') || selectedType.name.includes('bug'))) {
        bugIdGroup.style.display = 'block';
    } else {
        bugIdGroup.style.display = 'none';
    }
}

function handleProjectChange(e) {
    const projectId = e.target.value;
    if (projectId) {
        loadCategories(projectId);
    } else {
        document.getElementById('category').innerHTML = '<option value="">Select category...</option>';
        document.getElementById('activity').innerHTML = '<option value="">Select activity...</option>';
    }
}

function handleCategoryChange(e) {
    const categoryId = e.target.value;
    const projectId = document.getElementById('project').value;
    
    if (categoryId && projectId) {
        loadActivities(projectId, categoryId);
    } else {
        document.getElementById('activity').innerHTML = '<option value="">Select activity...</option>';
    }
}

// Start Task Modal
async function populateFormWithLastValues() {
    const lastValues = loadLastTaskValues();

    // Set basic fields first
    if (lastValues.taskType) {
        document.getElementById('taskType').value = lastValues.taskType;
        // Trigger change event to show/hide bug ID field
        handleTaskTypeChange({ target: { value: lastValues.taskType } });
    }

    if (lastValues.project) {
        document.getElementById('project').value = lastValues.project;
        // Load categories for this project
        if (lastValues.project) {
            await loadCategories(lastValues.project);

            if (lastValues.category) {
                document.getElementById('category').value = lastValues.category;
                // Load activities for this project and category
                if (lastValues.category) {
                    await loadActivities(lastValues.project, lastValues.category);

                    if (lastValues.activity) {
                        document.getElementById('activity').value = lastValues.activity;
                    }
                }
            }
        }
    }

    // Set description and bug ID
    if (lastValues.description) {
        document.getElementById('description').value = lastValues.description;
    }

    if (lastValues.bugId) {
        document.getElementById('bugId').value = lastValues.bugId;
    }
}

function openStartTaskModal(dateStr) {
    // Store the selected date for the task
    if (dateStr) {
        // Store it as a data attribute on the form for later use
        document.getElementById('startTaskForm').setAttribute('data-selected-date', dateStr);
    } else {
        document.getElementById('startTaskForm').removeAttribute('data-selected-date');
    }

    // Show modal first
    document.getElementById('startTaskModal').classList.add('active');

    // Initialize date and time pickers and populate form with last values after modal is visible
    // Use setTimeout to ensure DOM is ready
    setTimeout(async () => {
        initializeStartDateTimePickers(dateStr);
        await populateFormWithLastValues();
    }, 100);
}

function closeStartTaskModal() {
    document.getElementById('startTaskModal').classList.remove('active');
    document.getElementById('startTaskForm').reset();
}

function initializeStartDateTimePickers(dateStr) {
    // Destroy existing pickers if they exist
    const startDateEl = document.getElementById('startDate');
    const startTimeEl = document.getElementById('startTime');
    
    if (startDateEl._flatpickr) {
        startDateEl._flatpickr.destroy();
    }
    if (startTimeEl._flatpickr) {
        startTimeEl._flatpickr.destroy();
    }

    // Set default date and time
    const now = new Date();
    const defaultDate = dateStr ? dateStr : now.toISOString().split('T')[0];
    const defaultTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM format

    // Initialize date picker with Flatpickr (better UX, no scrolling issues)
    flatpickr(startDateEl, {
        dateFormat: 'Y-m-d',
        maxDate: 'today',
        defaultDate: defaultDate,
        allowInput: false,
        clickOpens: true,
        appendTo: document.body // Append to body to avoid overflow issues
    });

    // Initialize custom time picker
    initializeCustomTimePicker(startTimeEl, defaultTime);
}

function initializeEndDateTimePickers(startDateStr = null) {
    // Destroy existing pickers if they exist
    const endDateEl = document.getElementById('endDate');
    const endTimeEl = document.getElementById('endTime');
    
    if (endDateEl._flatpickr) {
        endDateEl._flatpickr.destroy();
    }
    if (endTimeEl._flatpickr) {
        endTimeEl._flatpickr.destroy();
    }

    // Use provided start date, or parse from task data, or default to today
    let defaultDate;
    if (startDateStr) {
        // If startDateStr is in YY-MM-DD format (e.g., "25-11-03"), convert to YYYY-MM-DD
        if (startDateStr.match(/^\d{2}-\d{2}-\d{2}$/)) {
            const parts = startDateStr.split('-');
            const year = parts[0].length === 2 ? '20' + parts[0] : parts[0];
            defaultDate = `${year}-${parts[1]}-${parts[2]}`;
        } else if (startDateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
            // Already in YYYY-MM-DD format
            defaultDate = startDateStr.split(' ')[0]; // Remove time if present
        } else {
            // Try to parse as-is
            defaultDate = startDateStr.split(' ')[0];
        }
    } else {
        // Default to today
        const now = new Date();
        defaultDate = now.toISOString().split('T')[0];
    }

    // Initialize date picker with Flatpickr (better UX, no scrolling issues)
    flatpickr(endDateEl, {
        dateFormat: 'Y-m-d',
        maxDate: 'today',
        defaultDate: defaultDate,
        allowInput: false,
        clickOpens: true,
        appendTo: document.body // Append to body to avoid overflow issues
    });

    // Initialize custom time picker
    const now = new Date();
    const defaultTime = now.toTimeString().split(' ')[0].substring(0, 5);
    initializeCustomTimePicker(endTimeEl, defaultTime);
}

async function handleStartTask(e) {
    e.preventDefault();

    const startDate = document.getElementById('startDate').value;
    const startTime = document.getElementById('startTime').value;

    // Validate date and time
    if (!startDate || !startTime) {
        showToast('Error', 'Please select both start date and time', 'error');
        return;
    }

    // Create datetime string
    const dateTime = `${startDate} ${startTime}:00`; // Format: YYYY-MM-DD HH:MM:SS

    // Validate that the selected datetime is not in the future
    const selectedDateTime = new Date(dateTime);
    const now = new Date();

    if (selectedDateTime > now) {
        showToast('Error', 'Cannot start a task in the future', 'error');
        return;
    }

    const formData = {
        task_type_id: document.getElementById('taskType').value,
        project_id: document.getElementById('project').value,
        description: document.getElementById('description').value,
        category_id: document.getElementById('category').value || null,
        activity_id: document.getElementById('activity').value || null,
        bug_id: document.getElementById('bugId').value || null,
        start_datetime: dateTime
    };
    
    showLoading(true);
    
    const result = await apiCall('tasks/start', 'POST', formData);
    
    showLoading(false);
    
    if (result && result.success) {
        showToast('Success!', 'Task started successfully', 'success');

        // Save the form values for next time
        saveLastTaskValues(formData);

        closeStartTaskModal();

        // Add to calendar
        const taskType = taskTypes.find(t => t.id === formData.task_type_id);
        const project = projects.find(p => p.id === formData.project_id);

        // Use the actual start date from the form
        const eventDate = new Date(startDate);

        calendar.addEvent({
            title: `${taskType?.name || 'Task'} - ${project?.name || 'Project'}`,
            start: eventDate,
            allDay: true,
            backgroundColor: '#6366f1',
            extendedProps: {
                description: formData.description,
                project: project?.name,
                taskId: 'current-task' // In a real app, get this from the API response
            }
        });

        // Refresh calendar to ensure proper display
        calendar.render();

        // Reload tasks to show the newly started task
        loadTasks();

        // Switch to Ongoing Tasks view
        showOngoingView();

    } else {
        showToast('Error', result?.message || 'Failed to start task', 'error');
    }
}

// End Task Modal
function openEndTaskModal(taskId, taskDetails) {
    currentTaskId = taskId;
    
    const detailsHtml = `
        <div style="margin-bottom: 0.5rem;"><strong>Task:</strong> ${taskDetails.title}</div>
        <div style="margin-bottom: 0.5rem;"><strong>Project:</strong> ${taskDetails.project || 'N/A'}</div>
        <div><strong>Description:</strong> ${taskDetails.description || 'N/A'}</div>
    `;
    
    document.getElementById('endTaskDetails').innerHTML = detailsHtml;
    document.getElementById('endTaskModal').classList.add('active');
}

function closeEndTaskModal() {
    document.getElementById('endTaskModal').classList.remove('active');
    currentTaskId = null;
}

async function confirmEndTask() {
    if (!currentTaskId) return;
    
    showLoading(true);
    
    const result = await apiCall(`tasks/end/${currentTaskId}`, 'POST');
    
    showLoading(false);
    
    if (result && result.success) {
        showToast('Success!', 'Task ended successfully', 'success');
        closeEndTaskModal();
        
        // Remove from calendar and update list
        const events = calendar.getEvents();
        const event = events.find(e => e.extendedProps.taskId === currentTaskId);
        if (event) {
            event.remove();
        }
    } else {
        showToast('Error', result?.message || 'Failed to end task', 'error');
    }
}

// Task List Management
function addTaskToList(task) {
    const taskList = document.getElementById('taskList');
    
    const taskCard = document.createElement('div');
    taskCard.className = 'task-card';
    taskCard.innerHTML = `
        <div class="task-card-header">
            <div class="task-type">${task.type}</div>
            <div class="task-status running">
                <i class="fas fa-circle"></i>
                Running
            </div>
        </div>
        <div class="task-description">${task.description}</div>
        <div class="task-meta">
            <div class="task-meta-item">
                <i class="fas fa-project-diagram"></i>
                <span>${task.project}</span>
            </div>
            <div class="task-meta-item">
                <i class="fas fa-clock"></i>
                <span>Started: ${task.startTime}</span>
            </div>
        </div>
        <div class="task-actions">
            <button class="btn btn-secondary btn-sm" onclick="pauseCurrentTask()">
                <i class="fas fa-pause"></i>
                Pause
            </button>
            <button class="btn btn-danger btn-sm" onclick="endCurrentTask()">
                <i class="fas fa-stop"></i>
                End
            </button>
        </div>
    `;
    
    taskList.prepend(taskCard);
    updateTaskCount();
}

function updateTaskCount() {
    const taskCount = document.getElementById('taskList').children.length;
    document.getElementById('taskCount').textContent = `${taskCount} ${taskCount === 1 ? 'task' : 'tasks'}`;
}

// UI Helpers
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.classList.add('active');
    } else {
        overlay.classList.remove('active');
    }
}

function showToast(title, message, type = 'success') {
    const container = document.getElementById('toastContainer');
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${icons[type]}"></i>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// Global functions for inline event handlers
function pauseCurrentTask() {
    // This function is for pausing the current task without a specific task ID
    // It's kept for backwards compatibility if called from anywhere
    showToast('Info', 'Please use the pause button on a specific task', 'info');
}

function endCurrentTask() {
    openEndTaskModal('current-task', {
        title: 'Current Task',
        description: 'This is your currently running task',
        project: 'PropTech'
    });
}

// Click outside modal to close
window.onclick = function(event) {
    const startModal = document.getElementById('startTaskModal');
    const endModal = document.getElementById('endTaskModal');
    
    if (event.target === startModal) {
        closeStartTaskModal();
    }
    if (event.target === endModal) {
        closeEndTaskModal();
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Escape to close modals
    if (e.key === 'Escape') {
        closeStartTaskModal();
        closeEndTaskModal();
    }
    
    // Ctrl/Cmd + K to open start task modal
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (document.getElementById('appScreen').classList.contains('active')) {
            openStartTaskModal();
        }
    }
});

// View Management
function showCalendarView() {
    document.getElementById('calendarView').classList.add('active');
    document.getElementById('ongoingView').classList.remove('active');
    
    // Update nav tabs
    const calendarBtn = document.getElementById('btnCalendarView');
    const ongoingBtn = document.getElementById('btnOngoingView');
    calendarBtn.classList.add('active');
    ongoingBtn.classList.remove('active');

    // Refresh calendar events
    refreshCalendarEvents();
}

function refreshCalendarEvents() {
    // Clear existing events
    calendar.removeAllEvents();

    // Load ongoing tasks and add them as calendar events
    loadOngoingTasksForCalendar();
}

async function loadOngoingTasksForCalendar() {
    const result = await apiCall('tasks/ongoing');

    if (result && result.success && result.tasks) {
        result.tasks.forEach(taskRow => {
            // Parse task data from the raw response format
            // taskRow is in format: [id, description, activity, taskType, task, startTime, endTime, duration, status, actions]
            if (taskRow.length >= 6) {
                const taskId = taskRow[0];
                const description = taskRow[4] || 'Task';
                const startTime = taskRow[5] || '';

                // Extract date from startTime (format: "YY-MM-DD HH:MM:SS")
                let eventDate = new Date();
                if (startTime) {
                    const dateMatch = startTime.match(/(\d{2}-\d{2}-\d{2})/);
                    if (dateMatch) {
                        const dateStr = dateMatch[1];
                        // dateStr is in YY-MM-DD format
                        const parts = dateStr.split('-');
                        const year = parts[0];
                        const month = parts[1];
                        const day = parts[2];
                        const fullYear = year.length === 2 ? '20' + year : year;
                        eventDate = new Date(`${fullYear}-${month}-${day}`);
                    }
                }

                // Only add if it's an ongoing task
                const status = taskRow[8] || '';
                if (status.includes('On Going') || status.includes('Pause') || status.includes('On Hold')) {
                    calendar.addEvent({
                        title: description,
                        start: eventDate,
                        allDay: true,
                        backgroundColor: (status.includes('Pause') || status.includes('On Hold')) ? '#f59e0b' : '#6366f1',
                        extendedProps: {
                            taskId: taskId,
                            status: status
                        }
                    });
                }
            }
        });

        // Refresh calendar display
        calendar.render();
    }
}

function showOngoingView() {
    document.getElementById('calendarView').classList.remove('active');
    document.getElementById('ongoingView').classList.add('active');
    
    // Update nav tabs
    const calendarBtn = document.getElementById('btnCalendarView');
    const ongoingBtn = document.getElementById('btnOngoingView');
    calendarBtn.classList.remove('active');
    ongoingBtn.classList.add('active');
    
    // Load ongoing tasks when view is opened
    loadOngoingTasks();
}

// Ongoing Tasks Functions
async function loadOngoingTasks() {
    showLoading(true);
    
    const result = await apiCall('tasks/ongoing');
    
    showLoading(false);
    
    if (result && result.success) {
        displayOngoingTasks(result);
    } else {
        console.error('Failed to load ongoing tasks:', result);
        displayEmptyOngoingState();
    }
}

function displayOngoingTasks(result) {
    const tasksList = document.getElementById('ongoingTasksList');
    tasksList.innerHTML = '';
    
    console.log('Display ongoing tasks result:', result);
    
    // Check if we have tasks
    if (!result.tasks || result.tasks.length === 0) {
        displayEmptyOngoingState();
        return;
    }
    
    // Process tasks
    result.tasks.forEach((taskRow, index) => {
        const task = parseTaskRow(taskRow);
        if (task && task.index !== "No Records") {
            addOngoingTaskCard(task);
        }
    });
}

function addOngoingTaskCard(task) {
    const tasksList = document.getElementById('ongoingTasksList');
    
    const statusLower = task.status.toLowerCase();
    const statusClass = statusLower.includes('on going') ? 'running' : 
                       (statusLower.includes('pause') || statusLower.includes('on hold') || statusLower.includes('hold')) ? 'paused' : 'completed';
    
    const taskCard = document.createElement('div');
    taskCard.className = 'ongoing-task-card';
    taskCard.innerHTML = `
        <div class="ongoing-task-header">
            <div class="ongoing-task-type">${task.taskType}</div>
            <div class="ongoing-task-status ${statusClass}">
                <i class="fas fa-circle"></i>
                ${task.status}
            </div>
        </div>
        <div class="ongoing-task-description">${task.task}</div>
        <div class="ongoing-task-meta">
            <div class="ongoing-task-meta-item">
                <i class="fas fa-project-diagram"></i>
                <span><strong>Project:</strong> ${task.category}</span>
            </div>
            <div class="ongoing-task-meta-item">
                <i class="fas fa-list"></i>
                <span><strong>Activity:</strong> ${task.activity}</span>
            </div>
            <div class="ongoing-task-meta-item">
                <i class="fas fa-clock"></i>
                <span><strong>Start:</strong> ${task.startTime}</span>
            </div>
            <div class="ongoing-task-meta-item">
                <i class="fas fa-hourglass"></i>
                <span><strong>Duration:</strong> ${task.duration}</span>
            </div>
        </div>
        <div class="ongoing-task-actions">
            ${statusClass === 'running' ? `
                <button class="btn btn-warning btn-sm" onclick="pauseTask('${task.taskId}')">
                    <i class="fas fa-pause"></i>
                    Pause
                </button>
                <button class="btn btn-danger btn-sm" onclick="endTask('${task.taskId}')">
                    <i class="fas fa-stop"></i>
                    End
                </button>
            ` : statusClass === 'paused' ? `
                <button class="btn btn-success btn-sm" onclick="resumeTask('${task.taskId}')">
                    <i class="fas fa-play"></i>
                    Resume
                </button>
                <button class="btn btn-danger btn-sm" onclick="endTask('${task.taskId}')">
                    <i class="fas fa-stop"></i>
                    End
                </button>
            ` : ''}
        </div>
    `;
    
    tasksList.appendChild(taskCard);
}

function displayEmptyOngoingState() {
    const tasksList = document.getElementById('ongoingTasksList');
    tasksList.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-clipboard-check"></i>
            <p>No ongoing tasks</p>
            <button class="btn btn-primary" onclick="openStartTaskModal()">
                <i class="fas fa-plus-circle"></i>
                Start a Task
            </button>
        </div>
    `;
}

// Task Actions
// Store the task IDs for pause, resume, and end
let currentEndTaskId = null;
let currentPauseTaskId = null;
let currentResumeTaskId = null;
// Store task data for accessing start date
let taskDataMap = new Map();

function openPauseTaskModal(taskId, startDateStr = null) {
    console.log('Opening pause task modal for task:', taskId);
    currentPauseTaskId = taskId;

    // Get start date from task data if available
    let defaultStartDate = startDateStr;
    if (!defaultStartDate && taskDataMap.has(taskId)) {
        const taskData = taskDataMap.get(taskId);
        defaultStartDate = taskData.startDate;
    }

    // Show modal first
    document.getElementById('pauseTaskModal').classList.add('active');

    // Set default date (today if start date is before today, otherwise start date)
    const today = new Date();
    const pauseDatePicker = flatpickr('#pauseDate', {
        dateFormat: 'Y-m-d',
        maxDate: today,
        minDate: defaultStartDate,
        defaultDate: today,
        allowInput: false
    });

    // Initialize custom clock time picker for pause time
    const pauseTimeInput = document.getElementById('pauseTime');
    
    // Auto-fill current time in 24-hour format for the custom picker
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(Math.round(now.getMinutes() / 5) * 5).padStart(2, '0');
    pauseTimeInput.value = `${hours}:${minutes}`;
    
    // Initialize the custom time picker
    initializeCustomTimePicker(pauseTimeInput);
}

function closePauseTaskModal() {
    document.getElementById('pauseTaskModal').classList.remove('active');
    currentPauseTaskId = null;
}

async function handlePauseTaskSubmit(e) {
    e.preventDefault();

    const pauseDate = document.getElementById('pauseDate').value;
    const pauseTime24 = document.getElementById('pauseTime').value;

    if (!pauseDate || !pauseTime24) {
        showToast('Error', 'Please select both pause date and time', 'error');
        return;
    }

    // Convert 24-hour format to 12-hour AM/PM format
    const [hours24, minutes] = pauseTime24.split(':').map(Number);
    const period = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 % 12 || 12;
    const pauseTime = `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
    
    // Convert to datetime format
    const pauseDatetime = `${pauseDate} ${pauseTime}`;

    showLoading(true);

    const result = await apiCall(`tasks/pause/${currentPauseTaskId}`, 'POST', {
        pause_datetime: pauseDatetime
    });

    showLoading(false);
    closePauseTaskModal();

    if (result && result.success) {
        showToast('Success!', 'Task paused successfully', 'success');
        // Refresh ongoing tasks, calendar, and sidebar
        loadOngoingTasks();
        refreshCalendarEvents();
        loadTasks();
    } else {
        showToast('Error', result?.message || 'Failed to pause task', 'error');
    }
}

async function pauseTask(taskId) {
    console.log('Pause task called with taskId:', taskId);
    console.log('Task data:', taskDataMap.get(taskId));
    openPauseTaskModal(taskId);
}

function openResumeTaskModal(taskId, pauseDateStr = null) {
    console.log('Opening resume task modal for task:', taskId);
    currentResumeTaskId = taskId;

    // Get pause date from task data if available
    let defaultPauseDate = pauseDateStr;
    if (!defaultPauseDate && taskDataMap.has(taskId)) {
        const taskData = taskDataMap.get(taskId);
        defaultPauseDate = taskData.pauseDate || taskData.startDate;
    }

    // Show modal first
    document.getElementById('resumeTaskModal').classList.add('active');

    // Set default date (today if pause date is before today, otherwise pause date)
    const today = new Date();
    const resumeDatePicker = flatpickr('#resumeDate', {
        dateFormat: 'Y-m-d',
        maxDate: today,
        minDate: defaultPauseDate,
        defaultDate: today,
        allowInput: false
    });

    // Initialize custom clock time picker for resume time
    const resumeTimeInput = document.getElementById('resumeTime');
    
    // Auto-fill current time in 24-hour format for the custom picker
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(Math.round(now.getMinutes() / 5) * 5).padStart(2, '0');
    resumeTimeInput.value = `${hours}:${minutes}`;
    
    // Initialize the custom time picker
    initializeCustomTimePicker(resumeTimeInput);
}

function closeResumeTaskModal() {
    document.getElementById('resumeTaskModal').classList.remove('active');
    currentResumeTaskId = null;
}

async function handleResumeTaskSubmit(e) {
    e.preventDefault();

    const resumeDate = document.getElementById('resumeDate').value;
    const resumeTime24 = document.getElementById('resumeTime').value;

    if (!resumeDate || !resumeTime24) {
        showToast('Error', 'Please select both resume date and time', 'error');
        return;
    }

    // Convert 24-hour format to 12-hour AM/PM format
    const [hours24, minutes] = resumeTime24.split(':').map(Number);
    const period = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 % 12 || 12;
    const resumeTime = `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
    
    // Convert to datetime format
    const resumeDatetime = `${resumeDate} ${resumeTime}`;

    showLoading(true);

    const result = await apiCall(`tasks/resume/${currentResumeTaskId}`, 'POST', {
        resume_datetime: resumeDatetime
    });

    showLoading(false);
    closeResumeTaskModal();

    if (result && result.success) {
        showToast('Success!', 'Task resumed successfully', 'success');
        // Refresh ongoing tasks, calendar, and sidebar
        loadOngoingTasks();
        refreshCalendarEvents();
        loadTasks();
    } else {
        showToast('Error', result?.message || 'Failed to resume task', 'error');
    }
}

async function resumeTask(taskId) {
    console.log('Resume task called with taskId:', taskId);
    console.log('Task data:', taskDataMap.get(taskId));
    openResumeTaskModal(taskId);
}

function openEndTaskModal(taskId, startDateStr = null) {
    console.log('Opening end task modal for task:', taskId);
    currentEndTaskId = taskId;

    // Get start date from task data if available
    let defaultStartDate = startDateStr;
    if (!defaultStartDate && taskDataMap.has(taskId)) {
        const taskData = taskDataMap.get(taskId);
        defaultStartDate = taskData.startDate;
    }

    // Show modal first
    const modal = document.getElementById('endTaskModal');
    modal.classList.add('active');
    console.log('Modal opened, classes:', modal.className);

    // Initialize end date and time pickers after modal is visible
    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
        initializeEndDateTimePickers(defaultStartDate);
    }, 100);
}

function closeEndTaskModal() {
    document.getElementById('endTaskModal').classList.remove('active');
    currentEndTaskId = null;
}

async function endTask(taskId) {
    console.log('End task called with taskId:', taskId);
    console.log('Task data:', taskDataMap.get(taskId));
    // Get start date from stored task data
    const taskData = taskDataMap.get(taskId);
    const startDate = taskData ? taskData.startDate : null;
    openEndTaskModal(taskId, startDate);
}

// Handle End Task Form Submission
async function handleEndTaskSubmit(e) {
    e.preventDefault();
    
    if (!currentEndTaskId) {
        showToast('Error', 'No task selected', 'error');
        return;
    }
    
    const endDate = document.getElementById('endDate').value;
    const endTime24 = document.getElementById('endTime').value;
    
    if (!endDate || !endTime24) {
        showToast('Error', 'Please select both end date and time', 'error');
        return;
    }
    
    // Convert 24-hour format to 12-hour AM/PM format
    const [hours24, minutes] = endTime24.split(':').map(Number);
    const period = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 % 12 || 12;
    const endTime = `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
    
    // Format datetime as "YYYY-MM-DD HH:MM AM/PM"
    const endDatetime = `${endDate} ${endTime}`;
    
    console.log('Ending task:', currentEndTaskId, 'at', endDatetime);
    
    closeEndTaskModal();
    showLoading(true);
    
    const result = await apiCall(`tasks/end/${currentEndTaskId}`, 'POST', {
        end_datetime: endDatetime
    });
    
    showLoading(false);
    
    if (result && result.success) {
        showToast('Success!', 'Task ended successfully', 'success');
        
        // Refresh ongoing tasks, calendar, and sidebar
        loadOngoingTasks();
        refreshCalendarEvents();
        loadTasks();
    } else {
        showToast('Error', result?.message || 'Failed to end task', 'error');
    }
}

// ===== CUSTOM TIME PICKER =====
let currentTimePicker = null;
let currentTimeInput = null;
let autoSwitchTimer = null;

function initializeCustomTimePicker(inputElement, defaultTime = null) {
    // Set default time if provided
    if (defaultTime) {
        inputElement.value = defaultTime;
    } else {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        // Round minutes to nearest 5
        const minutes = Math.round(now.getMinutes() / 5) * 5;
        const minutesStr = String(minutes % 60).padStart(2, '0');
        inputElement.value = `${hours}:${minutesStr}`;
    }

    // Make input readonly and add click handler
    inputElement.readOnly = true;
    inputElement.style.cursor = 'pointer';
    
    inputElement.addEventListener('click', function() {
        openCustomTimePicker(inputElement);
    });
}

function openCustomTimePicker(inputElement) {
    currentTimeInput = inputElement;
    
    // Parse current time
    const timeValue = inputElement.value || '12:00';
    const [hours24, minutesRaw] = timeValue.split(':').map(Number);
    
    // Round minutes to nearest 5
    const minutes = Math.round(minutesRaw / 5) * 5;
    
    // Convert to 12-hour format
    let hours12 = hours24 % 12 || 12;
    const period = hours24 >= 12 ? 'PM' : 'AM';
    
    // Create or get time picker modal
    let modal = document.getElementById('customTimePickerModal');
    if (!modal) {
        modal = createTimePickerModal();
        document.body.appendChild(modal);
    }
    
    // Set initial values
    document.getElementById('timePickerHour').value = String(hours12).padStart(2, '0');
    document.getElementById('timePickerMinute').value = String(minutes % 60).padStart(2, '0');
    
    // Set AM/PM
    document.querySelectorAll('.am-pm-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.period === period);
    });
    
    // Set hour mode as default (hour input active)
    modal.querySelector('#timePickerHour').classList.add('active');
    modal.querySelector('#timePickerMinute').classList.remove('active');
    switchToHourMode();
    
    // Update clock display
    updateClockDisplay(hours12, minutes);
    
    // Show modal
    modal.classList.add('active');
    currentTimePicker = modal;
}

function createTimePickerModal() {
    const modal = document.createElement('div');
    modal.id = 'customTimePickerModal';
    modal.className = 'time-picker-modal';
    
    modal.innerHTML = `
        <div class="time-picker-container">
            <div class="time-picker-header">
                <div class="time-picker-title">Select time</div>
                <div class="time-input-section">
                    <div class="time-input-group">
                        <input type="text" id="timePickerHour" class="time-input active" maxlength="2" value="01" readonly>
                        <span class="time-separator">:</span>
                        <input type="text" id="timePickerMinute" class="time-input" maxlength="2" value="00" readonly>
                    </div>
                    <div class="am-pm-toggle">
                        <button class="am-pm-btn active" data-period="AM">AM</button>
                        <button class="am-pm-btn" data-period="PM">PM</button>
                    </div>
                </div>
            </div>
            
            <div class="time-clock-section">
                <div class="clock-display" id="clockDisplay">
                    <div class="clock-center"></div>
                    <div class="clock-hand"></div>
                </div>
            </div>
            
            <div class="time-picker-actions">
                <button class="time-picker-btn cancel" onclick="closeCustomTimePicker()">Cancel</button>
                <button class="time-picker-btn ok" onclick="applyCustomTimePicker()">OK</button>
            </div>
        </div>
    `;
    
    // Add clock numbers
    const clockDisplay = modal.querySelector('#clockDisplay');
    for (let i = 1; i <= 12; i++) {
        const number = document.createElement('div');
        number.className = 'clock-number';
        number.textContent = i;
        number.dataset.value = i;
        
        // Position clock numbers in a circle (12 at top)
        const angle = (i - 3) * 30; // Start from 12 at top (subtract 3 hours to start at 12)
        const angleRad = (angle * Math.PI) / 180;
        const radius = 100; // Distance from center in pixels
        const x = 50 + (radius / 140) * 50 * Math.cos(angleRad); // 140 is half of clock size
        const y = 50 + (radius / 140) * 50 * Math.sin(angleRad);
        
        number.style.left = `calc(${x}% - 20px)`;
        number.style.top = `calc(${y}% - 20px)`;
        
        // Use onclick (not addEventListener) so it can be easily replaced when switching modes
        number.onclick = function(e) {
            // Stop event propagation to prevent clock face handler from firing
            e.stopPropagation();
            selectHour(i);
        };
        
        clockDisplay.appendChild(number);
    }
    
    // Add event listeners for AM/PM toggle
    modal.querySelectorAll('.am-pm-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            modal.querySelectorAll('.am-pm-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Hour input click - allow selecting hours
    const hourInput = modal.querySelector('#timePickerHour');
    hourInput.addEventListener('click', function() {
        // Clear any pending auto-switch timer
        if (autoSwitchTimer) {
            clearTimeout(autoSwitchTimer);
            autoSwitchTimer = null;
        }
        // Highlight hour selection mode
        this.classList.add('active');
        modal.querySelector('#timePickerMinute').classList.remove('active');
        switchToHourMode();
    });
    
    // Minute input click - allow selecting minutes
    const minuteInput = modal.querySelector('#timePickerMinute');
    minuteInput.addEventListener('click', function() {
        // Clear any pending auto-switch timer
        if (autoSwitchTimer) {
            clearTimeout(autoSwitchTimer);
            autoSwitchTimer = null;
        }
        // Highlight minute selection mode
        this.classList.add('active');
        modal.querySelector('#timePickerHour').classList.remove('active');
        switchToMinuteMode();
    });
    
    // Close on background click
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeCustomTimePicker();
        }
    });
    
    // Add clock face click support for better UX - only for empty areas, not numbers
    clockDisplay.addEventListener('click', function(e) {
        // Don't handle clicks on clock numbers - they have their own handlers
        if (e.target.classList.contains('clock-number')) {
            return;
        }
        
        if (e.target === clockDisplay || e.target.classList.contains('clock-center') || e.target.classList.contains('clock-hand')) {
            const rect = clockDisplay.getBoundingClientRect();
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const x = e.clientX - rect.left - centerX;
            const y = e.clientY - rect.top - centerY;
            
            // Calculate angle from center
            let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
            if (angle < 0) angle += 360;
            
            const hourInput = modal.querySelector('#timePickerHour');
            const minuteInput = modal.querySelector('#timePickerMinute');
            const isMinuteMode = minuteInput.classList.contains('active');
            
            if (isMinuteMode) {
                // Convert angle to minute (0-59), round to nearest 5
                let minute = Math.round(angle / 6);
                minute = Math.round(minute / 5) * 5;
                if (minute >= 60) minute = 0;
                selectMinute(minute);
            } else {
                // Convert angle to hour (1-12)
                let hour = Math.round(angle / 30);
                if (hour === 0) hour = 12;
                selectHour(hour);
            }
        }
    });
    
    return modal;
}

function switchToMinuteMode() {
    const modal = document.getElementById('customTimePickerModal');
    const clockDisplay = modal.querySelector('#clockDisplay');
    
    // Update clock numbers to show minutes (5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 00)
    const numbers = clockDisplay.querySelectorAll('.clock-number');
    numbers.forEach((number, index) => {
        // index 0 = 1 on clock face, but we want it to be 5 minutes
        // index 11 = 12 on clock face, but we want it to be 00 minutes
        const minuteValue = (index + 1) * 5 % 60; // 5, 10, 15, ..., 55, 0
        const displayValue = minuteValue === 0 ? '00' : String(minuteValue).padStart(2, '0');
        number.textContent = displayValue;
        number.dataset.value = minuteValue;
        
        number.onclick = function(e) {
            // Stop event propagation to prevent clock face handler from firing
            e.stopPropagation();
            selectMinute(parseInt(this.dataset.value));
        };
    });
    
    // Update clock hand to show current minute
    const minutes = parseInt(modal.querySelector('#timePickerMinute').value);
    updateClockDisplay(null, minutes);
}

function switchToHourMode() {
    const modal = document.getElementById('customTimePickerModal');
    const clockDisplay = modal.querySelector('#clockDisplay');
    
    // Update clock numbers to show hours (1-12)
    const numbers = clockDisplay.querySelectorAll('.clock-number');
    numbers.forEach((number, index) => {
        const hourValue = index + 1;
        number.textContent = hourValue;
        number.dataset.value = hourValue;
        
        number.onclick = function(e) {
            // Stop event propagation to prevent clock face handler from firing
            e.stopPropagation();
            selectHour(parseInt(this.dataset.value));
        };
    });
    
    // Update clock hand to show current hour
    const hours = parseInt(modal.querySelector('#timePickerHour').value);
    updateClockDisplay(hours, null);
}

function selectHour(hour) {
    const modal = document.getElementById('customTimePickerModal');
    const hourInput = modal.querySelector('#timePickerHour');
    hourInput.value = String(hour).padStart(2, '0');
    updateClockDisplay(hour, null);
    
    // Clear any existing timer
    if (autoSwitchTimer) {
        clearTimeout(autoSwitchTimer);
    }
    
    // Auto-switch to minute selection after a short delay
    autoSwitchTimer = setTimeout(() => {
        const minuteInput = modal.querySelector('#timePickerMinute');
        minuteInput.click();
        autoSwitchTimer = null;
    }, 350);
}

function selectMinute(minute) {
    // Clear any pending auto-switch timer to prevent interference
    if (autoSwitchTimer) {
        clearTimeout(autoSwitchTimer);
        autoSwitchTimer = null;
    }
    
    const modal = document.getElementById('customTimePickerModal');
    const minuteInput = modal.querySelector('#timePickerMinute');
    minuteInput.value = String(minute).padStart(2, '0');
    updateClockDisplay(null, minute);
    
    // After selecting minute, highlight the minute input
    minuteInput.classList.add('active');
    modal.querySelector('#timePickerHour').classList.remove('active');
}

function updateClockDisplay(hours = null, minutes = null) {
    const modal = document.getElementById('customTimePickerModal');
    if (!modal) return;
    
    const clockHand = modal.querySelector('.clock-hand');
    const numbers = modal.querySelectorAll('.clock-number');
    
    // Determine if we're in hour or minute mode
    const hourInput = modal.querySelector('#timePickerHour');
    const minuteInput = modal.querySelector('#timePickerMinute');
    const isMinuteMode = minuteInput.classList.contains('active');
    
    if (isMinuteMode) {
        // Minute mode
        const currentMinute = minutes !== null ? minutes : parseInt(minuteInput.value);
        // Calculate angle: 0 minutes = 0 degrees (12 o'clock position), 15 minutes = 90 degrees (3 o'clock)
        const angle = currentMinute * 6; // 6 degrees per minute
        clockHand.style.setProperty('--angle', `${angle}deg`);
        
        // Highlight active number
        numbers.forEach(num => {
            const numValue = parseInt(num.dataset.value);
            // Match the minute value
            num.classList.toggle('active', numValue === currentMinute);
        });
    } else {
        // Hour mode
        const currentHour = hours !== null ? hours : parseInt(hourInput.value);
        // Calculate angle: 12 = 0 degrees (12 o'clock), 3 = 90 degrees (3 o'clock)
        // We subtract 3 from hour to start from 12 at top, then multiply by 30
        const angle = (currentHour % 12) * 30; // 30 degrees per hour
        clockHand.style.setProperty('--angle', `${angle}deg`);
        
        // Highlight active number
        numbers.forEach(num => {
            const numValue = parseInt(num.dataset.value);
            num.classList.toggle('active', numValue === currentHour);
        });
    }
}

function updateClockFromInputs() {
    const modal = document.getElementById('customTimePickerModal');
    if (!modal) return;
    
    const hourInput = modal.querySelector('#timePickerHour');
    const minuteInput = modal.querySelector('#timePickerMinute');
    
    if (minuteInput.classList.contains('active')) {
        updateClockDisplay(null, parseInt(minuteInput.value));
    } else {
        updateClockDisplay(parseInt(hourInput.value), null);
    }
}

function closeCustomTimePicker() {
    // Clear any pending auto-switch timer
    if (autoSwitchTimer) {
        clearTimeout(autoSwitchTimer);
        autoSwitchTimer = null;
    }
    
    const modal = document.getElementById('customTimePickerModal');
    if (modal) {
        modal.classList.remove('active');
    }
    currentTimePicker = null;
    currentTimeInput = null;
}

function applyCustomTimePicker() {
    // Clear any pending auto-switch timer
    if (autoSwitchTimer) {
        clearTimeout(autoSwitchTimer);
        autoSwitchTimer = null;
    }
    
    const modal = document.getElementById('customTimePickerModal');
    if (!modal || !currentTimeInput) return;
    
    const hours12 = parseInt(modal.querySelector('#timePickerHour').value);
    const minutes = parseInt(modal.querySelector('#timePickerMinute').value);
    const period = modal.querySelector('.am-pm-btn.active').dataset.period;
    
    // Convert to 24-hour format
    let hours24 = hours12;
    if (period === 'PM' && hours12 !== 12) {
        hours24 = hours12 + 12;
    } else if (period === 'AM' && hours12 === 12) {
        hours24 = 0;
    }
    
    // Set the value in HH:MM format
    const timeString = `${String(hours24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    currentTimeInput.value = timeString;
    
    closeCustomTimePicker();
}

// Make functions globally available
window.closeCustomTimePicker = closeCustomTimePicker;
window.applyCustomTimePicker = applyCustomTimePicker;

// ==========================================
// Bulk Upload Functions
// ==========================================

function openBulkUploadModal() {
    document.getElementById('bulkUploadModal').classList.add('active');
    
    // Reset form
    document.getElementById('bulkUploadForm').reset();
    document.getElementById('fileName').textContent = 'Choose a CSV file or drag it here';
    document.getElementById('uploadProgress').style.display = 'none';
    document.getElementById('uploadResults').style.display = 'none';
}

function closeBulkUploadModal() {
    document.getElementById('bulkUploadModal').classList.remove('active');
}

window.closeBulkUploadModal = closeBulkUploadModal;

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        document.getElementById('fileName').textContent = file.name;
    } else {
        document.getElementById('fileName').textContent = 'Choose a CSV file or drag it here';
    }
}

async function downloadCSVTemplate() {
    try {
        const response = await fetch('/api/tasks/csv-template');
        
        if (!response.ok) {
            throw new Error('Failed to download template');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'dtm_tasks_template.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showToast('Success', 'CSV template downloaded', 'success');
    } catch (error) {
        console.error('Error downloading template:', error);
        showToast('Error', 'Failed to download CSV template', 'error');
    }
}

async function handleBulkUpload(event) {
    event.preventDefault();
    
    const fileInput = document.getElementById('csvFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showToast('Error', 'Please select a CSV file', 'error');
        return;
    }
    
    // Show progress
    const progressDiv = document.getElementById('uploadProgress');
    const resultsDiv = document.getElementById('uploadResults');
    const uploadBtn = document.getElementById('btnUploadCSV');
    
    progressDiv.style.display = 'block';
    resultsDiv.style.display = 'none';
    uploadBtn.disabled = true;
    
    document.getElementById('progressMessage').textContent = 'Validating CSV...';
    document.getElementById('progressCount').textContent = '';
    document.getElementById('progressBarFill').style.width = '10%';
    
    try {
        // Prepare form data
        const formData = new FormData();
        formData.append('file', file);
        
        // Upload CSV
        const response = await fetch('/api/tasks/bulk-upload', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            // Validation errors
            if (result.errors) {
                showValidationErrors(result);
            } else {
                throw new Error(result.message || 'Upload failed');
            }
        } else {
            // Success
            showUploadResults(result);
            showToast('Success', `Uploaded ${result.stats.success} tasks successfully`, 'success');
            
            // Refresh calendar if tasks were added
            if (result.stats.success > 0) {
                setTimeout(() => {
                    loadTasksForDate(selectedDate);
                    calendar.refetchEvents();
                }, 1000);
            }
        }
        
    } catch (error) {
        console.error('Error uploading CSV:', error);
        showToast('Error', error.message || 'Failed to upload CSV', 'error');
        progressDiv.style.display = 'none';
    } finally {
        uploadBtn.disabled = false;
    }
}

function showValidationErrors(result) {
    const progressDiv = document.getElementById('uploadProgress');
    const resultsDiv = document.getElementById('uploadResults');
    
    progressDiv.style.display = 'none';
    resultsDiv.style.display = 'block';
    
    const detailsDiv = document.getElementById('resultsDetails');
    detailsDiv.innerHTML = `
        <div class="validation-errors">
            <h4><i class="fas fa-exclamation-triangle"></i> Validation Errors</h4>
            <ul>
                ${result.errors.map(error => `<li>${error}</li>`).join('')}
            </ul>
            <p><strong>${result.valid_tasks || 0}</strong> valid tasks found</p>
        </div>
    `;
    
    document.getElementById('successCount').textContent = '0';
    document.getElementById('failedCount').textContent = result.errors.length;
}

function showUploadResults(result) {
    const progressDiv = document.getElementById('uploadProgress');
    const resultsDiv = document.getElementById('uploadResults');
    
    // Update progress to 100%
    document.getElementById('progressBarFill').style.width = '100%';
    document.getElementById('progressMessage').textContent = 'Upload complete!';
    
    // Show results
    setTimeout(() => {
        progressDiv.style.display = 'none';
        resultsDiv.style.display = 'block';
        
        document.getElementById('successCount').textContent = result.stats.success;
        document.getElementById('failedCount').textContent = result.stats.failed;
        
        // Show detailed results
        const detailsDiv = document.getElementById('resultsDetails');
        
        if (result.results && result.results.length > 0) {
            const failedResults = result.results.filter(r => !r.success);
            const warningResults = result.results.filter(r => r.success && r.warning);
            
            let detailsHTML = '';
            
            if (failedResults.length > 0) {
                detailsHTML += `
                    <div class="failed-tasks">
                        <h4><i class="fas fa-times-circle"></i> Failed Tasks</h4>
                        <ul>
                            ${failedResults.map(r => `
                                <li>Row ${r.row}: ${r.message}</li>
                            `).join('')}
                        </ul>
                    </div>
                `;
            }
            
            if (warningResults.length > 0) {
                detailsHTML += `
                    <div class="warning-tasks">
                        <h4><i class="fas fa-exclamation-circle"></i> Warnings</h4>
                        <ul>
                            ${warningResults.map(r => `
                                <li>Row ${r.row}: ${r.message} - ${r.warning}</li>
                            `).join('')}
                        </ul>
                    </div>
                `;
            }
            
            detailsDiv.innerHTML = detailsHTML;
        } else {
            detailsDiv.innerHTML = '<p>All tasks uploaded successfully!</p>';
        }
    }, 500);
}

console.log('DTM Task Manager initialized ✓');

