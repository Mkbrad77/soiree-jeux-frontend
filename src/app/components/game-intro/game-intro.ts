import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatInputModule } from '@angular/material/input';

import { GameService } from '../../services/game';
import { TimerService, TimerState } from '../../services/timer';
import { TeamService } from '../../services/team';
import { Game } from '../../models/game';
import { Team } from '../../models/team';
import { Player } from '../../models/player';
import { RepresentantSelectorComponent } from '../representant-selector/representant-selector';
import { DuelScreenComponent } from '../duel-screen/duel-screen';
import { SpeedDatingComponent } from '../speed-dating/speed-dating';
import { MemoryNumeriqueComponent } from '../memory-numerique/memory-numerique';
import { DuoSelectorComponent } from '../duo-selector/duo-selector';
import { GageSelectorComponent } from '../gage-selector/gage-selector';
import { BlindtestComponent } from '../blindtest/blindtest';
import { Subscription, takeUntil, Subject } from 'rxjs';
import { ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-game-intro',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatSelectModule,
    MatRadioModule,
    MatInputModule,
    RepresentantSelectorComponent,
    DuelScreenComponent,
    SpeedDatingComponent,
    MemoryNumeriqueComponent,
    DuoSelectorComponent,
    GageSelectorComponent,
    BlindtestComponent
  ],
  templateUrl: './game-intro.html',
  styleUrl: './game-intro.css',
})
export class GameIntro implements OnInit, OnDestroy {
  game: Game | null = null;
  gameId: number | null = null;
  isLoading: boolean = false;
  errorMessage: string = '';

  // Timer
  timerState: TimerState = {
    isRunning: false,
    timeRemaining: 0,
    duration: 0,
    progress: 0
  };
  showTimer: boolean = false;
  timerDuration: number = 120; // 2 minutes par défaut
  timerStarted: boolean = false; // Pour savoir si le timer a été démarré au moins une fois

  // Pour les composants spéciaux
  teams: Team[] = [];
  showRepresentantSelector: boolean = false;
  showDuelScreen: boolean = false;
  showSpeedDating: boolean = false;
  showMemoryNumerique: boolean = false;
  showDuoSelector: boolean = false;
  showGageSelector: boolean = false;
  showUndercoverOutcome: boolean = false;
  showBlindtest: boolean = false;
  gameStarted: boolean = false;
  
  selectedRepresentants: { [teamId: number]: { player: Player; team: Team } } = {};
  selectedDuos: { [teamId: number]: { player1: Player; player2: Player; team: Team } } = {};

  // Whisky Undercover : issue à saisir
  undercoverMisterWhiteTeamId: number | null = null;
  undercoverEliminated: boolean = false;
  undercoverEliminatedInRound: number | null = null;
  undercoverSubmitting: boolean = false;

  private destroy$ = new Subject<void>();
  private timerUpdateInterval: any = null; // Pour nettoyer l'intervalle de mise à jour du timer

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gameService: GameService,
    private timerService: TimerService,
    private teamService: TeamService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Réagir à chaque changement d'id dans l'URL (ex: clic sur un autre jeu depuis le dashboard)
    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(paramMap => {
        const id = paramMap.get('id');
        if (id) {
          const newId = +id;
          if (newId !== this.gameId) {
            this.resetGameState();
            this.gameId = newId;
            this.loadGame();
            this.cdr.detectChanges();
          }
        }
      });

