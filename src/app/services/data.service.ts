import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  distinctUntilChanged,
  combineLatest,
  shareReplay,
} from 'rxjs';

export interface PlayerData {
  id: number;
  web_name: string;
  now_cost: number;
}

export interface PlayerDataResponse {
  player_data: { [key: string]: { web_name: string; now_cost: number } };
  current_gameweek: number;
}

export interface ManagerData {
  manager_name: string;
  team_name: string;
  team_id: number;
  captain: number;
  vice_captain: number;
  total_points: number;
  rank: number;
  gw_points: number;
  gw_rank: number;
  players_owned: number[];
  pca_x: number;
  pca_y: number;
  tsne_x: number;
  tsne_y: number;
}

export interface League {
  id: number;
  name: string;
}

@Injectable({
  providedIn: 'root',
})
export class DataService {
  private playerDataSubject = new BehaviorSubject<PlayerData[]>([]);
  private currentGameweekSubject = new BehaviorSubject<number>(0);
  private maxGameweekSubject = new BehaviorSubject<number>(0);
  private managerDataSubject = new BehaviorSubject<ManagerData[]>([]);
  private currentLeagueSubject = new BehaviorSubject<League | null>(null);
  private availableLeaguesSubject = new BehaviorSubject<League[]>([]);
  private loadingCounter = 0;
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private highlightedManagersSubject = new BehaviorSubject<number[]>([]);
  private highlightedPlayersSubject = new BehaviorSubject<number[]>([]);

  loading$: Observable<boolean> = this.loadingSubject.asObservable();

  playerData$: Observable<PlayerData[]> = this.playerDataSubject
    .asObservable()
    .pipe(shareReplay(1));
  currentGameweek$: Observable<number> =
    this.currentGameweekSubject.asObservable();
  maxGameweek$: Observable<number> = this.maxGameweekSubject.asObservable();
  managerData$: Observable<ManagerData[]> = this.managerDataSubject
    .asObservable()
    .pipe(shareReplay(1));
  currentLeague$: Observable<League | null> =
    this.currentLeagueSubject.asObservable();
  availableLeagues$: Observable<League[]> =
    this.availableLeaguesSubject.asObservable();
  highlightedManagers$: Observable<number[]> =
    this.highlightedManagersSubject.asObservable();
  highlightedPlayers$: Observable<number[]> =
    this.highlightedPlayersSubject.asObservable();

  constructor() {
    this.loadPlayerData();
    this.loadLeagues();

    combineLatest([
      this.currentGameweek$.pipe(distinctUntilChanged()),
      this.currentLeague$.pipe(distinctUntilChanged()),
    ]).subscribe(([gameweek, league]) => {
      if (league) {
        this.loadManagerData(gameweek, league.id);
      }
    });
  }

  loadPlayerData(): void {
    this.setLoading(true);
    fetch('assets/player_data.json')
      .then((response) => response.json())
      .then((data: PlayerDataResponse) => {
        console.log('Player data loaded:', data);

        // Transform the player_data object into an array of PlayerData
        const transformedPlayerData = Object.entries(data.player_data).map(
          ([id, player]) => ({
            id: Number(id),
            web_name: player.web_name,
            now_cost: player.now_cost,
          })
        );

        this.playerDataSubject.next(transformedPlayerData);
        this.maxGameweekSubject.next(data.current_gameweek);
        this.currentGameweekSubject.next(data.current_gameweek);
      })
      .catch((error) => {
        console.error('Error loading player data:', error);
      })
      .finally(() => this.setLoading(false));
  }

  loadLeagues(): void {
    this.setLoading(true);
    fetch('assets/leagues.json')
      .then((response) => response.json())
      .then((data: { leagues: League[] }) => {
        if (data.leagues.length > 0) {
          this.availableLeaguesSubject.next(data.leagues);
          const defaultLeague = data.leagues[0];
          this.setCurrentLeague(defaultLeague);
          console.log(
            `Available leagues loaded. Default league set: ${defaultLeague.name} (ID: ${defaultLeague.id})`
          );
        } else {
          console.warn('No leagues found in leagues.json');
        }
      })
      .catch((error) => {
        console.error('Error loading leagues:', error);
      })
      .finally(() => this.setLoading(false));
  }

  loadManagerData(gameweek: number, leagueId: number): void {
    if (gameweek < 1) return;
    this.setLoading(true);
    const filename = `fpl_team_similarity_${leagueId}_gw${gameweek}.json`;
    fetch(`/assets/${filename}`)
      .then((response) => response.json())
      .then((data: ManagerData[]) => {
        console.log(
          `Loaded manager data for league ${leagueId}, gameweek ${gameweek}`
        );
        this.managerDataSubject.next(data);
      })
      .catch((error) => {
        console.error('Error loading manager data:', error);
      })
      .finally(() => this.setLoading(false));
  }

  private setLoading(isLoading: boolean): void {
    if (isLoading) {
      this.loadingCounter++;
    } else {
      this.loadingCounter = Math.max(0, this.loadingCounter - 1);
    }
    this.loadingSubject.next(this.loadingCounter > 0);
  }

  setCurrentGameweek(gameweek: number): void {
    const maxGameweek = this.maxGameweekSubject.getValue();
    const validGameweek = Math.min(Math.max(1, gameweek), maxGameweek);
    this.currentGameweekSubject.next(validGameweek);
  }

  setCurrentLeague(league: League): void {
    this.currentLeagueSubject.next(league);
  }

  setHighlightedManagers(teamIds: number[]): void {
    this.highlightedManagersSubject.next(teamIds);
  }

  setHighlightedPlayers(playerIds: number[]): void {
    this.highlightedPlayersSubject.next(playerIds);
  }

  toggleHighlightedManager(teamId: number) {
    const currentHighlightedManagers =
      this.highlightedManagersSubject.getValue();
    const index = currentHighlightedManagers.indexOf(teamId);

    if (index > -1) {
      currentHighlightedManagers.splice(index, 1);
    } else {
      currentHighlightedManagers.push(teamId);
    }

    this.highlightedManagersSubject.next([...currentHighlightedManagers]);
  }

  getAvailableLeagues(): League[] {
    return this.availableLeaguesSubject.getValue();
  }

  getNameFromId(id: number): string {
    return (
      this.playerDataSubject.getValue().find((player) => player.id === id)
        ?.web_name || ''
    );
  }
}
