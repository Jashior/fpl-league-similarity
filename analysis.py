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
league_ids = [7639]
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
    url = f"https://fantasy.premierleague.com/api/leagues-classic/{league_id}/standings/?page_standings={page}"
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

    Args:
        standings_data (dict): The JSON response containing league standings data.

    Returns:
        list: A list of dictionaries, each containing manager information.
    """
    managers = []
    for result in standings_data['standings']['results']:
        managers.append({
            'name': result['player_name'],
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
    Processes team picks data to extract relevant information.

    Args:
        picks (dict): The JSON response containing team picks data.

    Returns:
        tuple: A tuple containing:
            - list: Player IDs in the team.
            - int: Captain player ID.
            - int: Vice-captain player ID.
            - int: Total points for the team.
            - int: Rank of the team.
    """
    if 'picks' in picks:  # Check if 'picks' key exists
        team = [pick['element'] for pick in picks['picks']]
        captain = picks['picks'][picks['picks'].index(next((pick for pick in picks['picks'] if pick['is_captain']), None))]['element']
        vice_captain = picks['picks'][picks['picks'].index(next((pick for pick in picks['picks'] if pick['is_vice_captain']), None))]['element']
        total_points = picks['entry_history']['total_points']  # Extract total_points
        rank = picks['entry_history']['overall_rank']  # Extract rank
        gw_points = picks['entry_history']['points']  # Extract points for the current gameweek
        gw_rank = picks['entry_history']['rank']  # Extract gw rank
        return team, captain, vice_captain, total_points, rank, gw_points, gw_rank  # Return additional data
    else:
        print(picks)
        print(f"Warning: 'picks' key missing for this manager. Returning None values.")
        return None, None, None, None, None  # Return None for missing data

def create_weighted_vector(team, all_player_ids, player_prices, captain, vice_captain):
  """
  Creates a weighted vector for a team based on player prices and position,
  using a scaled price weighting between ~3.5 and ~16,
  and adding extra weight to the captain.

  Args:
      team: A list of player IDs representing the team.
      all_player_ids: A list of all player IDs.
      player_prices: A dictionary mapping player IDs to their prices.
      captain: The player ID of the captain.
      vice_captain: The player ID of the vice-captain.

  Returns:
      A NumPy array representing the weighted vector.
  """

  vector = np.zeros(len(all_player_ids))
  bench_weights = [1, 0.05, 0.25, 0.1, 0.05]  # Weights for starting 11 and bench positions
  for i, player_id in enumerate(team):
      if player_id in all_player_ids:
          index = all_player_ids.index(player_id)
          price_weight = player_prices.get(player_id, 4.0)  # Default to 4.5 if price not found
          # Linear Scaling up to 15
          scaled_price = (price_weight) / (15)
          position_weight = 1 if i < 11 else bench_weights[i - 11]
          # Add extra weighting for captain
          if player_id == captain:
              position_weight *= 1.5  # Increase captain's weight by 100%
          elif player_id == vice_captain:
              position_weight *= 1.05 # Increase vice-captain's weight by 10%
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

    processed_picks = [pick for pick in [process_picks(picks) for picks in all_picks]]

    # Create a set of all unique player IDs (updated each gameweek)
    all_player_ids = set()
    for team in processed_picks:
        if team is not None:  # Only include teams with data
            team_list = team[0]  # The team is the first element of the tuple
            all_player_ids.update(team_list)
    all_player_ids = list(all_player_ids)

    # Pass player_prices when creating weighted_teams
    weighted_teams = np.array([create_weighted_vector(team[0], all_player_ids, player_prices, team[1], team[2]) for team in processed_picks if team is not None])

    # Calculate the number of managers with data
    num_managers_with_data = len(processed_picks) - processed_picks.count(None)

    # Using PCA to reduce dimensions
    pca = PCA(n_components=2)
    pca_result = pca.fit_transform(weighted_teams)

    # Using t-SNE to reduce dimensions
    perplexity = min(num_managers_with_data - 1, 10)
    tsne = TSNE(n_components=2, perplexity=perplexity, max_iter=10000)
    tsne_result = tsne.fit_transform(weighted_teams)


    # Create the DataFrame, filling missing values with None
    results_df = pd.DataFrame({
        'manager_name': [m['name'] for m in managers][:num_managers_with_data],
        'team_name': [m['team_name'] for m in managers][:num_managers_with_data],
        'team_id': [m['team_id'] for m in managers][:num_managers_with_data],
        'captain': [pick[1] for pick in processed_picks if pick is not None],  # Extract captain IDs
        'vice_captain': [pick[2] for pick in processed_picks if pick is not None],  # Extract vice-captain IDs
        'total_points': [pick[3] for pick in processed_picks if pick is not None],  # Extract total_points
        'rank': [pick[4] for pick in processed_picks if pick is not None],  # Extract rank
        'gw_points': [pick[5] for pick in processed_picks if pick is not None],
        'gw_rank': [pick[6] for pick in processed_picks if pick is not None],
        'players_owned': [pick[0] for pick in processed_picks if pick is not None],  # Add players owned
        'pca_x': pca_result[:, 0],
        'pca_y': pca_result[:, 1],
        'tsne_x': tsne_result[:, 0],
        'tsne_y': tsne_result[:, 1]
    })

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