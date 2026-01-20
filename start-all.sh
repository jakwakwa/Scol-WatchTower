#!/bin/bash

# Function to handle cleanup on exit
cleanup() {
    echo "Stopping all services..."
    kill $(jobs -p) 2>/dev/null
    exit
}

# Trap SIGINT (Ctrl+C)
trap cleanup SIGINT

echo "🚀 Starting Local Development Environment..."

# 1. Start Temporal Server (Background)
# Assuming 'temporal' CLI is installed. If not, you might need to use 'brew install temporal' or similar.
echo "⏳ Starting Temporal Server..."
temporal server start-dev --ui-port 8080 &
TEMPORAL_PID=$!

# Wait a bit for Temporal to initialize
sleep 5

# 2. Start Temporal Worker (Background)
echo "👷 Starting Temporal Worker..."
bun run scripts/temporal-worker.ts &
WORKER_PID=$!

# 3. Start Next.js App (Background)
echo "💻 Starting Next.js App..."
bun run dev &
NEXT_PID=$!

# Wait for all processes
echo "✅ All services started!"
echo "   - Temporal UI: http://localhost:8080"
echo "   - Next.js App: http://localhost:3000"
echo "Press Ctrl+C to stop all services."

wait
