#!/bin/bash
# 24/7 Resilient Health Watchdog for Consultant Studio

LOG_FILE="/home/ubuntu/consultant/health_watchdog.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# 1. Health check HTTP endpoint
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://127.0.0.1:3000/ || true)

if [ "$HTTP_STATUS" != "200" ]; then
    echo "[$TIMESTAMP] Health check failed with status $HTTP_STATUS. Restarting consultant-studio via PM2..." >> "$LOG_FILE"
    /home/ubuntu/.local/lib/node_modules/pm2/bin/pm2 restart consultant-studio --update-env >> "$LOG_FILE" 2>&1
else
    # Keep log lightweight - trim if > 5000 lines
    if [ -f "$LOG_FILE" ] && [ $(wc -l < "$LOG_FILE") -gt 5000 ]; then
        tail -n 1000 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
    fi
fi
