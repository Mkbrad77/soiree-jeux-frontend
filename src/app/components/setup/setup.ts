import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatSliderModule } from '@angular/material/slider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';

import { TeamService } from '../../services/team';
import { GameService } from '../../services/game';
import { Player } from '../../models/player';

@Component({
  selector: 'app-setup',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatSliderModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule
  ],
  templateUrl: './setup.html',
  styleUrl: './setup.css',
})
export class Setup {
  players: Player[] = [];
  numberOfTeams: number = 4;
  newPlayerName: string = '';
  newPlayerGender: 'HOMME' | 'FEMME' = 'HOMME';
  isLoading: boolean = false;
  errorMessage: string = '';

  constructor(
    private teamService: TeamService,
    private gameService: GameService,
    private router: Router
  ) {}

  // Ajouter un joueur à la liste
  addPlayer() {
    if (this.newPlayerName.trim()) {
      this.players.push({
        name: this.newPlayerName.trim(),
        gender: this.newPlayerGender
      });
      this.newPlayerName = '';
    }
  }

  // Retirer un joueur
  removePlayer(index: number) {
    this.players.splice(index, 1);
  }

  // Gérer le changement du slider
  onTeamsChange(value: number) {
    this.numberOfTeams = value;
  }

  // Calculer le nombre de joueurs par équipe
  getPlayersPerTeam(): number {
    return Math.floor(this.players.length / this.numberOfTeams);
  }

  // Vérifier si la configuration est valide
  isValid(): boolean {
    return this.players.length >= this.numberOfTeams && this.numberOfTeams > 0;
  }

  // Démarrer la soirée
  startParty() {
    if (!this.isValid()) {
      console.warn('Configuration invalide:', {
        players: this.players.length,
        teams: this.numberOfTeams
      });
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    // Initialiser les jeux
    this.gameService.initializeGames().subscribe({
      next: () => {
        // Créer les équipes
        this.teamService.createTeams(this.players, this.numberOfTeams).subscribe({
          next: (teams) => {
            this.isLoading = false;
            // Rediriger vers le dashboard
            this.router.navigate(['/dashboard']);
          },
          error: (error) => {
            console.error('❌ Erreur lors de la création des équipes:', error);
            this.isLoading = false;
            this.errorMessage = 'Erreur lors de la création des équipes. Vérifiez que le backend est démarré sur http://localhost:8080';
          }
        });
      },
      error: (error) => {
        console.error('❌ Erreur lors de l\'initialisation des jeux:', error);
        this.isLoading = false;
        this.errorMessage = 'Erreur lors de l\'initialisation des jeux. Vérifiez que le backend est démarré sur http://localhost:8080';
      }
    });
  }
}
