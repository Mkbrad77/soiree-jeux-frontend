import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Team } from '../../models/team';
import { Game } from '../../models/game';

@Component({
  selector: 'app-duel-screen',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './duel-screen.html',
  styleUrl: './duel-screen.css'
})
export class DuelScreenComponent implements OnInit {
  @Input() teams: Team[] = [];
  @Input() game: Game | null = null;
  @Output() ready = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  teamA: Team | null = null;
  teamB: Team | null = null;
  showVS: boolean = false;
  animationPhase: 'entering' | 'vs' | 'ready' = 'entering';

  ngOnInit() {
    // Sélectionner les deux premières équipes ou aléatoirement
    if (this.teams.length >= 2) {
      // Mélanger aléatoirement pour plus de suspense
      const shuffled = [...this.teams].sort(() => Math.random() - 0.5);
      this.teamA = shuffled[0];
      this.teamB = shuffled[1];
    }

    // Animation d'entrée
    setTimeout(() => {
      this.animationPhase = 'vs';
      this.showVS = true;
    }, 500);

    // Animation VS
    setTimeout(() => {
      this.animationPhase = 'ready';
    }, 2500);
  }

  /**
   * Prêt pour le duel
   */
  startDuel() {
    this.ready.emit();
  }

  /**
   * Annuler
   */
  cancel() {
    this.cancelled.emit();
  }

  /**
   * Obtenir l'emoji selon le genre
   */
  getGenderEmoji(gender: 'HOMME' | 'FEMME'): string {
    return gender === 'HOMME' ? '👨' : '👩';
  }

  getGameIcon(): string {
    if (!this.game) return '🎮';
    switch (this.game.type) {
      case 'TOUS_ENSEMBLE': return '👥';
      case 'REPRESENTANT': return '⭐';
      case 'DUO': return '🤝';
      case 'UN_VS_UN': return '⚔️';
      default: return '🎮';
    }
  }
}

