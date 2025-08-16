import json
import time
import requests
import numpy as np
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import os
import math

# Define the data directory for saving data and graphs
DATA_DIRECTORY = './src/assets'

# Define the cache directory for storing fetched data
CACHE_DIRECTORY = './cache'

# Main execution
# league_ids = [7639, 8497]
league_ids = [36590]
# league_ids = [8497]

def fetch_player_data(json_file=f'{DATA_DIRECTORY}/player_data.json'):
    """
    Fetches fresh player data from the Fantasy Premier League API and saves it as a JSON file.

    This function always fetches fresh data from the API, processes it,
    saves it to a JSON file (overwriting any existing file), and returns the player data
    along with the current gameweek.

    Args:
        json_file (str): The filename for the JSON file. Defaults to 'player_data.json'.

    Returns:
        tuple: A tuple containing two elements:
            - dict: Player data with player IDs as keys and dictionaries of player info as values.
            - int: The current gameweek number.

    Raises:
        requests.RequestException: If there's an error fetching data from the API.
        json.JSONDecodeError: If there's an error parsing the API response.
        IOError: If there's an error writing to the JSON file.
    """
    url = "https://fantasy.premierleague.com/api/bootstrap-static/"
    response = requests.get(url)
    response.raise_for_status()  # Raise an exception for bad responses
    data = response.json()

    current_gameweek = next(event['id'] for event in data['events'] if event['is_current'])
    current_gameweek_finished = data['events'][current_gameweek - 1]['finished']

    player_data = {
        element['id']: {
            'web_name': element['web_name'],
            'now_cost': element['now_cost'] / 10  # Dividing by 10 to get the correct cost
        } for element in data['elements']
    }

    # Create a dictionary with both player_data and current_gameweek
    json_data = {
        'player_data': player_data,
        'current_gameweek': current_gameweek
    }

    # Save player data and current_gameweek to JSON file, overwriting any existing file
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(json_data, f, indent=2)

    print(f"Player data and current gameweek saved to {json_file}")

    return player_data, current_gameweek, current_gameweek_finished

def fetch_league_standings(league_id, page=1):
    """
    Fetches league standings for a given league ID and page number.

    Args:
        league_id (int): The ID of the league.
        page (int): The page number of the standings. Defaults to 1.

    Returns:
        dict: The JSON response containing league standings data.
    """
    url = f"https://fantasy.premierleague.com/api/leagues-classic/{league_id}/standings/?page_standings={page}&page_new_entries={page}"
    response = requests.get(url)
    return response.json()

def fetch_team_picks(team_id, gameweek):
    """
    Fetches team picks for a given team ID and gameweek.

    Args:
        team_id (int): The ID of the team.
        gameweek (int): The gameweek number.

    Returns:
        dict: The JSON response containing team picks data.
    """
    url = f"https://fantasy.premierleague.com/api/entry/{team_id}/event/{gameweek}/picks/"
    response = requests.get(url)
    return response.json()

def extract_manager_data(standings_data):
    """
    Extracts manager data from league standings data.
    If standings are empty, it tries to extract from new_entries.

    Args:
        standings_data (dict): The JSON response containing league standings data.

    Returns:
        list: A list of dictionaries, each containing manager information.
    """
    managers = []
    if standings_data.get('standings', {}).get('results'):
        for result in standings_data['standings']['results']:
            managers.append({
                'name': result['player_name'],
                'team_name': result['entry_name'],
                'team_id': result['entry'],
            })
    elif standings_data.get('new_entries', {}).get('results'):
        print("No standings found, using new entries to populate managers.")
        for result in standings_data['new_entries']['results']:
            managers.append({
                'name': f"{result['player_first_name']} {result['player_last_name']}",
                'team_name': result['entry_name'],
                'team_id': result['entry'],
            })
    return managers

