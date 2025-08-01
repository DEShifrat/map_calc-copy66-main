#!/bin/bash

echo "Starting the application setup..."

# Check if Docker is installed
if ! command -v docker &> /dev/null
then
    echo "Docker is not installed. Please install Docker Desktop or Docker Engine first."
    echo "You can download it from: https://www.docker.com/get-started"
    exit 1
fi

echo "Docker found. Proceeding with Docker Compose..."

# Build the Docker image
echo "Building Docker image..."
docker-compose build

if [ $? -ne 0 ]; then
    echo "Docker image build failed. Please check the Dockerfile and your Docker installation."
    exit 1
fi

echo "Docker image built successfully."

# Run the Docker container in detached mode
echo "Starting Docker container..."
docker-compose up -d

if [ $? -ne 0 ]; then
    echo "Failed to start Docker container. Please check Docker Compose logs for errors."
    exit 1
fi

echo "Docker container started successfully."
echo "The application should now be running at http://localhost:3000"
echo "You can stop the application by running 'docker-compose down' in this directory."