#!/bin/bash

# Multi-Node Startup Script
# Starts multiple instances of the application on different ports

NODES="${1:-3}"
BASE_PORT="${2:-5000}"
DB_PREFIX="${3:-product_management}"

echo "🚀 Starting $NODES nodes with base port $BASE_PORT"

# Array to store PIDs for cleanup
PIDS=()

# Function to cleanup on exit
cleanup() {
    echo "🛑 Shutting down all nodes..."
    for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            echo "   Terminating process $pid"
            kill "$pid"
        fi
    done
    wait
    echo "✅ All nodes shut down"
}

# Set trap for cleanup on script exit
trap cleanup EXIT INT TERM

# Start nodes
for i in $(seq 0 $((NODES-1))); do
    NODE_PORT=$((BASE_PORT + i))
    NODE_ID="node-${NODE_PORT}"
    DB_NAME="${DB_PREFIX}_node_${i}"
    
    echo "📦 Starting node $i on port $NODE_PORT"
    
    # Create environment for this node
    export PORT="$NODE_PORT"
    export NODE_ID="$NODE_ID"
    export DATABASE_URL="postgresql://postgres:password@localhost:5432/$DB_NAME"
    
    # Build discovery nodes list (all other nodes)
    DISCOVERY_NODES=""
    for j in $(seq 0 $((NODES-1))); do
        if [ $j -ne $i ]; then
            DISCOVER_PORT=$((BASE_PORT + j))
            if [ -n "$DISCOVERY_NODES" ]; then
                DISCOVERY_NODES="$DISCOVERY_NODES,localhost:$DISCOVER_PORT"
            else
                DISCOVERY_NODES="localhost:$DISCOVER_PORT"
            fi
        fi
    done
    
    export DISCOVERY_NODES="$DISCOVERY_NODES"
    
    echo "   Node ID: $NODE_ID"
    echo "   Port: $NODE_PORT"
    echo "   Database: $DB_NAME"
    echo "   Discovery: $DISCOVERY_NODES"
    
    # Start the node in background
    cd "/Users/ngocanh/Documents/Cloud Computing/product-management-system/backend"
    npm start > "../logs/node-${NODE_PORT}.log" 2>&1 &
    
    NODE_PID=$!
    PIDS+=($NODE_PID)
    
    echo "   ✅ Node $i started with PID $NODE_PID"
    
    # Wait a bit before starting next node
    sleep 3
done

echo ""
echo "🌐 All $NODES nodes are starting up..."
echo "📊 Node status:"
for i in $(seq 0 $((NODES-1))); do
    NODE_PORT=$((BASE_PORT + i))
    echo "   Node $i: http://localhost:$NODE_PORT"
done

echo ""
echo "📝 Log files:"
for i in $(seq 0 $((NODES-1))); do
    NODE_PORT=$((BASE_PORT + i))
    echo "   Node $i: logs/node-$NODE_PORT.log"
done

echo ""
echo "⏳ Waiting for nodes to initialize..."
sleep 10

# Register nodes with each other
echo "🔗 Registering nodes with each other..."
for i in $(seq 0 $((NODES-1))); do
    NODE_PORT=$((BASE_PORT + i))
    for j in $(seq 0 $((NODES-1))); do
        if [ $i -ne $j ]; then
            TARGET_PORT=$((BASE_PORT + j))
            NODE_ID="node-${NODE_PORT}"
            
            echo "   Registering node-${NODE_PORT} with node at port $TARGET_PORT"
            curl -s -X POST "http://localhost:$TARGET_PORT/api/nodes/register" \
                -H "Content-Type: application/json" \
                -d "{\"nodeId\":\"$NODE_ID\",\"port\":$NODE_PORT}" \
                > /dev/null 2>&1
        fi
    done
done

echo "✅ Node registration completed"
echo ""
echo "🎯 Cluster is ready!"
echo "   Primary node: http://localhost:$BASE_PORT"
echo "   Health checks: http://localhost:$BASE_PORT/health"
echo "   Cluster info: http://localhost:$BASE_PORT/api/nodes/cluster"
echo ""
echo "Press Ctrl+C to stop all nodes..."

# Wait for all processes
wait