def fetch_all_managers(league_id, cache_file=f'{CACHE_DIRECTORY}/managers.json'):
    """Fetches all managers from a league and caches them.

    Args:
        league_id: The ID of the league.
        cache_file: The filename for the cached manager data.
    """

    cache_key = f"{league_id}_managers"
    if os.path.exists(cache_file):
        # Load cached data
        with open(cache_file, 'r') as f:
            cached_data = json.load(f)
        if cache_key in cached_data:
            return cached_data[cache_key]

    # Fetch from API and cache
    all_managers = []
    page = 1
    while True:
        print(f"Fetching page {page} of league standings...")
        data = fetch_league_standings(league_id, page)
        managers = extract_manager_data(data)

        # If the current page returned no managers, we assume we're done.
        if not managers:
            break

        all_managers.extend(managers)
        page += 1
        time.sleep(1)  # Delay to avoid overloading the server

    # Store in cache
    if os.path.exists(cache_file):
        with open(cache_file, 'r') as f:
            cached_data = json.load(f)
    else:
        cached_data = {}
    cached_data[cache_key] = all_managers
    with open(cache_file, 'w') as f:
        json.dump(cached_data, f)

    return all_managers

def fetch_all_team_picks(managers, league_id, gameweek, current_gameweek, current_gameweek_finished, cache_file=f'{CACHE_DIRECTORY}/gameweek_picks.json'):
    """Fetches team picks for all managers for a given league and gameweek and caches them.

    Args:
        managers: A list of manager dictionaries.
        league_id: The ID of the league.
        gameweek: The gameweek number to fetch data for.
        current_gameweek: The current gameweek number.
        current_gameweek_finished: Boolean indicating if the current gameweek has finished.
        cache_file: The filename for the cached picks data.
    """
    cache_key = f"{league_id}_{gameweek}_picks"
    metadata_key = f"{league_id}_{gameweek}_metadata"

    if os.path.exists(cache_file):
        with open(cache_file, 'r') as f:
            cached_data = json.load(f)
        # print(f"Debug: Loaded existing cache file. Keys: {list(cached_data.keys())}")
    else:
        cached_data = {}
        # print("Debug: No existing cache file found. Created new cache.")


    # For previous gameweeks, always use cached data if available
    if gameweek < current_gameweek:
        if cache_key in cached_data:
            print(f"Using cached data for previous gameweek {gameweek}")
            return cached_data[cache_key]
        else:
            print(f"No cached data found for previous gameweek {gameweek}. Fetching from API.")
    else:
        # For current gameweek, check if we need to refetch
        print(f"gameweek: {gameweek}, current_gameweek: {current_gameweek}, current_gameweek_finished: {current_gameweek_finished}")
        metadata = cached_data.get(metadata_key, {})
        if cache_key in cached_data and (not current_gameweek_finished or metadata.get('fetched_after_finished', False)):
            print(f"Using cached data for current gameweek {gameweek}")
            return cached_data[cache_key]
        else:
            print(f"Fetching fresh data for current gameweek {gameweek}")

    # Fetch from API
    all_picks = []
    for manager in managers:
        print(f"Fetching picks for {manager['name']}...")
        picks = fetch_team_picks(manager['team_id'], gameweek)
        if 'picks' in picks:
            all_picks.append(picks)
        else:
            print(f"Warning: 'picks' key missing for manager {manager['team_id']} gameweek {gameweek}. Skipping this manager.")
        time.sleep(1)  # Delay to avoid overloading the server

    # Update cache
    cached_data[cache_key] = all_picks
    if gameweek == current_gameweek:
        cached_data[metadata_key] = {
            'fetched_after_finished': current_gameweek_finished,
            'last_fetch_time': time.time()
        }
        # print(f"Debug: Updated metadata for gameweek {gameweek}: {cached_data[metadata_key]}")

    # print(f"Debug: Cache keys before saving: {list(cached_data.keys())}")
    with open(cache_file, 'w') as f:
        json.dump(cached_data, f)

    # Verify saved data
    with open(cache_file, 'r') as f:
        saved_data = json.load(f)
    print(f"Debug: Saved cache keys: {list(saved_data.keys())}")
    print(f"Debug: Saved metadata for gameweek {gameweek}: {saved_data.get(metadata_key)}")

    return all_picks


