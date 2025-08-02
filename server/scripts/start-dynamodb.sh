#!/bin/bash
# Start DynamoDB Local for testing

# Create data directory if it doesn't exist
mkdir -p server/data/dynamodb

# Start DynamoDB Local in the background
npx dynamodb-local --sharedDb --port 8000 --dbPath ./server/data/dynamodb > ./server/data/dynamodb/dynamodb.log 2>&1 &

echo "DynamoDB Local started on port 8000"
echo "Data directory: ./server/data/dynamodb"
echo "Log file: ./server/data/dynamodb/dynamodb.log"