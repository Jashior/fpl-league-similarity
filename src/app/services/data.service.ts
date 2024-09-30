import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  catchError,
  distinctUntilChanged,
  map,
  tap,
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

@Injectable({
  providedIn: 'root',
})
export class DataService {
  private playerDataSubject = new BehaviorSubject<PlayerData[]>([]);
  private currentGameweekSubject = new BehaviorSubject<number>(0);
  private maxGameweekSubject = new BehaviorSubject<number>(0);
  private managerDataSubject = new BehaviorSubject<ManagerData[]>([]);

  playerData$: Observable<PlayerData[]> = this.playerDataSubject.asObservable();
  currentGameweek$: Observable<number> =
    this.currentGameweekSubject.asObservable();
  maxGameweek$: Observable<number> = this.maxGameweekSubject.asObservable();
  managerData$: Observable<ManagerData[]> =
    this.managerDataSubject.asObservable();

  leagueCode = 7639;

  constructor() {
    this.loadPlayerData();
    this.currentGameweek$
      .pipe(
        distinctUntilChanged(),
        map((gameweek) =>
          Math.min(Math.max(1, gameweek), this.maxGameweekSubject.getValue())
        )
      )
      .subscribe((gameweek) => this.loadManagerData(gameweek));
  }

  loadPlayerData(): void {
    fetch('assets/player_data.json')
      .then((response) => response.json())
      .then((data: PlayerDataResponse) => {
        console.log(data);
        this.playerDataSubject.next(data.player_data);
        this.maxGameweekSubject.next(data.current_gameweek);
        this.currentGameweekSubject.next(data.current_gameweek);
      })
      .catch((error) => {
        console.error('Error loading player data:', error);
      });
  }

  loadManagerData(gameweek: number): void {
    if (gameweek < 1) return;
    const filename = `fpl_team_similarity_${this.leagueCode}_gw${gameweek}.json`;

    fetch(`/assets/${filename}`)
      .then((response) => response.json())
      .then((data: ManagerData[]) => {
        console.log(data);
        this.managerDataSubject.next(data);
      })
      .catch((error) => {
        console.error('Error loading manager data:', error);
      });
  }

  setCurrentGameweek(gameweek: number): void {
    const maxGameweek = this.maxGameweekSubject.getValue();
    const validGameweek = Math.min(Math.max(1, gameweek), maxGameweek);
    this.currentGameweekSubject.next(validGameweek);
  }
}