def process_picks(picks):
    """
    Processes team picks data to extract relevant information, subtracting transfer cost for true GW points.

    Args:
        picks (dict): The JSON response containing team picks data.

    Returns:
        tuple: A tuple containing:
            - list: Player IDs in the team.
            - int: Captain player ID.
            - int: Vice-captain player ID.
            - int: Total points for the team.
            - int: Rank of the team.
            - int: GW points (true points, with event_transfers_cost subtracted).
            - int: GW rank.
            - str: Active chip.
    """
    if 'picks' in picks:  # Check if 'picks' key exists
        team = [(pick['element'], pick['position']) for pick in picks['picks']] # Extract player ID and position
        captain = picks['picks'][picks['picks'].index(next((pick for pick in picks['picks'] if pick['is_captain']), None))]['element']
        vice_captain = picks['picks'][picks['picks'].index(next((pick for pick in picks['picks'] if pick['is_vice_captain']), None))]['element']
        total_points = picks['entry_history']['total_points']  # Extract total_points
        rank = picks['entry_history']['overall_rank']  # Extract rank
        gw_points_raw = picks['entry_history']['points']  # Extract raw GW points
        gw_transfers_cost = picks['entry_history']['event_transfers_cost']  # Extract transfer cost
        gw_points_true = gw_points_raw - gw_transfers_cost  # True GW points (subtract transfer penalty)
        gw_rank = picks['entry_history']['rank']  # Extract GW rank
        active_chip = picks.get('active_chip') # Get active chip
        return team, captain, vice_captain, total_points, rank, gw_points_true, gw_rank, active_chip  # Return true GW points
    else:
        print(picks)
        print(f"Warning: 'picks' key missing for this manager. Returning None values.")
        return None, None, None, None, None, None, None, None  # Return None for missing data

def create_weighted_vector(team, all_player_ids, player_prices, captain, vice_captain, active_chip):
  """
  Creates a weighted vector for a team based on player prices and position,
  using a scaled price weighting between ~3.5 and ~16,
  and adding extra weight to the captain.

  Args:
      team: A list of (player_id, position) tuples representing the team.
      all_player_ids: A list of all player IDs.
      player_prices: A dictionary mapping player IDs to their prices.
      captain: The player ID of the captain.
      vice_captain: The player ID of the vice-captain.
      active_chip: The active chip for the gameweek.

  Returns:
      A NumPy array representing the weighted vector.
  """

  vector = np.zeros(len(all_player_ids))
  bench_weights = [0.05, 0.25, 0.1, 0.05]  # Weights for bench positions (GK, 1st, 2nd, 3rd)
  for player_id, position in team:
      if player_id in all_player_ids:
          index = all_player_ids.index(player_id)
          price_weight = player_prices.get(player_id, 4.0)  # Default to 4.5 if price not found
          # Linear Scaling up to 15
          scaled_price = (price_weight) / (15)
          
          # Determine position weight, accounting for bench boost
          if active_chip == 'bboost' or position <= 11:
              position_weight = 1
          else:
              position_weight = 0.1 # Uniform weight for all bench players

          # Add extra weighting for captain/triple captain
          if player_id == captain:
              if active_chip == '3xc':
                  position_weight *= 3.0  # Triple Captain weight
              else:
                  position_weight *= 2.0  # Standard captain weight
          
          vector[index] = scaled_price * position_weight
  return vector

