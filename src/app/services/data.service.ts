import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  distinctUntilChanged,
  combineLatest,
} from 'rxjs';

export interface PlayerData {
  number: {
    web_name: string;
    now_cost: number;
  };
}

export interface PlayerDataResponse {
  player_data: PlayerData[];
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

  loading$: Observable<boolean> = this.loadingSubject.asObservable();
  playerData$: Observable<PlayerData[]> = this.playerDataSubject.asObservable();
  currentGameweek$: Observable<number> =
    this.currentGameweekSubject.asObservable();
  maxGameweek$: Observable<number> = this.maxGameweekSubject.asObservable();
  managerData$: Observable<ManagerData[]> =
    this.managerDataSubject.asObservable();
  currentLeague$: Observable<League | null> =
    this.currentLeagueSubject.asObservable();
  availableLeagues$: Observable<League[]> =
    this.availableLeaguesSubject.asObservable();

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
        this.playerDataSubject.next(data.player_data);
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

  getAvailableLeagues(): League[] {
    return this.availableLeaguesSubject.getValue();
  }
}
