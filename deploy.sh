#!/bin/bash

# Bulk SMS Platform Deployment Script
set -e

echo "🚀 Starting Bulk SMS Platform Deployment..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ .env file not found"
    exit 1
fi

# Check required environment variables
required_vars=(
    "DB_USER" "DB_PASSWORD" "DB_NAME"
    "JWT_SECRET" "REFRESH_TOKEN_SECRET"
    "TWILIO_ACCOUNT_SID" "TWILIO_AUTH_TOKEN" "TWILIO_PHONE_NUMBER"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Missing required environment variable: $var"
        exit 1
    fi
done

echo "✅ Environment variables loaded"

# Create network if it doesn't exist
docker network create bulksms_network 2>/dev/null || true

# Build and start services
echo "🔨 Building and starting services..."
docker-compose -f docker-compose.prod.yml up --build -d

echo "⏳ Waiting for services to be healthy..."
sleep 30

# Check service health
echo "🏥 Checking service health..."
services=("postgres_prod" "redis_prod" "backend_prod")
for service in "${services[@]}"; do
    container_id=$(docker ps -qf "name=bulksms_${service}")
    if [ -z "$container_id" ]; then
        echo "❌ Service bulksms_${service} is not running"
        docker-compose -f docker-compose.prod.yml logs "${service#*_}"
        exit 1
    fi
    echo "✅ bulksms_${service} is running"
done

# Initialize database
echo "🗄️ Initializing database..."
docker exec bulksms_backend_prod node -e "
const { syncDatabase } = require('./dist/utils/dbSync');
syncDatabase(false).then(() => {
    console.log('✅ Database initialized');
    process.exit(0);
}).catch(error => {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
});
"

echo "🎉 Deployment completed successfully!"
echo ""
echo "📊 Service Status:"
echo "   Frontend:    http://localhost"
echo "   Backend API: http://localhost:3000"
echo "   API Health:  http://localhost:3000/health"
echo ""
echo "🔑 Default Admin Credentials:"
echo "   Email:    admin@bulksms.com"
echo "   Password: Admin@123"
echo ""
echo "📝 Next Steps:"
echo "   1. Access the dashboard at http://localhost"
echo "   2. Login with admin credentials"
echo "   3. Configure SMS gateway settings"
echo "   4. Add credits to your account"
echo "   5. Start sending bulk SMS!"
