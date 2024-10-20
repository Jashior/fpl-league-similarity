#!/bin/bash

# Change to the project directory
cd /home/dev/fpl-league-similarity

# Activate virtual environment and run analysis script
./venv/bin/python analysis.py

# Rebuild Angular project
ng build --prod

# Restart PM2 process
pm2 restart fpl-league-similarity