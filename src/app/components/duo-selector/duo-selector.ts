import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Player } from '../../models/player';
import { Team } from '../../models/team';

interface Duo {
  player1: Player;
  player2: Player;
  team: Team;
}

@Component({
  selector: 'app-duo-selector',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './duo-selector.html',
  styleUrl: './duo-selector.css'
})
export class DuoSelectorComponent implements OnInit {
  @Input() teams: Team[] = [];
  @Input() gameName: string = '';
  @Output() duosSelected = new EventEmitter<{ [teamId: number]: { player1: Player; player2: Player } }>();
  @Output() cancelled = new EventEmitter<void>();

  selectedDuos: { [teamId: number]: Duo } = {};
  isSelecting: boolean = false;
  animationPhase: 'spinning' | 'revealing' | 'revealed' = 'spinning';
  private animationTimeout: any = null;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    // Initialiser les duos (seront remplis lors de la génération)
    // Pas besoin d'initialiser maintenant, ils seront créés dans generateDuos()
  }

  /**
   * Générer les duos de manière aléatoire, en privilégiant fille + garçon
   */
  generateDuos() {
    // Nettoyer les timeouts précédents
    if (this.animationTimeout) {
      clearTimeout(this.animationTimeout);
    }

    this.isSelecting = true;
    this.animationPhase = 'spinning';
    this.cdr.detectChanges();

    // Animation de suspense (1.5 secondes)
    this.animationTimeout = setTimeout(() => {
      this.animationPhase = 'revealing';
      this.cdr.detectChanges();

      // Générer les duos pour chaque équipe
      this.teams.forEach(team => {
        if (team.id && team.players.length >= 2) {
          const duo = this.selectRandomDuo(team);
          if (duo) {
            this.selectedDuos[team.id] = duo;
          }
        }
      });

      this.animationTimeout = setTimeout(() => {
        this.animationPhase = 'revealed';
        this.isSelecting = false;
        this.cdr.detectChanges();
      }, 500);
    }, 1500);
  }

  /**
   * Sélectionner un duo aléatoire pour une équipe, en privilégiant fille + garçon
   */
  private selectRandomDuo(team: Team): Duo | null {
    if (team.players.length < 2) return null;

    // Séparer les joueurs par genre
    const hommes = team.players.filter(p => p.gender === 'HOMME');
    const femmes = team.players.filter(p => p.gender === 'FEMME');
    
    let player1: Player;
    let player2: Player;

    // Stratégie : privilégier fille + garçon (90% de chance)
    // Si possible, toujours faire fille + garçon quand il y a au moins un de chaque
    if (hommes.length > 0 && femmes.length > 0) {
      // 90% de chance de faire fille + garçon
      if (Math.random() < 0.9) {
        // Mélanger et prendre au hasard
        const shuffledHommes = this.shuffleArray([...hommes]);
        const shuffledFemmes = this.shuffleArray([...femmes]);
        player1 = shuffledHommes[0];
        player2 = shuffledFemmes[0];
      } else {
        // 10% de chance : prendre deux joueurs aléatoires (peut être même genre si pas assez de mixité)
        const shuffled = this.shuffleArray([...team.players]);
        player1 = shuffled[0];
        player2 = shuffled[1];
      }
    } else {
      // Pas assez de mixité : prendre deux joueurs aléatoires
      const shuffled = this.shuffleArray([...team.players]);
      player1 = shuffled[0];
      player2 = shuffled[1];
    }

    return {
      player1,
      player2,
      team
    };
  }

  /**
   * Mélanger un tableau
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Confirmer les duos sélectionnés
   */
  confirmSelection() {
    const duos: { [teamId: number]: { player1: Player; player2: Player } } = {};
    
    Object.keys(this.selectedDuos).forEach(teamIdStr => {
      const teamId = +teamIdStr;
      const duo = this.selectedDuos[teamId];
      if (duo && duo.player1 && duo.player2) {
        duos[teamId] = {
          player1: duo.player1,
          player2: duo.player2
        };
      }
    });

    this.duosSelected.emit(duos);
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

  ngOnDestroy() {
    if (this.animationTimeout) {
      clearTimeout(this.animationTimeout);
    }
  }
}

