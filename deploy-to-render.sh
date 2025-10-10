#!/bin/bash

# Render Deployment Script for Distributed System
echo "🚀 Deploying distributed Product Management System to Render..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if render CLI is installed
if ! command -v render &> /dev/null; then
    echo -e "${RED}❌ Render CLI not found. Installing...${NC}"
    npm install -g @render-io/cli
fi

# Check if logged in to render
if ! render whoami &> /dev/null; then
    echo -e "${BLUE}🔐 Please login to Render first:${NC}"
    echo "render login"
    exit 1
fi

echo -e "${GREEN}✅ Render CLI ready${NC}"

# Deploy services
echo -e "${BLUE}📦 Deploying services from render.yaml...${NC}"

# Deploy all services defined in render.yaml
render deploy

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Deployment initiated successfully!${NC}"
    echo ""
    echo -e "${BLUE}🌐 Service URLs:${NC}"
    echo "  Node 1: https://product-management-node-1.onrender.com"
    echo "  Node 2: https://product-management-node-2.onrender.com" 
    echo "  Node 3: https://product-management-node-3.onrender.com"
    echo "  Frontend: https://product-management-frontend.onrender.com"
    echo ""
    echo -e "${BLUE}📊 Monitoring:${NC}"
    echo "  Health Check: https://product-management-node-1.onrender.com/health"
    echo "  Cluster Status: https://product-management-node-1.onrender.com/api/nodes/cluster"
    echo ""
    echo -e "${BLUE}⏳ Note: Services may take 5-10 minutes to fully start and discover each other.${NC}"
    echo -e "${BLUE}🔄 Node discovery will happen automatically after all services are running.${NC}"
else
    echo -e "${RED}❌ Deployment failed!${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Distributed system deployment completed!${NC}"