def fetch_league_names(league_ids, cache_file=f'{DATA_DIRECTORY}/leagues.json'):
  """
  Fetches the names of the leagues specified in league_ids and saves them to a JSON file.

  Args:
      league_ids (list): A list of league IDs.
      cache_file (str): The filename for the cached league data. Defaults to 'leagues.json'.
  """

  cache_key = 'leagues'
  cached_data = {}

  if os.path.exists(cache_file):
      # Load cached data
      with open(cache_file, 'r') as f:
          cached_data = json.load(f)

  # Fetch from API and cache
  leagues = []
  for league_id in league_ids:
      print(f"Fetching league name for league ID {league_id}...")
      standings_data = fetch_league_standings(league_id)
      league_name = standings_data['league']['name']
      leagues.append({'id': league_id, 'name': league_name})
      time.sleep(1)  # Delay to avoid overloading the server

  # Store in cache
  cached_data[cache_key] = leagues
  with open(cache_file, 'w') as f:
      json.dump(cached_data, f)

  # Update available_leagues.json
  available_leagues_file = f'{DATA_DIRECTORY}/available_leagues.json'
  with open(available_leagues_file, 'w', encoding='utf-8') as f:
      json.dump(leagues, f, indent=2)
  print(f"League names saved to {available_leagues_file}")


make_plots = False

player_data, current_gameweek, current_gameweek_finished = fetch_player_data()

# Extract player prices from player_data
player_prices = {int(player_id): info['now_cost'] for player_id, info in player_data.items()}

leagues = fetch_league_names(league_ids)

