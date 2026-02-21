import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { FormsModule } from '@angular/forms';
import { Player } from '../../models/player';
import { Team } from '../../models/team';

@Component({
  selector: 'app-representant-selector',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatRadioModule,
    FormsModule
  ],
  templateUrl: './representant-selector.html',
  styleUrl: './representant-selector.css'
})
export class RepresentantSelectorComponent implements OnInit, OnDestroy {
  @Input() teams: Team[] = [];
  @Input() gameName: string = '';
  @Output() selected = new EventEmitter<{ teamId: number; playerId: number }>();
  @Output() allSelected = new EventEmitter<{ [teamId: number]: Player }>(); // Émet toutes les sélections d'un coup
  @Output() cancelled = new EventEmitter<void>();

  selectedPlayers: { [teamId: number]: number | null } = {};
  mode: 'random' | 'vote' = 'random';
  isSelecting: boolean = false;
  selectedRepresentants: { [teamId: number]: Player | null } = {};
  showResult: boolean = false;
  animationPhase: 'spinning' | 'revealing' | 'revealed' = 'spinning';
  private animationTimeout: any = null;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    // Initialiser les sélections
    this.teams.forEach(team => {
      const teamId = team.id;
      if (teamId) {
        this.selectedPlayers[teamId] = null;
        this.selectedRepresentants[teamId] = null;
      }
    });
  }

  /**
   * Choisir le mode (aléatoire ou vote)
   */
  setMode(mode: 'random' | 'vote') {
    this.mode = mode;
    this.showResult = false;
    this.selectedRepresentants = {};
    this.teams.forEach(team => {
      const teamId = team.id;
      if (teamId) {
        this.selectedPlayers[teamId] = null;
        this.selectedRepresentants[teamId] = null;
      }
    });
  }

  /**
   * Sélectionner un joueur pour une équipe (mode vote)
   */
  selectPlayer(teamId: number, playerId: number) {
    this.selectedPlayers[teamId] = playerId;
  }

  /**
   * Lancer la sélection (aléatoire ou vote)
   */
  startSelection() {
    if (this.mode === 'vote') {
      // Vérifier que toutes les équipes ont sélectionné un joueur
      const allSelected = this.teams.every(team => {
        if (!team.id) return false;
        return this.selectedPlayers[team.id] !== null;
      });

      if (!allSelected) {
        alert('Veuillez sélectionner un représentant pour chaque équipe');
        return;
      }

      // Assigner directement les joueurs sélectionnés
      this.teams.forEach(team => {
        const teamId = team.id;
        if (teamId && this.selectedPlayers[teamId] !== null) {
          const playerId = this.selectedPlayers[teamId];
          if (playerId !== null) {
            const player = team.players.find(p => p.id === playerId);
            if (player) {
              this.selectedRepresentants[teamId] = player;
            }
          }
        }
      });
      this.showResult = true;
      this.animationPhase = 'revealed';
    } else {
      // Mode aléatoire avec animation
      // Nettoyer les timeouts précédents si existants
      if (this.animationTimeout) {
        clearTimeout(this.animationTimeout);
      }
      
      this.isSelecting = true;
      this.animationPhase = 'spinning';
      this.showResult = false;
      this.cdr.detectChanges(); // Forcer la détection de changement

      // Animation de suspense (2 secondes)
      this.animationTimeout = setTimeout(() => {
        this.animationPhase = 'revealing';
        this.cdr.detectChanges(); // Forcer la détection de changement
        
        // Sélectionner aléatoirement un joueur pour chaque équipe
        this.teams.forEach(team => {
          const teamId = team.id;
          if (teamId && team.players.length > 0) {
            const randomIndex = Math.floor(Math.random() * team.players.length);
            this.selectedRepresentants[teamId] = team.players[randomIndex];
          }
        });

        this.animationTimeout = setTimeout(() => {
          this.showResult = true;
          this.animationPhase = 'revealed';
          this.isSelecting = false;
          this.cdr.detectChanges(); // Forcer la détection de changement
        }, 500);
      }, 2000);
    }
  }

  /**
   * Confirmer les sélections
   */
  confirmSelection() {
    // Émettre toutes les sélections d'un coup pour faciliter le traitement
    const allSelections: { [teamId: number]: Player } = {};
    this.teams.forEach(team => {
      const teamId = team.id;
      if (teamId && this.selectedRepresentants[teamId]) {
        const player = this.selectedRepresentants[teamId];
        if (player) {
          allSelections[teamId] = player;
          // Émettre aussi individuellement pour compatibilité
          if (player.id) {
            this.selected.emit({ teamId: teamId, playerId: player.id });
          }
        }
      }
    });
    
    // Émettre toutes les sélections ensemble (cela déclenchera la fermeture du sélecteur)
    this.allSelected.emit(allSelections);
  }

  /**
   * Annuler
   */
  cancel() {
    this.cancelled.emit();
  }

  /**
   * Réinitialiser pour recommencer
   */
  reset() {
    // Nettoyer les timeouts
    if (this.animationTimeout) {
      clearTimeout(this.animationTimeout);
      this.animationTimeout = null;
    }
    
    this.showResult = false;
    this.isSelecting = false;
    this.animationPhase = 'spinning';
    this.selectedRepresentants = {};
    this.selectedPlayers = {};
    this.teams.forEach(team => {
      const teamId = team.id;
      if (teamId) {
        this.selectedPlayers[teamId] = null;
        this.selectedRepresentants[teamId] = null;
      }
    });
    this.cdr.detectChanges(); // Forcer la détection de changement
  }

  ngOnDestroy() {
    // Nettoyer les timeouts lors de la destruction du composant
    if (this.animationTimeout) {
      clearTimeout(this.animationTimeout);
    }
  }
}

