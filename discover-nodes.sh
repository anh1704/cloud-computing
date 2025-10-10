#!/bin/bash

# Node Discovery and Registration Script
# This script helps nodes discover and register with each other

NODE_ID="${1:-node-$(date +%s)}"
PORT="${2:-5000}"
DISCOVERY_NODES="${3:-}"

echo "🔍 Starting node discovery for $NODE_ID on port $PORT"

if [ -n "$DISCOVERY_NODES" ]; then
    echo "📡 Discovery nodes configured: $DISCOVERY_NODES"
    
    IFS=',' read -ra NODES <<< "$DISCOVERY_NODES"
    for node in "${NODES[@]}"; do
        IFS=':' read -ra ADDR <<< "$node"
        HOST="${ADDR[0]}"
        NODE_PORT="${ADDR[1]}"
        
        if [ "$NODE_PORT" != "$PORT" ]; then
            echo "🔗 Attempting to register with node at $HOST:$NODE_PORT"
            
            # Try to register with the discovered node
            curl -s -X POST "http://$HOST:$NODE_PORT/api/nodes/register" \
                -H "Content-Type: application/json" \
                -d "{\"nodeId\":\"$NODE_ID\",\"port\":$PORT}" \
                > /dev/null 2>&1
            
            if [ $? -eq 0 ]; then
                echo "✅ Successfully registered with node at $HOST:$NODE_PORT"
            else
                echo "❌ Failed to register with node at $HOST:$NODE_PORT"
            fi
        fi
    done
else
    echo "ℹ️  No discovery nodes configured. Running in standalone mode."
fi

echo "🚀 Node discovery completed"