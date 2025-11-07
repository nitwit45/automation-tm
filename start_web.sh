#!/bin/bash

echo "╔══════════════════════════════════════════╗"
echo "║  DTM Task Manager - Modern Web UI       ║"
echo "║                                          ║"
echo "║  Starting server...                      ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "Opening http://localhost:5000 in your browser..."
echo ""

# Start Flask in background
python app.py &

# Wait a moment for server to start
sleep 2

# Open in default browser
if command -v xdg-open > /dev/null; then
    xdg-open http://localhost:5000
elif command -v open > /dev/null; then
    open http://localhost:5000
else
    echo "Please open http://localhost:5000 in your browser"
fi

# Wait for Flask
wait

