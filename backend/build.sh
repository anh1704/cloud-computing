# Render Build Script
# This file is used by Render to build the backend service

echo "🔧 Starting Render build process..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Verify environment
echo "🔍 Verifying environment..."
node --version
npm --version

# Check if required files exist
if [ ! -f "src/app.js" ]; then
    echo "❌ app.js not found!"
    exit 1
fi

echo "✅ Build completed successfully!"
echo "🚀 Starting application..."