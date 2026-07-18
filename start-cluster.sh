#!/bin/bash

# Terminate all processes started by this script on exit
trap 'kill $(jobs -p) 2>/dev/null' EXIT

# Load environment variables from .env file if it exists
if [ -f .env ]; then
  echo "Loading configuration from .env file..."
  export $(grep -v '^#' .env | xargs)
fi

echo "Starting cache nodes..."
NODE_PORT=4001 NODE_REGION=us-east PORT=4001 node src/backend/server.js &
NODE_PORT=4002 NODE_REGION=us-west PORT=4002 node src/backend/server.js &
NODE_PORT=4003 NODE_REGION=eu-central PORT=4003 node src/backend/server.js &

# Give nodes a second to start
sleep 1

echo "Starting coordinator..."
PORT=4000 COORDINATOR_NODES=http://localhost:4001,http://localhost:4002,http://localhost:4003 node src/backend/coordinator.js &

echo "Cluster is running!"
echo "- Coordinator: http://localhost:4000"
echo "- Node 1 (us-east): http://localhost:4001"
echo "- Node 2 (us-west): http://localhost:4002"
echo "- Node 3 (eu-central): http://localhost:4003"
echo "Press Ctrl+C to stop the cluster."

# Keep script running
wait
