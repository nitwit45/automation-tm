#!/bin/bash

# DTM Bot Service Management Script
# Usage: ./manage_service.sh [start|stop|restart|status|logs|enable|disable]

SERVICE_NAME="dtmbot"

case "$1" in
    start)
        echo "Starting DTM Bot service..."
        sudo systemctl start $SERVICE_NAME
        ;;
    stop)
        echo "Stopping DTM Bot service..."
        sudo systemctl stop $SERVICE_NAME
        ;;
    restart)
        echo "Restarting DTM Bot service..."
        sudo systemctl restart $SERVICE_NAME
        ;;
    status)
        echo "DTM Bot service status:"
        sudo systemctl status $SERVICE_NAME --no-pager
        ;;
    logs)
        echo "DTM Bot service logs (last 50 lines):"
        sudo journalctl -u $SERVICE_NAME -n 50 --no-pager
        ;;
    enable)
        echo "Enabling DTM Bot service to start on boot..."
        sudo systemctl enable $SERVICE_NAME
        ;;
    disable)
        echo "Disabling DTM Bot service from starting on boot..."
        sudo systemctl disable $SERVICE_NAME
        ;;
    *)
        echo "DTM Bot Service Manager"
        echo "Usage: $0 {start|stop|restart|status|logs|enable|disable}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the service"
        echo "  stop    - Stop the service"
        echo "  restart - Restart the service"
        echo "  status  - Show service status"
        echo "  logs    - Show recent service logs"
        echo "  enable  - Enable auto-start on boot"
        echo "  disable - Disable auto-start on boot"
        echo ""
        echo "Service URL: http://$(hostname -I | awk '{print $1}'):5000"
        ;;
esac
