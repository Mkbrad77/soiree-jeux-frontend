import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatRadioModule } from '@angular/material/radio';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TeamService } from '../../services/team';
import { GameService } from '../../services/game';
import { Team } from '../../models/team';
import { Game } from '../../models/game';
import { Player } from '../../models/player';

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatListModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatChipsModule,
    MatRadioModule,
    MatIconModule,
    MatTooltipModule,
          MatTooltipModule
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit, OnDestroy {
  teams: Team[] = [];
  games: Game[] = [];
  currentGame: Game | null = null;
  showResults: boolean = false;
  showPlayerManagement: boolean = false;
  
  // Positions temporaires pour enregistrer les résultats
  tempPositions: { [teamId: number]: number } = {};
  
  // Gestion des joueurs
  newPlayerName: string = '';
  newPlayerGender: 'HOMME' | 'FEMME' = 'HOMME';
  selectedTeamForNewPlayer: number | null = null;
  isLoading: boolean = false;
  errorMessage: string = '';
  
  // Pour gérer la destruction du composant
  private destroy$ = new Subject<void>();
  
  // Pour les animations et badges
  previousRanks: { [teamId: number]: number } = {}; // Position précédente de chaque équipe
  teamBadges: { [teamId: number]: string } = {}; // Badges pour chaque équipe
  animationState: { [teamId: number]: 'up' | 'down' | 'none' } = {}; // État d'animation
  
  // Shots temporaires pour le jeu en cours (avant validation)
  currentGameShots: { [teamId: number]: number } = {}; // Shots à boire pour le jeu actuel
  
  // Shots du dernier jeu complété (affichés jusqu'au prochain jeu)
  lastGameShots: { [teamId: number]: number } = {}; // Shots du dernier jeu complété
  lastCompletedGameId: number | null = null; // ID du dernier jeu complété

  constructor(
    private teamService: TeamService,
    private gameService: GameService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Charger les données d'abord
    this.loadData();
    
    // Écouter les changements de queryParams (pour les navigations futures)
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const gameIdParam = params['gameId'];
        const action = params['action'];
        
        if (gameIdParam) {
          const gameId = +gameIdParam;
          // Utiliser les jeux déjà chargés si disponibles
          if (this.games.length > 0) {
            this.selectGameFromId(gameId, action);
          }
          // Sinon, checkQueryParamsAfterLoad() sera appelé après le chargement
        } else {
          // Pas de gameId, réinitialiser la sélection si nécessaire
          // Utiliser setTimeout pour éviter ExpressionChangedAfterItHasBeenCheckedError
          setTimeout(() => {
            if (this.currentGame && this.currentGame.completed) {
              // Si le jeu actuel est complété, sélectionner le premier non complété
              if (this.games.length > 0) {
                const nextGame = this.games.find(g => !g.completed);
                if (nextGame) {
                  this.currentGame = nextGame;
                }
              }
            }
            // Fermer le formulaire de résultats si on revient sans gameId
            this.showResults = false;
            this.cdr.detectChanges();
          }, 0);
        }
      });
  }

  /**
   * Sélectionner un jeu par son ID et gérer l'action
   */
  private selectGameFromId(gameId: number, action?: string): void {
    if (this.destroy$.closed) return;
    
    const game = this.games.find(g => g.id === gameId);
    if (game) {
      // Utiliser setTimeout pour éviter ExpressionChangedAfterItHasBeenCheckedError
      setTimeout(() => {
        if (this.destroy$.closed) return;
        
        this.currentGame = game;
        this.tempPositions = {};
        
        // Si action=start, ouvrir directement le formulaire de résultats
        if (action === 'start' && !game.completed) {
          this.showResultsForm();
        } else {
          this.showResults = false;
        }
        
        // Forcer la détection de changement
        this.cdr.detectChanges();
        
        // Scroller vers le haut de la page puis vers le jeu sélectionné
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setTimeout(() => {
            if (this.destroy$.closed) return;
            const gameDetailElement = document.querySelector('.current-game-bar');
            if (gameDetailElement) {
              gameDetailElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 500);
        }
      }, 0);
    } else {
      console.warn('Jeu non trouvé avec ID:', gameId);
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData() {
    // Sauvegarder les positions précédentes avant de recharger
    const currentSortedTeams = this.getSortedTeams();
    currentSortedTeams.forEach((team, index) => {
      const teamId = team.id;
      if (teamId) {
        this.previousRanks[teamId] = index + 1;
      }
    });

    // Charger les équipes
    this.teamService.getAllTeams()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (teams) => {
          // S'assurer que toutes les équipes commencent à 0 points si elles n'ont pas encore joué
          this.teams = teams.map(team => ({
            ...team,
            totalPoints: team.totalPoints || 0,
            shotsCount: team.shotsCount || 0
          }));
          
          // Calculer les animations et badges après le chargement
          // Utiliser setTimeout pour éviter ExpressionChangedAfterItHasBeenCheckedError
          setTimeout(() => {
            this.calculateAnimationsAndBadges();
            this.cdr.detectChanges(); // Forcer la détection de changement
          }, 0);
        },
        error: (error) => {
          console.error('Erreur lors du chargement des équipes:', error);
          this.teams = [];
          this.cdr.detectChanges(); // Forcer la détection de changement
        }
      });

    // Charger les jeux (soirée anniversaire : uniquement les 5 jeux)
    const allowedGameNames = ['Blindtest', 'Jeu de Mime', 'Whisky Undercover', 'Speed Dating', 'Gage'];
    this.gameService.getAllGames()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (games) => {
          this.games = games.filter((g: Game) => allowedGameNames.includes(g.name));
          
          // Utiliser setTimeout pour éviter ExpressionChangedAfterItHasBeenCheckedError
          setTimeout(() => {
            // Sélectionner le premier jeu non complété seulement si aucun jeu n'est déjà sélectionné
            if (!this.currentGame) {
              this.currentGame = games.find(g => !g.completed) || null;
            }
            
            // Si un nouveau jeu est sélectionné, effacer les shots du dernier jeu
            if (this.currentGame?.id && this.currentGame.id !== this.lastCompletedGameId) {
              // Si on passe à un nouveau jeu, effacer les shots du jeu précédent
              const previousGame = games.find(g => g.id === this.lastCompletedGameId);
              if (previousGame && !previousGame.completed) {
                // Le jeu précédent n'est plus complété, effacer les shots
                this.lastGameShots = {};
                this.lastCompletedGameId = null;
              }
            }
            
            // Vérifier si on doit sélectionner un jeu depuis les queryParams
            this.checkQueryParamsAfterLoad();
            this.cdr.detectChanges(); // Forcer la détection de changement
          }, 0);
        },
        error: (error) => {
          console.error('Erreur lors du chargement des jeux:', error);
          this.games = [];
        }
      });
  }

  /**
   * Vérifier les queryParams après le chargement des jeux
   */
  private checkQueryParamsAfterLoad(): void {
    if (this.destroy$.closed) return;
    
    // Récupérer les paramètres actuels
    const params = this.route.snapshot.queryParams;
    const gameIdParam = params['gameId'];
    const action = params['action'];
    
    if (gameIdParam && this.games.length > 0) {
      const gameId = +gameIdParam;
      this.selectGameFromId(gameId, action);
    }
  }

  // Sélectionner un jeu - rediriger vers l'écran d'intro
  selectGame(game: Game) {
    if (game.id) {
      // Rediriger vers l'écran d'intro du jeu
      this.router.navigate(['/games', game.id, 'intro']);
    }
  }

  // Afficher le formulaire de résultats
  showResultsForm() {
    this.showResults = true;
    // Initialiser les positions à 0 (non sélectionné)
    this.tempPositions = {};
    this.currentGameShots = {};
    this.teams.forEach(team => {
      if (team.id) {
        this.tempPositions[team.id] = 0;
        this.currentGameShots[team.id] = 0;
      }
    });
  }
  
  /**
   * Calculer les shots à boire pour le jeu en cours selon les positions temporaires
   */
  getShotsForCurrentGame(teamId: number | undefined): number {
    if (!teamId) return 0;
    const position = this.tempPositions[teamId];
    if (!position || position <= 0) return 0;
    // Calculer les shots : position - 1 (1er = 0, 2ème = 1, 3ème = 2, etc.)
    return Math.max(0, position - 1);
  }
  
  /**
   * Vérifier si une équipe a des shots à boire pour le jeu en cours
   */
  hasShotsForCurrentGame(teamId: number | undefined): boolean {
    return this.getShotsForCurrentGame(teamId) > 0;
  }
  
  /**
   * Obtenir les shots du dernier jeu complété (affichés temporairement)
   */
  getLastGameShots(teamId: number | undefined): number {
    if (!teamId) return 0;
    return this.lastGameShots[teamId] || 0;
  }
  
  /**
   * Vérifier si une équipe a des shots du dernier jeu complété
   */
  hasLastGameShots(teamId: number | undefined): boolean {
    return this.getLastGameShots(teamId) > 0;
  }
  
  /**
   * Marquer les shots d'une équipe comme bus (effacer du dernier jeu)
   */
  markShotsAsDrank(teamId: number | undefined) {
    if (!teamId) return;
    if (this.lastGameShots[teamId]) {
      delete this.lastGameShots[teamId];
      // Si toutes les équipes ont bu leurs shots, effacer complètement
      const hasAnyShots = Object.values(this.lastGameShots).some(shots => shots > 0);
      if (!hasAnyShots) {
        this.lastGameShots = {};
        this.lastCompletedGameId = null;
      }
    }
  }

  // Vérifier si toutes les positions sont remplies et uniques
  canSaveResults(): boolean {
    if (!this.currentGame?.id || this.teams.length === 0) return false;
    
    // Vérifier que toutes les équipes ont une position valide
    const hasAllPositions = this.teams.every(team => {
      const position = this.tempPositions[team.id!];
      return position && position > 0 && position <= this.teams.length;
    });
    
    if (!hasAllPositions) return false;
    
    // Vérifier que toutes les positions sont uniques
    const positions = this.teams
      .map(team => this.tempPositions[team.id!])
      .filter(pos => pos > 0);
    const uniquePositions = new Set(positions);
    
    return positions.length === uniquePositions.size && positions.length === this.teams.length;
  }

  // Obtenir les options de positions selon le nombre d'équipes
  getPositionOptions(): number[] {
    return Array.from({ length: this.teams.length }, (_, i) => i + 1);
  }

  // Obtenir le texte et les points pour une position
  getPositionLabel(position: number): string {
    const points = this.getPointsForPosition(position);
    const emoji = this.getMedalEmoji(position);
    const suffix = position === 1 ? 'er' : 'ème';
    return `${emoji} ${position}${suffix} (${points} pts)`;
  }

  // Obtenir les points selon la position
  getPointsForPosition(position: number): number {
    const totalTeams = this.teams.length;
    if (totalTeams === 0) return 0;
    // Système de points : 1er = 3 points, 2ème = 2 points, 3ème = 1 point, 4ème = 0 points
    // Pour 2 équipes : 1er=3pts, 2ème=2pts
    // Pour 3 équipes : 1er=3pts, 2ème=2pts, 3ème=1pt
    // Pour 4 équipes : 1er=3pts, 2ème=2pts, 3ème=1pt, 4ème=0pt
    return Math.max(0, 4 - position);
  }

  // Enregistrer les résultats
  saveResults() {
    if (!this.currentGame?.id || !this.canSaveResults()) return;

    // Filtrer les positions valides (supprimer les 0)
    const validPositions: { [teamId: number]: number } = {};
    this.teams.forEach(team => {
      if (team.id && this.tempPositions[team.id] > 0) {
        validPositions[team.id] = this.tempPositions[team.id];
      }
    });

    // Sauvegarder les shots du jeu qui vient d'être complété AVANT l'envoi
    const currentGameId = this.currentGame.id;
    const shotsToSave: { [teamId: number]: number } = {};
    this.teams.forEach(team => {
      if (team.id) {
        const position = this.tempPositions[team.id];
        if (position && position > 0) {
          shotsToSave[team.id] = Math.max(0, position - 1);
        }
      }
    });

    this.isLoading = true;
    this.errorMessage = '';

    this.gameService.saveResults(currentGameId, validPositions)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Sauvegarder les shots du jeu qui vient d'être complété
          this.lastCompletedGameId = currentGameId;
          this.lastGameShots = shotsToSave;
          
          this.isLoading = false;
          this.showResults = false;
          this.tempPositions = {};
          this.currentGameShots = {}; // Réinitialiser les shots temporaires
          this.errorMessage = '';
          this.loadData(); // Recharger les données (les animations seront calculées dans loadData)
          
          // Vérifier si tous les jeux sont complétés
          this.checkIfAllGamesCompleted();
          
          this.cdr.detectChanges(); // Forcer la détection de changement
        },
        error: (error) => {
          console.error('Erreur lors de la sauvegarde:', error);
          this.isLoading = false;
          // Afficher le message d'erreur du backend si disponible
          if (error.error && error.error.message) {
            this.errorMessage = error.error.message;
          } else if (error.message) {
            this.errorMessage = error.message;
          } else {
            this.errorMessage = 'Erreur lors de la sauvegarde. Vérifiez que toutes les positions sont uniques.';
          }
          this.cdr.detectChanges(); // Forcer la détection de changement
        }
      });
  }
  
  /**
   * Calculer les animations et badges pour chaque équipe
   */
  calculateAnimationsAndBadges() {
    const sortedTeams = this.getSortedTeams();
    
    sortedTeams.forEach((team, index) => {
      if (!team.id) return;
      
      const teamId = team.id; // Stocker dans une variable pour éviter les erreurs TypeScript
      const currentRank = index + 1;
      const previousRank = this.previousRanks[teamId] || currentRank;
      
      // Calculer l'animation
      if (previousRank > currentRank) {
        this.animationState[teamId] = 'up';
      } else if (previousRank < currentRank) {
        this.animationState[teamId] = 'down';
      } else {
        this.animationState[teamId] = 'none';
      }
      
      // Mettre à jour la position précédente
      this.previousRanks[teamId] = currentRank;
      
      // Calculer les badges
      this.calculateTeamBadge(team);
    });
    
    // Réinitialiser les animations après 2 secondes
    setTimeout(() => {
      Object.keys(this.animationState).forEach(teamId => {
        const id = +teamId;
        if (id) {
          this.animationState[id] = 'none';
        }
      });
    }, 2000);
  }
  
  /**
   * Calculer le badge d'une équipe
   */
  calculateTeamBadge(team: Team) {
    const teamId = team.id;
    if (!teamId) return;
    
    const badges: string[] = [];
    
    // Vérifier "👑 Leader incontesté" (+X points d'avance) - pas besoin d'historique
    const sortedTeams = this.getSortedTeams();
    if (sortedTeams.length > 1 && sortedTeams[0].id === teamId) {
      const secondPlace = sortedTeams[1];
      const lead = team.totalPoints - secondPlace.totalPoints;
      if (lead >= 5) {
        badges.push(`👑 Leader (+${lead} pts)`);
      }
    }
    
    // Capturer teamId dans une constante pour les callbacks (évite les erreurs TypeScript)
    const capturedTeamId: number = teamId;
    
    // Charger l'historique pour les autres badges
    this.gameService.getTeamHistory(capturedTeamId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (history) => {
          const currentBadges = [...badges];
          
          // Vérifier "🔥 Équipe en feu" (2 victoires consécutives)
          if (history.length >= 2) {
            const lastTwo = history.slice(-2);
            if (lastTwo.every(r => r.position === 1)) {
              currentBadges.push('🔥 En feu');
            }
          }
          
          // Vérifier "💀 Équipe en galère" (3 résultats d'affilée avec shots)
          // On vérifie si les 3 derniers résultats ont tous eu des shots (position > 1)
          if (history.length >= 3) {
            const lastThree = history.slice(-3);
            // Vérifier que tous les 3 derniers résultats ont eu au moins 1 shot
            const allHadShots = lastThree.every(r => r.position > 1);
            if (allHadShots) {
              currentBadges.push('💀 En galère');
            }
          }
          
          this.teamBadges[capturedTeamId] = currentBadges.join(' • ');
        },
        error: (error) => {
          console.error('Erreur lors du chargement de l\'historique:', error);
          // Mettre quand même le badge de leader si applicable
          this.teamBadges[capturedTeamId] = badges.join(' • ');
        }
      });
  }
  
  /**
   * Obtenir le badge d'une équipe
   */
  getTeamBadge(teamId: number | undefined): string {
    if (!teamId) return '';
    return this.teamBadges[teamId] || '';
  }
  
  /**
   * Obtenir l'état d'animation d'une équipe
   */
  getTeamAnimationState(teamId: number | undefined): string {
    if (!teamId) return 'none';
    return this.animationState[teamId] || 'none';
  }

  // Obtenir la couleur de la médaille selon la position
  getMedalColor(position: number): string {
    switch(position) {
      case 1: return '#FFD700'; // Or
      case 2: return '#C0C0C0'; // Argent
      case 3: return '#CD7F32'; // Bronze
      default: return '#gray';
    }
  }

  // Obtenir l'emoji selon la position
  getMedalEmoji(position: number): string {
    switch(position) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '4️⃣';
    }
  }

  // Obtenir les équipes triées par points (décroissant)
  getSortedTeams(): Team[] {
    return [...this.teams].sort((a, b) => {
      // Trier par points décroissants
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      // En cas d'égalité, trier par nombre de shots croissant (moins de shots = mieux)
      return a.shotsCount - b.shotsCount;
    });
  }

  // Obtenir l'icône selon le type de jeu
  getGameIcon(type: string): string {
    switch(type) {
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

  // Obtenir le label du type de jeu
  getGameTypeLabel(type: string): string {
    switch(type) {
      case 'TOUS_ENSEMBLE':
        return 'Toute l\'équipe';
      case 'REPRESENTANT':
        return 'Un représentant';
      case 'DUO':
        return 'Duo';
      case 'UN_VS_UN':
        return '1 vs 1';
      default:
        return type;
    }
  }

  // ========== GESTION DES JOUEURS ==========

  // Afficher/masquer le panneau de gestion des joueurs
  togglePlayerManagement() {
    this.showPlayerManagement = !this.showPlayerManagement;
    if (this.showPlayerManagement) {
      this.newPlayerName = '';
      this.newPlayerGender = 'HOMME';
      this.selectedTeamForNewPlayer = this.teams.length > 0 ? this.teams[0].id! : null;
    }
  }

  // Ajouter un joueur à une équipe
  addPlayerToTeam() {
    if (!this.newPlayerName.trim() || !this.selectedTeamForNewPlayer) {
      this.errorMessage = 'Veuillez remplir le nom et sélectionner une équipe';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const newPlayer: Player = {
      name: this.newPlayerName.trim(),
      gender: this.newPlayerGender
    };

    this.teamService.addPlayer(this.selectedTeamForNewPlayer, newPlayer)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.newPlayerName = '';
          this.loadData(); // Recharger les données
          this.cdr.detectChanges(); // Forcer la détection de changement
        },
        error: (error) => {
          console.error('Erreur lors de l\'ajout du joueur:', error);
          this.isLoading = false;
          this.errorMessage = 'Erreur lors de l\'ajout du joueur. Vérifiez que le backend est démarré.';
          this.cdr.detectChanges(); // Forcer la détection de changement
        }
      });
  }

  // Retirer un joueur d'une équipe
  removePlayerFromTeam(teamId: number, playerId: number) {
    if (!confirm('Êtes-vous sûr de vouloir retirer ce joueur de l\'équipe ?')) {
      return;
    }

    this.teamService.removePlayer(teamId, playerId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadData(); // Recharger les données
          this.cdr.detectChanges(); // Forcer la détection de changement
        },
        error: (error) => {
          console.error('Erreur lors du retrait du joueur:', error);
          this.errorMessage = 'Erreur lors du retrait du joueur.';
          this.cdr.detectChanges(); // Forcer la détection de changement
        }
      });
  }

  /**
   * Vérifier si tous les jeux sont complétés et rediriger vers le podium
   */
  checkIfAllGamesCompleted() {
    if (this.games.length === 0) return;
    
    const allCompleted = this.games.every(game => game.completed);
    
    if (allCompleted) {
      // Attendre un peu pour que l'utilisateur voie la mise à jour
      setTimeout(() => {
        this.router.navigate(['/podium']);
      }, 1500);
    }
  }

  /**
   * Naviguer vers le podium (accessible à tout moment)
   */
  goToPodium() {
    this.router.navigate(['/podium']);
  }
}