    // S'abonner au timer avec takeUntil pour éviter les fuites mémoire
    this.timerService.getTimerState()
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.timerState = state;
        this.cdr.detectChanges();
      });
  }

  /** Réinitialiser l'état du composant quand on change de jeu (même instance réutilisée) */
  private resetGameState() {
    this.game = null;
    this.errorMessage = '';
    this.isLoading = true;
    this.showRepresentantSelector = false;
    this.showDuelScreen = false;
    this.showSpeedDating = false;
    this.showMemoryNumerique = false;
    this.showDuoSelector = false;
    this.showGageSelector = false;
    this.showUndercoverOutcome = false;
    this.showBlindtest = false;
    this.gameStarted = false;
    this.selectedRepresentants = {};
    this.selectedDuos = {};
    this.undercoverMisterWhiteTeamId = null;
    this.undercoverEliminated = false;
    this.undercoverEliminatedInRound = null;
    this.timerStarted = false;
    if (this.timerState.isRunning) {
      this.timerService.stopTimer();
    }
  }

  ngOnDestroy() {
    // Nettoyer l'intervalle de mise à jour du timer
    if (this.timerUpdateInterval) {
      clearInterval(this.timerUpdateInterval);
      this.timerUpdateInterval = null;
    }
    
    // L'abonnement sera automatiquement désabonné par takeUntil(this.destroy$)
    this.timerService.stopTimer();
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadGame() {
    if (!this.gameId) return;

    this.isLoading = true;
    this.gameService.getAllGames().subscribe({
      next: (games) => {
        this.game = games.find(g => g.id === this.gameId) || null;
        this.isLoading = false;
        
        if (!this.game) {
          this.errorMessage = 'Jeu non trouvé';
        } else {
          this.showTimer = this.needsTimer(this.game);
          this.timerDuration = this.getTimerDuration(this.game);
          this.loadTeams();
          this.gameStarted = false;
        }
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Erreur lors du chargement du jeu:', error);
        this.errorMessage = 'Erreur lors du chargement du jeu';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Déterminer si un jeu nécessite un timer
   */
  needsTimer(game: Game): boolean {
    const timedGames = [
      'Pyramide de Cups',
      'Battle de Pompes',
      'Casque et Phrases',
      'Balloon Pop',
      'Jeu de Mime'
    ];
    return timedGames.includes(game.name);
  }

  /**
   * Obtenir la durée du timer selon le jeu
   */
  getTimerDuration(game: Game): number {
    const durations: { [key: string]: number } = {
      'Pyramide de Cups': 300, // 5 minutes
      'Battle de Pompes': 180, // 3 minutes
      'Casque et Phrases': 120, // 2 minutes
      'Balloon Pop': 60, // 1 minute
      'Jeu de Mime': 120 // 2 minutes
    };
    return durations[game.name] || 120;
  }

  /**
   * Obtenir l'icône selon le type de jeu
   */
  getGameIcon(): string {
    if (!this.game) return '🎮';
    
    switch (this.game.type) {
      case 'TOUS_ENSEMBLE':
        return '👥';
      case 'REPRESENTANT':
        return '⭐';
      case 'DUO':
        return '🤝';
      case 'UN_VS_UN':
        return '⚔️';
      default:
        return '🎮';
    }
  }

  /**
   * Obtenir le label du type de jeu
   */
  getGameTypeLabel(): string {
    if (!this.game) return '';
    
    switch (this.game.type) {
      case 'TOUS_ENSEMBLE':
        return 'Toute l\'équipe';
      case 'REPRESENTANT':
        return 'Un représentant';
      case 'DUO':
        return 'Duo';
      case 'UN_VS_UN':
        return '1 vs 1';
      default:
        return this.game.type;
    }
  }

  /**
   * Démarrer le timer
   */
  startTimer() {
    // Nettoyer l'intervalle précédent s'il existe
    if (this.timerUpdateInterval) {
      clearInterval(this.timerUpdateInterval);
    }
    
    this.timerStarted = true;
    this.timerService.startTimer(this.timerDuration);
    // Forcer la détection de changement immédiatement
    this.cdr.detectChanges();
    
    // Forcer la détection de changement périodiquement pour s'assurer que la vue se met à jour
    // (en plus de l'abonnement qui devrait déjà le faire)
    this.timerUpdateInterval = setInterval(() => {
      if (!this.timerState.isRunning && this.timerState.timeRemaining === 0) {
        clearInterval(this.timerUpdateInterval);
        this.timerUpdateInterval = null;
        return;
      }
      this.cdr.detectChanges();
    }, 100); // Mise à jour toutes les 100ms
    
    // Nettoyer l'intervalle après la fin du timer
    setTimeout(() => {
      if (this.timerUpdateInterval) {
        clearInterval(this.timerUpdateInterval);
        this.timerUpdateInterval = null;
      }
    }, (this.timerDuration + 1) * 1000);
  }

  /**
   * Arrêter le timer
   */
  stopTimer() {
    // Nettoyer l'intervalle de mise à jour
    if (this.timerUpdateInterval) {
      clearInterval(this.timerUpdateInterval);
      this.timerUpdateInterval = null;
    }
    
    this.timerService.stopTimer();
    this.cdr.detectChanges(); // Forcer la détection de changement
  }

  /**
   * Formater le temps restant
   */
  formatTime(seconds: number): string {
    return this.timerService.formatTime(seconds);
  }

  /**
   * Formater les règles pour l'affichage HTML
   */
  formatRules(description: string): string {
    if (!description) return '';
    
    // Remplacer les sauts de ligne par <br>
    let formatted = description.replace(/\n/g, '<br>');
    
    // Mettre en gras les titres (lignes commençant par emoji + texte)
    formatted = formatted.replace(/(🎯|📋|👤|👥|🎮|⏱️|🏆|💡|📦|🔄|⚔️|📊|🤝|🕵️|🏗️|💪|🎧|🍷|🧠|🎈|🗼|💧|📏|🎭|🔄|📋|⚔️|🏆|📊|💡)([^\n<]+)/g, '<strong>$1$2</strong>');
    
    return formatted;
  }

  /**
   * Charger les équipes
   */
  loadTeams() {
    this.teamService.getAllTeams()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (teams) => {
          this.teams = teams;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des équipes:', error);
        }
      });
  }

  /**
   * Lancer le jeu (soirée anniversaire : Blindtest, Mime, Undercover, Speed Dating, Gage)
   */
  launchGame() {
    if (this.timerState.isRunning) {
      this.timerService.stopTimer();
    }

    if (this.game?.name === 'Blindtest') {
      this.showBlindtest = true;
      this.cdr.detectChanges();
      return;
    }
    if (this.game?.name === 'Speed Dating') {
      this.showSpeedDating = true;
      this.cdr.detectChanges();
      return;
    }
    if (this.game?.name === 'Gage') {
      this.showGageSelector = true;
      this.cdr.detectChanges();
      return;
    }
    if (this.game?.name === 'Whisky Undercover') {
      this.showUndercoverOutcome = true;
      this.cdr.detectChanges();
      return;
    }
    if (this.game?.name === 'Jeu de Mime' && this.game?.type === 'REPRESENTANT') {
      this.showRepresentantSelector = true;
      this.cdr.detectChanges();
      return;
    }

    // Autres jeux (Mime après représentant, etc.) : saisie du classement
    this.gameStarted = true;
    this.cdr.detectChanges();
  }

  onBlindtestCompleted() {
    this.showBlindtest = false;
    if (this.gameId) {
      this.router.navigate(['/dashboard'], { queryParams: { gameId: this.gameId, action: 'start' } });
    }
    this.cdr.detectChanges();
  }

  onBlindtestCancelled() {
    this.showBlindtest = false;
    this.cdr.detectChanges();
  }

  /**
   * Gérer la sélection individuelle d'un représentant (pour compatibilité)
   */
  onRepresentantSelected(selection: { teamId: number; playerId: number }) {
    // Trouver l'équipe et le joueur
    const team = this.teams.find(t => t.id === selection.teamId);
    if (team) {
      const player = team.players.find(p => p.id === selection.playerId);
      if (player) {
        // Stocker le représentant sélectionné pour l'affichage
        this.selectedRepresentants[selection.teamId] = { player, team };
      }
    }
  }

  /**
   * Gérer toutes les sélections confirmées d'un coup
   */
  onRepresentantAllSelected(allSelections: { [teamId: number]: Player }) {
    // Stocker tous les représentants sélectionnés
    Object.keys(allSelections).forEach(teamIdStr => {
      const teamId = +teamIdStr;
      const player = allSelections[teamId];
      const team = this.teams.find(t => t.id === teamId);
      if (team) {
        this.selectedRepresentants[teamId] = { player, team };
      }
    });
    
    // Cacher le sélecteur et afficher la page d'intro avec les représentants
    this.showRepresentantSelector = false;
    this.gameStarted = true; // Marquer le jeu comme démarré
    this.cdr.detectChanges();
  }

  /**
   * Annuler la sélection du représentant
   */
  onRepresentantCancelled() {
    this.showRepresentantSelector = false;
    this.cdr.detectChanges(); // Forcer la détection de changement
  }

  /**
   * Duel prêt
   */
  onDuelReady() {
    this.showDuelScreen = false;
    // Marquer le jeu comme démarré et rester sur la page intro
    this.gameStarted = true;
    this.cdr.detectChanges(); // Forcer la détection de changement
  }

  /**
   * Annuler le duel
   */
  onDuelCancelled() {
    this.showDuelScreen = false;
    this.cdr.detectChanges(); // Forcer la détection de changement
  }

  /**
   * Speed Dating terminé : enregistrer les résultats puis aller au dashboard
   */
  onSpeedDatingCompleted(result: { positions: { [teamId: number]: number } }) {
    this.showSpeedDating = false;
    if (!this.gameId) {
      this.cdr.detectChanges();
      return;
    }
    this.gameService.saveResults(this.gameId, result.positions).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Erreur lors de l\'enregistrement du classement.';
        this.cdr.detectChanges();
      }
    });
    this.cdr.detectChanges();
  }

  /**
   * Annuler le Speed Dating
   */
  onSpeedDatingCancelled() {
    this.showSpeedDating = false;
    this.cdr.detectChanges();
  }

  /**
   * Gérer la complétion du Memory Numérique
   */
  onMemoryNumeriqueCompleted(result: { positions: { [teamId: number]: number } }) {
    this.showMemoryNumerique = false;
    this.gameStarted = true;
    
    // Rediriger vers le dashboard avec les positions pré-remplies
    if (this.gameId) {
      const queryParams: any = { 
        gameId: this.gameId, 
        action: 'start'
      };
      
      // Ajouter les positions comme query params (pour pré-remplir le formulaire)
      Object.keys(result.positions).forEach(teamId => {
        queryParams[`position_${teamId}`] = result.positions[+teamId];
      });
      
      this.router.navigate(['/dashboard'], { queryParams });
    }
    this.cdr.detectChanges();
  }

  /**
   * Annuler Memory Numérique
   */
  onMemoryNumeriqueCancelled() {
    this.showMemoryNumerique = false;
    this.cdr.detectChanges();
  }

  /**
   * Gérer la sélection des duos (Cup Challenge)
   */
  onDuosSelected(duos: { [teamId: number]: { player1: Player; player2: Player } }) {
    // Stocker les duos sélectionnés pour l'affichage
    Object.keys(duos).forEach(teamIdStr => {
      const teamId = +teamIdStr;
      const duo = duos[teamId];
      const team = this.teams.find(t => t.id === teamId);
      if (team) {
        this.selectedDuos[teamId] = {
          ...duo,
          team
        };
      }
    });
    
    // Cacher le sélecteur et afficher la page d'intro avec les duos
    this.showDuoSelector = false;
    this.gameStarted = true; // Marquer le jeu comme démarré
    this.cdr.detectChanges();
  }

  /**
   * Annuler la sélection des duos
   */
  onDuoSelectorCancelled() {
    this.showDuoSelector = false;
    this.cdr.detectChanges();
  }

  /**
   * Vérifier s'il y a des duos sélectionnés
   */
  hasSelectedDuos(): boolean {
    return Object.keys(this.selectedDuos).length > 0;
  }

  /**
   * Obtenir les IDs des équipes qui ont un duo sélectionné
   */
  getTeamIdsWithDuos(): number[] {
    return Object.keys(this.selectedDuos)
      .map(id => +id)
      .filter(id => this.selectedDuos[id]);
  }

  /**
   * Aller enregistrer les résultats (rediriger vers le dashboard)
   */
  goToResults() {
    if (this.gameId) {
      this.router.navigate(['/dashboard'], {
        queryParams: { gameId: this.gameId, action: 'start' }
      });
    }
  }

  /**
   * Retour au dashboard (sans sélectionner de jeu)
   */
  goBack() {
    // Arrêter le timer si en cours
    if (this.timerState.isRunning) {
      this.timerService.stopTimer();
    }
    // Retour simple au dashboard sans paramètres
    this.router.navigate(['/dashboard']);
  }

  /**
   * Obtenir les IDs des équipes qui ont un représentant sélectionné
   */
  getTeamIdsWithRepresentants(): number[] {
    return Object.keys(this.selectedRepresentants)
      .map(id => +id)
      .filter(id => this.selectedRepresentants[id]);
  }

  /**
   * Gérer la complétion du Gage
   */
  onGageCompleted(result: { teamId: number; points: number }) {
    this.showGageSelector = false;
    this.gameStarted = true;
    
    // Enregistrer les points bonus directement
    if (this.gameId && result.points > 0) {
      // Créer un GameResult avec position 1 pour l'équipe qui a gagné les points
      // Les autres équipes n'ont pas de résultat (pas de classement)
      this.gameService.saveGageBonus(this.gameId, result.teamId, result.points).subscribe({
        next: () => {
          // Rediriger vers le dashboard
          this.router.navigate(['/dashboard']);
        },
        error: (error) => {
          console.error('Erreur lors de l\'enregistrement des points bonus:', error);
          this.errorMessage = 'Erreur lors de l\'enregistrement des points';
          this.cdr.detectChanges();
        }
      });
    } else {
      // Aucun point gagné, simplement retourner au dashboard
      this.router.navigate(['/dashboard']);
    }
    this.cdr.detectChanges();
  }

  onGageCancelled() {
    this.showGageSelector = false;
    this.cdr.detectChanges();
  }

  /**
   * Soumettre l'issue Whisky Undercover (Mister White)
   */
  onUndercoverSubmit() {
    if (!this.gameId || this.undercoverMisterWhiteTeamId == null) {
      this.errorMessage = 'Sélectionnez l\'équipe qui avait Mister White (la vodka).';
      this.cdr.detectChanges();
      return;
    }
    if (this.undercoverEliminated && (this.undercoverEliminatedInRound == null || this.undercoverEliminatedInRound < 1 || this.undercoverEliminatedInRound > 3)) {
      this.errorMessage = 'Indiquez à quel tour (1, 2 ou 3) Mister White a été éliminé.';
      this.cdr.detectChanges();
      return;
    }
    this.undercoverSubmitting = true;
    this.errorMessage = '';
    this.gameService.saveUndercoverOutcome(
      this.gameId,
      this.undercoverMisterWhiteTeamId,
      this.undercoverEliminated,
      this.undercoverEliminated ? (this.undercoverEliminatedInRound ?? 1) : undefined
    ).subscribe({
      next: () => {
        this.showUndercoverOutcome = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.undercoverSubmitting = false;
        this.errorMessage = err?.error?.message || 'Erreur lors de l\'enregistrement.';
        this.cdr.detectChanges();
      }
    });
  }

  onUndercoverCancelled() {
    this.showUndercoverOutcome = false;
    this.cdr.detectChanges();
  }

  /**
   * Vérifier s'il y a des représentants sélectionnés
   */
  hasSelectedRepresentants(): boolean {
    return Object.keys(this.selectedRepresentants).length > 0;
  }
}