for league_id in league_ids:
  print(f"Processing league {league_id}")

  # Fetch all managers
  managers = fetch_all_managers(league_id)

  print(current_gameweek)
  print(current_gameweek_finished)

  for gameweek in range(current_gameweek, current_gameweek+1):  # Loop through gameweeks (change to (1,Max gameweek+1) if you want to rerun all weeks)
    print(f"Processing Gameweek {gameweek}")


    # Fetch team picks for all managers
    all_picks = fetch_all_team_picks(managers, league_id, gameweek, current_gameweek, current_gameweek_finished)

    # --- Main Processing Block ---

    # 1. Process all picks and align with manager info
    processed_picks = [process_picks(picks) for picks in all_picks]
    valid_teams_with_info = []
    for i, pick_data in enumerate(processed_picks):
        if pick_data is not None:
            valid_teams_with_info.append({
                'manager': managers[i],
                'pick_data': pick_data
            })

    if not valid_teams_with_info:
        print(f"No valid team data to process for Gameweek {gameweek}. Skipping.")
        continue

    # 2. Create a list of all unique player IDs from all teams
    all_player_ids = set()
    for team_info in valid_teams_with_info:
        team_list = [player[0] for player in team_info['pick_data'][0]]
        all_player_ids.update(team_list)
    all_player_ids = list(all_player_ids)

    # 3. Calculate the high-dimensional vector for each team
    for team_info in valid_teams_with_info:
        pick = team_info['pick_data']
        team_info['vector'] = create_weighted_vector(pick[0], all_player_ids, player_prices, pick[1], pick[2], pick[7])

    # 4. Group identical teams based on their vector
    grouped_teams = {}
    for team_info in valid_teams_with_info:
        vector_key = tuple(team_info['vector'])
        if vector_key not in grouped_teams:
            grouped_teams[vector_key] = []
        grouped_teams[vector_key].append(team_info)

    # 5. Aggregate the data for each group of identical teams
    aggregated_data = []
    unique_vectors = []
    for vector_key, group in grouped_teams.items():
        unique_vectors.append(np.array(vector_key))
        first_team_info = group[0]
        pick_data = first_team_info['pick_data']
        
        aggregated_data.append({
            'manager_names': [info['manager']['name'] for info in group],
            'team_names': [info['manager']['team_name'] for info in group],
            'team_ids': [info['manager']['team_id'] for info in group],
            'manager_count': len(group),
            'captain': pick_data[1],
            'vice_captain': pick_data[2],
            'total_points': pick_data[3],
            'rank': pick_data[4],
            'gw_points': pick_data[5],
            'gw_rank': pick_data[6],
            'active_chip': pick_data[7],
            'players_owned': [player[0] for player in pick_data[0]],
        })

    # 6. Run dimensionality reduction on the unique vectors
    unique_vectors_np = np.array(unique_vectors)
    
    # Using PCA to reduce dimensions
    pca = PCA(n_components=2)
    pca_result = pca.fit_transform(unique_vectors_np)

    # Using t-SNE to reduce dimensions
    perplexity = min(len(unique_vectors_np) - 1, 10)
    tsne = TSNE(n_components=2, perplexity=perplexity, max_iter=10000)
    tsne_result = tsne.fit_transform(unique_vectors_np)

    # 7. Combine aggregated data with coordinates into a final DataFrame
    for i, record in enumerate(aggregated_data):
        record['pca_x'] = pca_result[i, 0]
        record['pca_y'] = pca_result[i, 1]
        record['tsne_x'] = tsne_result[i, 0]
        record['tsne_y'] = tsne_result[i, 1]

    results_df = pd.DataFrame(aggregated_data)

    # Convert DataFrame to JSON
    results_json = results_df.to_json(orient='records', indent=4)

    # Construct the filename using league ID and gameweek
    filename = f'{DATA_DIRECTORY}/fpl_team_similarity_{league_id}_gw{gameweek}.json'

    # Save JSON to file
    with open(filename, 'w') as file:
        file.write(results_json)

        print(f"Data saved to '{filename}'")




    # Construct the filename using league ID and gameweek
    #   filename = f'{DATA_DIRECTORY}/fpl_team_similarity_{league_id}_gw{gameweek}.csv'

    # Save to CSV
    #   results_df.to_csv(filename, index=False)
    #   print(f"Data saved to '{filename}'")




    if (make_plots):
        # Plotting with improved label placement
        plt.figure(figsize=(20, 10))

        def plot_with_labels(ax, x, y, labels, highlight_ids, managers_with_player_328):
            """
            Plots a scatter plot with labels and highlights specific managers.

            Args:
                ax: The matplotlib axes object.
                x: The x-coordinates of the points.
                y: The y-coordinates of the points.
                labels: The labels for each point.
                highlight_ids: A list of team IDs to highlight in green.
                managers_with_player_328: A list of team IDs to highlight in red.
            """
            ax.scatter(x, y)
            texts = []
            for i, label in enumerate(labels):
                if results_df['team_id'][i] in highlight_ids:
                    if results_df['team_id'][i] in managers_with_player_328:
                        ax.scatter(x[i], y[i], c='yellow', s=100, marker='o')
                    else: 
                        ax.scatter(x[i], y[i], c='green', s=100, marker='o')
                else: 
                    if results_df['team_id'][i] in managers_with_player_328:
                        ax.scatter(x[i], y[i], c='red', s=100, marker='o') 
                texts.append(ax.text(x[i], y[i], label, fontsize=8, ha='center', va='bottom'))  # Add text labels

        # Find managers who own player 351
        managers_with_player_haaland = []
        for i, team in enumerate(processed_picks):
            if 351 in team[0]:
                managers_with_player_haaland.append(results_df['team_id'][i])

        # Find managers who own player 351
        managers_with_player_salah = []
        for i, team in enumerate(processed_picks):
            if 328 in team[0]:
                managers_with_player_salah.append(results_df['team_id'][i])

        plt.subplot(1, 2, 1)
        plot_with_labels(plt.gca(), results_df['pca_x'], results_df['pca_y'], results_df['manager_name'], managers_with_player_haaland, managers_with_player_salah)
        plt.title('PCA Result')

        plt.subplot(1, 2, 2)
        plot_with_labels(plt.gca(), results_df['tsne_x'], results_df['tsne_y'], results_df['manager_name'], managers_with_player_haaland, managers_with_player_salah)
        plt.title('t-SNE Result')

        plt.tight_layout()

        figure_filename = f'./graphs/fpl_team_similarity_{league_id}_gw{gameweek}.png'
        plt.savefig(figure_filename, dpi=300, bbox_inches='tight')
        print(f'Graph saved as ${figure_filename}')