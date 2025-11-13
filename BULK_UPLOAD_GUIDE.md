# Bulk Upload Feature Guide

## Overview
The Bulk Upload feature allows you to upload multiple tasks at once using a CSV file. This is particularly useful for:
- Adding historical tasks in bulk
- Planning tasks for multiple days ahead
- Importing tasks from other systems
- Quickly populating your task calendar

## How to Use

### Step 1: Download the CSV Template
1. Log in to the DTM Task Manager
2. Click the **"Bulk Upload"** button in the header (orange button with upload icon)
3. In the modal that opens, click **"Download CSV Template"**
4. Save the template file to your computer

### Step 2: Fill in the Template
Open the downloaded CSV file in Excel, Google Sheets, or any spreadsheet application and fill in your tasks.

#### Required Columns:
- **task_type**: Type of task (e.g., "Development", "Meeting", etc.)
- **project**: Project name (must match exactly with existing projects)
- **description**: What you're working on
- **start_date**: Date in YYYY-MM-DD format (e.g., 2025-11-13)
- **start_time**: Time in HH:MM format (e.g., 09:00)
- **end_time**: Time in HH:MM format (e.g., 10:30)

#### Optional Columns:
- **category**: Category name (if applicable)
- **activity**: Activity name (if applicable)

#### Example:
```csv
task_type,project,category,activity,description,start_date,start_time,end_time
Development,Mobile App PROJ - PropTech,Development,,Testing mobile app,2025-11-13,09:00,10:30
Development,Mobile App PROJ - PropTech,Development,,Code review,2025-11-13,10:30,12:00
```

### Step 3: Upload the CSV
1. Click the file upload area or drag and drop your CSV file
2. Click **"Upload Tasks"** button
3. Wait for the processing to complete
4. Review the results showing successful and failed uploads

## Important Notes

### Data Validation
- All task types and projects must exist in the system
- Invalid entries will be reported with specific error messages
- The system validates all data before processing any tasks

### Processing
- Tasks are processed **one by one** to ensure data integrity
- Each task is automatically started and ended based on your specified times
- Progress is shown in real-time during upload

### Date and Time Formats
- **Date**: Must be in YYYY-MM-DD format (e.g., 2025-11-13)
- **Time**: Can be in HH:MM or HH:MM:SS format (e.g., 09:00 or 09:00:00)
- Times are in 24-hour format

### Error Handling
If any row has errors:
- The system will show detailed error messages for each row
- No tasks will be uploaded if there are validation errors
- Fix the errors in your CSV and try uploading again

### Tips for Success
1. Always use the downloaded template to ensure correct column names
2. Double-check that task types and project names match exactly (case-insensitive)
3. Ensure dates are in the future or recent past (check system constraints)
4. Keep descriptions clear and concise
5. Test with a small CSV file first (2-3 tasks) before uploading large batches

## Troubleshooting

### "Invalid task_type" Error
- Make sure the task type name matches exactly with your available task types
- Check for extra spaces or special characters

### "Invalid project" Error
- Verify the project name is spelled correctly
- Project names are case-insensitive but must match exactly otherwise

### "Invalid date/time format" Error
- Ensure dates are in YYYY-MM-DD format
- Ensure times are in HH:MM or HH:MM:SS format
- Check for any extra spaces or invalid characters

### Tasks Not Showing Up
- Refresh the calendar view
- Check the correct date in the calendar
- Verify the task was marked as successful in the upload results

## API Endpoints

For developers integrating with the system:

### Download Template
```
GET /api/tasks/csv-template
```
Returns a CSV file with headers and an example row.

### Upload CSV
```
POST /api/tasks/bulk-upload
```
Multipart form data with file field named "file".

Response includes:
- Success/failure status
- Statistics (total, success, failed counts)
- Detailed results for each row

## Sample CSV File
A sample CSV file is provided in `test_bulk_tasks.csv` for reference.

