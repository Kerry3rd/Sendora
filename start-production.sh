#!/bin/bash

# Bulk SMS Platform Production Start Script

echo "🚀 Starting Bulk SMS Platform in Production Mode..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create one based on .env.example"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

echo "📦 Building and starting services..."
docker-compose -f docker-compose.prod.yml up --build -d

echo "⏳ Waiting for services to be ready..."
sleep 10

echo "🏥 Checking service health..."
echo ""

# Check each service
services=("postgres_prod" "redis_prod" "backend_prod" "frontend_prod" "worker_prod")
for service in "${services[@]}"; do
    container_id=$(docker ps -qf "name=bulksms_${service}")
    if [ -z "$container_id" ]; then
        echo "❌ bulksms_${service} is not running"
    else
        echo "✅ bulksms_${service} is running (Container ID: ${container_id:0:12})"
        
        # Check health for backend
        if [ "$service" = "backend_prod" ]; then
            sleep 5
            echo "   Testing API health..."
            if curl -f http://localhost:3000/health > /dev/null 2>&1; then
                echo "   ✅ API is healthy"
            else
                echo "   ❌ API health check failed"
            fi
        fi
    fi
done

echo ""
echo "🎉 Deployment completed!"
echo ""
echo "🔗 Access Points:"
echo "   🌐 Frontend:     http://localhost"
echo "   ⚙️  Backend API:  http://localhost:3000"
echo "   🏥 Health Check: http://localhost:3000/health"
echo "   📊 Diagnostics:  http://localhost:3000/api/v1/test/diagnostics"
echo ""
echo "📋 Next Steps:"
echo "   1. Open http://localhost in your browser"
echo "   2. Login with admin credentials"
echo "   3. Configure your SMS gateways in Settings"
echo "   4. Add credits to your account"
echo "   5. Start sending bulk SMS!"
echo ""
echo "🛑 To stop all services, run: docker-compose -f docker-compose.prod.yml down"
echo ""
echo "📝 Logs:"
echo "   View all logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "   View backend:  docker logs -f bulksms_backend_prod"
echo "   View frontend: docker logs -f bulksms_frontend_prod"
