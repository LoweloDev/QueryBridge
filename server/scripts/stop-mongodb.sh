#!/bin/bash
# Stop MongoDB gracefully

# Find MongoDB process and stop it
pkill -f "mongod.*server/data/mongodb"

echo "MongoDB stopped"