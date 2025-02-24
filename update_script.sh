#!/bin/bash
cd /home/dev/fpl-league-similarity
source venv/bin/activate

# Generate new data files
python analysis.py >> analysis.log 2>&1

# Rebuild Angular with new data
ng build >> analysis.log 2>&1

# Reload will gracefully restart and pick up the new build
pm2 reload fpl-league-similarity >> analysis.log 2>&1

deactivate