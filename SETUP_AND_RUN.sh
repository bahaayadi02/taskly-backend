#!/bin/bash

echo "🚀 Setting up Taskly Backend..."
echo ""

# Install WebSocket dependencies
echo "📦 Installing WebSocket dependencies..."
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io

# Install Firebase Admin (optional for push notifications)
echo "📦 Installing Firebase Admin SDK..."
npm install firebase-admin

echo ""
echo "✅ All dependencies installed!"
echo ""
echo "🚀 Starting the server..."
echo ""

# Start the development server
npm run start:dev
