// DTM Task Manager - Main JavaScript

let calendar;
let taskTypes = [];
let projects = [];
let categories = [];
let activities = [];
let currentTaskId = null;
let selectedDate = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    // Check if already logged in
    checkLoginStatus();
    
    // Setup event listeners
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('startTaskForm').addEventListener('submit', handleStartTask);
    document.getElementById('btnStartTask').addEventListener('click', () => openStartTaskModal());
    document.getElementById('btnLogout').addEventListener('click', handleLogout);
    
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
        
        if (!response.ok && response.status === 401) {
            showToast('Session expired', 'Please login again', 'error');
            showLoginScreen();
            return null;
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
    showLoginScreen();
    showToast('Logged out', 'You have been logged out', 'success');
}

// Screen Management
function showLoginScreen() {
    document.getElementById('appScreen').classList.remove('active');
    document.getElementById('loginScreen').classList.add('active');
    document.getElementById('password').value = '';
}

function showAppScreen() {
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('appScreen').classList.add('active');
    
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
        
        const task = {
            index: row[0],  // Already a number
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
        
        // Store task data for later use
        if (task.index) {
            taskDataMap.set(String(task.index), task);
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
    
    const statusClass = task.status.toLowerCase().includes('on going') ? 'running' : 
                       task.status.toLowerCase().includes('pause') ? 'paused' : 'completed';
    
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
                <button class="btn btn-warning btn-sm" onclick="pauseTask('${task.index}')">
                    <i class="fas fa-pause"></i>
                    Pause
                </button>
                <button class="btn btn-danger btn-sm" onclick="endTask('${task.index}')">
                    <i class="fas fa-stop"></i>
                    End
                </button>
            ` : statusClass === 'paused' ? `
                <button class="btn btn-success btn-sm" onclick="resumeTask('${task.index}')">
                    <i class="fas fa-play"></i>
                    Resume
                </button>
                <button class="btn btn-danger btn-sm" onclick="endTask('${task.index}')">
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

    // Initialize date and time pickers after modal is visible
    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
        initializeStartDateTimePickers(dateStr);
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

    // Initialize time picker with Flatpickr
    flatpickr(startTimeEl, {
        enableTime: true,
        noCalendar: true,
        dateFormat: 'H:i',
        time_24hr: true,
        defaultDate: now,
        allowInput: false,
        clickOpens: true,
        appendTo: document.body // Append to body to avoid overflow issues
    });
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

    // Initialize time picker with Flatpickr
    const now = new Date();
    flatpickr(endTimeEl, {
        enableTime: true,
        noCalendar: true,
        dateFormat: 'H:i',
        time_24hr: true,
        defaultDate: now,
        allowInput: false,
        clickOpens: true,
        appendTo: document.body // Append to body to avoid overflow issues
    });
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
    showToast('Info', 'Pause functionality coming soon', 'warning');
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
                if (status.includes('On Going') || status.includes('Pause')) {
                    calendar.addEvent({
                        title: description,
                        start: eventDate,
                        allDay: true,
                        backgroundColor: status.includes('Pause') ? '#f59e0b' : '#6366f1',
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
    
    const statusClass = task.status.toLowerCase().includes('on going') ? 'running' : 
                       task.status.toLowerCase().includes('pause') ? 'paused' : 'completed';
    
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
                <button class="btn btn-warning btn-sm" onclick="pauseTask('${task.index}')">
                    <i class="fas fa-pause"></i>
                    Pause
                </button>
                <button class="btn btn-danger btn-sm" onclick="endTask('${task.index}')">
                    <i class="fas fa-stop"></i>
                    End
                </button>
            ` : statusClass === 'paused' ? `
                <button class="btn btn-success btn-sm" onclick="resumeTask('${task.index}')">
                    <i class="fas fa-play"></i>
                    Resume
                </button>
                <button class="btn btn-danger btn-sm" onclick="endTask('${task.index}')">
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
async function pauseTask(taskId) {
    console.log('Pause task:', taskId);

    if (!confirm('Are you sure you want to pause this task?')) {
        return;
    }

    showLoading(true);

    const result = await apiCall(`tasks/pause/${taskId}`, 'POST');

    showLoading(false);

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

async function resumeTask(taskId) {
    console.log('Resume task:', taskId);
    showToast('Info', 'Resume functionality not yet implemented', 'warning');
    // TODO: Implement resume functionality if supported by DTM API
}

// Store the task ID for ending
let currentEndTaskId = null;
// Store task data for accessing start date
let taskDataMap = new Map();

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
    console.log('End task:', taskId);
    // Get start date from stored task data
    const taskData = taskDataMap.get(String(taskId));
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
    const endTime = document.getElementById('endTime').value;
    
    // Format datetime as "YYYY-MM-DD HH:MM:SS"
    const dateParts = endDate.split('-');
    const year = dateParts[0]; // Use full year
    const month = dateParts[1];
    const day = dateParts[2];
    const endDatetime = `${year}-${month}-${day} ${endTime}:00`;
    
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

console.log('DTM Task Manager initialized ✓');

