#!/bin/bash
# Start MongoDB locally for testing

# Create data directory if it doesn't exist
mkdir -p server/data/mongodb

# Start MongoDB with local data directory (modern MongoDB 6.x syntax)
mongod --dbpath ./server/data/mongodb --port 27017 --bind_ip 127.0.0.1 --logpath ./server/data/mongodb/mongod.log --fork --quiet

echo "MongoDB started on port 27017"
echo "Data directory: ./server/data/mongodb"
echo "Log file: ./server/data/mongodb/mongod.log"