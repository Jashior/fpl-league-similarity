#!/bin/bash

# Change to the project directory
cd /home/dev/fpl-league-similarity

# Activate virtual environment
source venv/bin/activate

# Update requirements (uncomment if needed)
# pip install -r requirements.txt

# Run analysis script
python analysis.py >> analysis.log 2>&1

# Rebuild Angular project
ng build --prod >> analysis.log 2>&1

# Restart PM2 process
pm2 restart fpl-league-similarity >> analysis.log 2>&1

# Deactivate virtual environment
deactivate
