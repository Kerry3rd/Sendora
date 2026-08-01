#!/bin/bash

echo "🚀 Starting Bulk SMS Platform Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

print_status "Docker is running"

# Check if required files exist
if [ ! -f "backend/.env" ]; then
    print_warning "backend/.env not found, creating from template..."
    cp backend/.env.example backend/.env
    print_status "Created backend/.env - Please update with your configuration"
fi

if [ ! -f "frontend/.env" ]; then
    print_warning "frontend/.env not found, creating from template..."
    cp frontend/.env.example frontend/.env
    print_status "Created frontend/.env"
fi

# Start PostgreSQL and Redis
print_status "Starting database services..."
docker-compose up -d postgres redis

# Wait for databases to be ready
print_status "Waiting for databases to be ready..."
sleep 10

# Check if databases are healthy
if docker-compose ps | grep -q "healthy"; then
    print_status "Database services are healthy"
else
    print_error "Database services failed to start. Check logs with: docker-compose logs"
    exit 1
fi

# Install backend dependencies
print_status "Installing backend dependencies..."
cd backend
npm install

# Initialize database
print_status "Initializing database..."
npm run db:sync

# Start backend in background
print_status "Starting backend server..."
npm run dev &
BACKEND_PID=$!

# Wait for backend to start
print_status "Waiting for backend to start..."
sleep 10

# Check if backend is running
if curl -s http://localhost:3000/health > /dev/null; then
    print_status "Backend server is running on http://localhost:3000"
else
    print_error "Backend server failed to start. Check logs with: cd backend && npm run dev"
    exit 1
fi

# Install frontend dependencies
print_status "Installing frontend dependencies..."
cd ../frontend
npm install

# Start frontend
print_status "Starting frontend development server..."
npm start &
FRONTEND_PID=$!

# Wait for frontend to start
print_status "Waiting for frontend to start..."
sleep 15

# Check if frontend is running
if curl -s http://localhost:3001 > /dev/null; then
    print_status "Frontend server is running on http://localhost:3001"
else
    print_error "Frontend server failed to start. Check logs with: cd frontend && npm start"
    exit 1
fi

# Start SMS worker
print_status "Starting SMS worker..."
cd ../backend
npm run worker &
WORKER_PID=$!

print_status "SMS worker started in background"

echo ""
echo "=========================================="
echo "🎉 Bulk SMS Platform Development Started!"
echo "=========================================="
echo ""
echo "🔗 Access Points:"
echo "   Frontend:     http://localhost:3001"
echo "   Backend API:  http://localhost:3000"
echo "   API Health:   http://localhost:3000/health"
echo "   API Docs:     http://localhost:3000/api-docs"
echo ""
echo "🔑 Default Credentials:"
echo "   Email:    admin@bulksms.com"
echo "   Password: Admin@123"
echo ""
echo "📝 Test SMS Credentials:"
echo "   Using Virtual Gateway (no real SMS sent)"
echo "   Test Phone: +255123456789 (any number works)"
echo ""
echo "🛠️  Useful Commands:"
echo "   View logs:        docker-compose logs -f"
echo "   Stop services:    ./stop-development.sh"
echo "   Reset database:   cd backend && npm run db:reset"
echo ""
echo "📋 Development URLs:"
echo "   Dashboard:        http://localhost:3001"
echo "   Create Campaign:  http://localhost:3001/campaigns/create"
echo "   Manage Contacts:  http://localhost:3001/contacts"
echo "   View Analytics:   http://localhost:3001/analytics"
echo ""
echo "💡 Tip: The Virtual Gateway is enabled by default."
echo "       To use real SMS gateways, update backend/.env"
echo "       with your Twilio/MessageBird credentials."
echo ""

# Trap CTRL+C to stop services
trap 'echo ""; print_status "Stopping services..."; kill $BACKEND_PID $FRONTEND_PID $WORKER_PID 2>/dev/null; docker-compose down; exit' INT

# Keep script running
print_status "Press CTRL+C to stop all services"
wait
