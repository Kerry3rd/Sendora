#!/bin/bash

echo "🛑 Stopping Bulk SMS Platform Development Environment..."

# Stop frontend and backend processes
pkill -f "npm start" 2>/dev/null
pkill -f "npm run dev" 2>/dev/null
pkill -f "npm run worker" 2>/dev/null

# Stop Docker services
docker-compose down

echo "✅ All services stopped"
