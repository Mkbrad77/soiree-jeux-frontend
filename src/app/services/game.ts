// src/app/services/game.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Game } from '../models/game';
import { GameResult } from '../models/game-result';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private apiUrl = environment.apiUrl + '/games';

  constructor(private http: HttpClient) { }

  // Initialiser les jeux
  initializeGames(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/initialize`, {});
  }

  // Récupérer tous les jeux
  getAllGames(): Observable<Game[]> {
    return this.http.get<Game[]>(this.apiUrl);
  }

  // Enregistrer les résultats d'un jeu
  saveResults(gameId: number, positions: { [teamId: number]: number }): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${gameId}/results`, { positions });
  }

  // Récupérer les résultats d'un jeu
  getGameResults(gameId: number): Observable<GameResult[]> {
    return this.http.get<GameResult[]>(`${this.apiUrl}/${gameId}/results`);
  }

  // Récupérer l'historique d'une équipe
  getTeamHistory(teamId: number): Observable<GameResult[]> {
    return this.http.get<GameResult[]>(`${this.apiUrl}/teams/${teamId}/history`);
  }

  // Enregistrer les points bonus d'un gage
  saveGageBonus(gameId: number, teamId: number, points: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${gameId}/gage-bonus`, { teamId, points });
  }

  // Whisky Undercover (Mister White) : enregistrer l'issue (équipe Mister White, éliminé ou non, tour)
  saveUndercoverOutcome(
    gameId: number,
    misterWhiteTeamId: number,
    eliminated: boolean,
    eliminatedInRound?: number
  ): Observable<void> {
    const body: { misterWhiteTeamId: number; eliminated: boolean; eliminatedInRound?: number } = {
      misterWhiteTeamId,
      eliminated
    };
    if (eliminated && eliminatedInRound != null) {
      body.eliminatedInRound = eliminatedInRound;
    }
    return this.http.post<void>(`${this.apiUrl}/${gameId}/undercover-outcome`, body);
  }
}