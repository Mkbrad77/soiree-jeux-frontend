// src/app/services/team.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Team } from '../models/team';
import { Player } from '../models/player';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TeamService {
  private apiUrl = environment.apiUrl + '/teams';

  constructor(private http: HttpClient) { }

  // Récupérer toutes les équipes
  getAllTeams(): Observable<Team[]> {
    return this.http.get<Team[]>(this.apiUrl);
  }

  // Créer des équipes équilibrées
  createTeams(players: Player[], numberOfTeams: number): Observable<Team[]> {
    return this.http.post<Team[]>(`${this.apiUrl}/create`, {
      players,
      numberOfTeams
    });
  }

  // Ajouter un joueur à une équipe
  addPlayer(teamId: number, player: Player): Observable<Team> {
    return this.http.post<Team>(`${this.apiUrl}/${teamId}/players`, player);
  }

  // Retirer un joueur
  removePlayer(teamId: number, playerId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${teamId}/players/${playerId}`);
  }

  // Réinitialiser les scores
  resetScores(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/reset`, {});
  }
}