import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { Team } from '../../models/team';
import { Player } from '../../models/player';

interface TournamentMatch {
  id: number;
  teamA: Team;
  teamB: Team | null; // null si BYE
  representativeA: Player | null;
  representativeB: Player | null;
  winner: Team | null;
  round: number;
  isBye: boolean;
}

interface TournamentRound {
  round: number;
  matches: TournamentMatch[];
  isComplete: boolean;
}

interface TeamElimination {
  team: Team;
  eliminationRound: number | null; // null = vainqueur
  representative: Player | null;
}

interface NumberCard {
  value: number; // 1 à 9
  isRevealed: boolean;
  revealedBy: 'A' | 'B' | null;
  revealOrder: number; // Ordre dans lequel la carte a été révélée
  wasCorrect: boolean; // Si la carte était correcte au moment de la révélation
}

@Component({
  selector: 'app-memory-numerique',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule
  ],
  templateUrl: './memory-numerique.html',
  styleUrl: './memory-numerique.css'
})
export class MemoryNumeriqueComponent implements OnInit {
  @Input() teams: Team[] = [];
  @Output() completed = new EventEmitter<{ positions: { [teamId: number]: number } }>();
  @Output() cancelled = new EventEmitter<void>();

  phase: 'selection' | 'tournament' | 'playing' | 'matchResult' | 'final' | 'completed' = 'selection';

  // Sélection des représentants
  teamRepresentatives: { [teamId: number]: Player | null } = {};
  allRepresentativesSelected: boolean = false;

  // Tournoi
  tournamentRounds: TournamentRound[] = [];
  currentRound: number = 1;
  currentMatchIndex: number = 0;
  currentMatch: TournamentMatch | null = null;

  // Éliminations
  teamEliminations: TeamElimination[] = [];
  activeTeams: Team[] = [];

  // Jeu en cours
  cards: NumberCard[] = [];
  currentTurn: 'A' | 'B' = 'A'; // Tour actuel
  expectedNext: number = 1; // Prochain numéro attendu (1 à 9)
  revealedCount: number = 0; // Nombre de cartes révélées correctement
  matchWinner: Team | null = null;
  correctStreakCount: number = 0; // Nombre de cartes correctes consécutives pour l'équipe actuelle

  // Résultats finaux
  finalRanking: { team: Team; position: number; eliminationRound: number | null }[] = [];

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.initializeRepresentatives();
    this.initializeEliminations();
    this.activeTeams = [...this.teams];
  }

  /**
   * Initialiser les structures pour les représentants
   */
  initializeRepresentatives() {
    this.teams.forEach(team => {
      this.teamRepresentatives[team.id!] = null;
    });
  }

  /**
   * Initialiser les éliminations
   */
  initializeEliminations() {
    this.teamEliminations = this.teams.map(team => ({
      team,
      eliminationRound: null,
      representative: null
    }));
  }

  /**
   * Sélectionner un représentant pour une équipe
   */
  selectRepresentative(team: Team, player: Player) {
    this.teamRepresentatives[team.id!] = player;
    this.teamEliminations.find(e => e.team.id === team.id)!.representative = player;
    this.checkAllRepresentativesSelected();
    this.cdr.detectChanges();
  }

  /**
   * Vérifier si tous les représentants ont été sélectionnés
   */
  checkAllRepresentativesSelected() {
    this.allRepresentativesSelected = this.teams.every(team => {
      return this.teamRepresentatives[team.id!] !== null;
    });
  }

  /**
   * Obtenir le représentant d'une équipe
   */
  getRepresentative(team: Team): Player | null {
    return this.teamRepresentatives[team.id!] || null;
  }

  /**
   * Démarrer le tournoi
   */
  startTournament() {
    if (!this.allRepresentativesSelected) {
      console.warn('Tous les représentants doivent être sélectionnés avant de démarrer le tournoi.');
      return;
    }
    this.phase = 'tournament';
    this.currentRound = 1;
    this.currentMatchIndex = 0;
    this.generateTournamentBracket();
    this.showNextMatch();
  }

  /**
   * Générer le bracket du tournoi (premier round uniquement)
   */
  generateTournamentBracket() {
    this.tournamentRounds = [];
    const teamsForRound = [...this.activeTeams];
    const currentRoundNumber = 1;
    const matches: TournamentMatch[] = [];
    const shuffledTeams = this.shuffleArray([...teamsForRound]);

    // Gérer les BYE
    if (shuffledTeams.length % 2 !== 0 && shuffledTeams.length > 1) {
      const byeTeam = shuffledTeams.pop()!;
      matches.push({
        id: matches.length + 1,
        teamA: byeTeam,
        teamB: null,
        representativeA: this.getRepresentative(byeTeam),
        representativeB: null,
        winner: byeTeam,
        round: currentRoundNumber,
        isBye: true
      });
    }

    // Créer les matchs normaux
    while (shuffledTeams.length >= 2) {
      const team1 = shuffledTeams.pop()!;
      const team2 = shuffledTeams.pop()!;

      matches.push({
        id: matches.length + 1,
        teamA: team1,
        teamB: team2,
        representativeA: this.getRepresentative(team1),
        representativeB: this.getRepresentative(team2),
        winner: null,
        round: currentRoundNumber,
        isBye: false
      });
    }

    this.tournamentRounds.push({
      round: currentRoundNumber,
      matches: matches,
      isComplete: false
    });
    
    this.cdr.detectChanges();
  }

  /**
   * Afficher le match suivant
   */
  showNextMatch() {
    const currentRoundData = this.tournamentRounds[this.currentRound - 1];

    if (this.currentMatchIndex < currentRoundData.matches.length) {
      this.currentMatch = currentRoundData.matches[this.currentMatchIndex];
      this.cdr.detectChanges();

      // Si c'est un BYE, passer au suivant
      if (this.currentMatch.isBye) {
        this.updateEliminationStatus(this.currentMatch.teamA, null);
        setTimeout(() => {
          this.currentMatchIndex++;
          this.showNextMatch();
        }, 1500);
      } else {
        // Démarrer le jeu
        this.startMatch();
      }
    } else {
      // Round terminé, passer au suivant
      currentRoundData.isComplete = true;
      this.nextRound();
    }
  }

  /**
   * Démarrer un match
   */
  startMatch() {
    if (!this.currentMatch || this.currentMatch.isBye) return;

    this.phase = 'playing';
    this.initializeCards();
    this.currentTurn = 'A';
    this.expectedNext = 1;
    this.revealedCount = 0;
    this.matchWinner = null;
    this.correctStreakCount = 0;
    this.cdr.detectChanges();
  }

  /**
   * Initialiser les cartes (1 à 9, mélangées)
   */
  initializeCards() {
    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const shuffled = this.shuffleArray([...numbers]);
    
    this.cards = shuffled.map((value, index) => ({
      value,
      isRevealed: false,
      revealedBy: null,
      revealOrder: 0,
      wasCorrect: false
    }));
  }

  /**
   * Retourner une carte
   */
  revealCard(cardIndex: number) {
    if (!this.currentMatch || this.currentMatch.isBye) return;
    if (this.phase !== 'playing') return;
    
    const card = this.cards[cardIndex];
    if (card.isRevealed) return; // Carte déjà révélée

    // Vérifier si c'est le bon numéro AVANT de révéler
    const isCorrect = card.value === this.expectedNext;
    
    // Révéler la carte temporairement pour l'affichage
    card.isRevealed = true;
    card.revealedBy = this.currentTurn;
    card.wasCorrect = isCorrect;

    // Vérifier si c'est le bon numéro
    if (isCorrect) {
      // Bon numéro ! La carte reste ouverte et l'équipe continue
      this.revealedCount++;
      card.revealOrder = this.revealedCount;
      this.correctStreakCount++;
      this.expectedNext++;
      
      // Vérifier si la séquence est complète (1-9)
      if (this.expectedNext > 9) {
        // VICTOIRE ! Toutes les cartes restent ouvertes pour voir la séquence complète
        this.matchWinner = this.currentTurn === 'A' ? this.currentMatch.teamA : this.currentMatch.teamB!;
        this.endMatch();
        return;
      }
      
      // Continuer avec le même joueur (pas de changement de tour)
      // Les cartes déjà révélées correctement restent ouvertes
      this.cdr.detectChanges();
    } else {
      // Erreur : TOUTES les cartes se referment et on passe la main
      // Attendre un peu pour voir la carte incorrecte révélée avant de tout refermer
      setTimeout(() => {
        this.closeAllCards();
        this.currentTurn = this.currentTurn === 'A' ? 'B' : 'A';
        this.expectedNext = 1; // On repart du début
        this.revealedCount = 0;
        this.correctStreakCount = 0;
        this.cdr.detectChanges();
      }, 1500); // 1.5 secondes pour voir la carte incorrecte
    }
  }

  /**
   * Refermer toutes les cartes (quand une erreur est commise)
   */
  closeAllCards() {
    this.cards.forEach(card => {
      // Refermer toutes les cartes sauf celles qui font partie d'une série correcte complète
      // En fait, on referme TOUTES les cartes car une erreur a été commise
      card.isRevealed = false;
      card.revealedBy = null;
      card.revealOrder = 0;
      card.wasCorrect = false;
    });
  }

  /**
   * Terminer le match
   */
  endMatch() {
    if (!this.currentMatch || !this.matchWinner) return;

    this.currentMatch.winner = this.matchWinner;
    const loserTeam = (this.currentMatch.teamA.id === this.matchWinner.id) 
      ? this.currentMatch.teamB 
      : this.currentMatch.teamA;
    
    if (loserTeam) {
      this.updateEliminationStatus(loserTeam, this.currentRound);
    }
    
    this.phase = 'matchResult';
    this.cdr.detectChanges();

    // Attendre un peu avant de passer au match suivant
    setTimeout(() => {
      this.currentMatchIndex++;
      this.showNextMatch();
    }, 3000);
  }

  /**
   * Mettre à jour le statut d'élimination
   */
  updateEliminationStatus(team: Team, round: number | null) {
    const eliminationEntry = this.teamEliminations.find(e => e.team.id === team.id);
    if (eliminationEntry) {
      eliminationEntry.eliminationRound = round;
    }
    this.cdr.detectChanges();
  }

  /**
   * Passer au round suivant
   */
  nextRound() {
    const currentRoundData = this.tournamentRounds[this.currentRound - 1];

    // Collecter les gagnants
    const winnersOfCurrentRound = currentRoundData.matches
      .filter(m => m.winner !== null)
      .map(m => m.winner!);

    this.activeTeams = winnersOfCurrentRound;

    if (this.activeTeams.length <= 1) {
      // Tournoi terminé
      this.finishTournament();
      return;
    }

    this.currentRound++;
    this.currentMatchIndex = 0;

    // Générer les matchs pour le nouveau round
    this.generateTournamentBracketForNextRound(this.activeTeams);
    this.showNextMatch();
  }

  /**
   * Générer les matchs pour le round suivant
   */
  generateTournamentBracketForNextRound(teams: Team[]) {
    const currentRoundNumber = this.tournamentRounds.length + 1;
    const matches: TournamentMatch[] = [];
    const shuffledTeams = this.shuffleArray(teams);

    let byeTeam: Team | null = null;
    if (shuffledTeams.length % 2 !== 0 && shuffledTeams.length > 1) {
      byeTeam = shuffledTeams.pop()!;
      matches.push({
        id: matches.length + 1,
        teamA: byeTeam,
        teamB: null,
        representativeA: this.getRepresentative(byeTeam),
        representativeB: null,
        winner: byeTeam,
        round: currentRoundNumber,
        isBye: true
      });
    }

    while (shuffledTeams.length >= 2) {
      const team1 = shuffledTeams.pop()!;
      const team2 = shuffledTeams.pop()!;

      matches.push({
        id: matches.length + 1,
        teamA: team1,
        teamB: team2,
        representativeA: this.getRepresentative(team1),
        representativeB: this.getRepresentative(team2),
        winner: null,
        round: currentRoundNumber,
        isBye: false
      });
    }

    this.tournamentRounds.push({
      round: currentRoundNumber,
      matches: matches,
      isComplete: false
    });
    this.cdr.detectChanges();
  }

  /**
   * Terminer le tournoi
   */
  finishTournament() {
    this.phase = 'final';

    const winnerTeam = this.activeTeams[0];
    if (winnerTeam) {
      this.updateEliminationStatus(winnerTeam, null);
    }

    this.calculateFinalRanking();
    this.cdr.detectChanges();
  }

  /**
   * Calculer le classement final
   */
  calculateFinalRanking() {
    const teamsByEliminationRound: { [round: number]: Team[] } = {};
    const winners: Team[] = [];

    this.teamEliminations.forEach(entry => {
      if (entry.eliminationRound === null) {
        winners.push(entry.team);
      } else {
        if (!teamsByEliminationRound[entry.eliminationRound]) {
          teamsByEliminationRound[entry.eliminationRound] = [];
        }
        teamsByEliminationRound[entry.eliminationRound].push(entry.team);
      }
    });

    const sortedEliminationRounds = Object.keys(teamsByEliminationRound)
      .map(Number)
      .sort((a, b) => b - a);

    let currentPosition = 1;
    this.finalRanking = [];

    // 1. Vainqueur
    this.shuffleArray(winners).forEach(team => {
      this.finalRanking.push({ team, position: currentPosition, eliminationRound: null });
    });
    if (winners.length > 0) currentPosition++;

    // 2. Finaliste (éliminé au dernier round)
    if (sortedEliminationRounds.length > 0) {
      const lastEliminationRound = sortedEliminationRounds[0];
      this.shuffleArray(teamsByEliminationRound[lastEliminationRound]).forEach(team => {
        this.finalRanking.push({ team, position: currentPosition, eliminationRound: lastEliminationRound });
      });
      currentPosition += teamsByEliminationRound[lastEliminationRound].length;
      sortedEliminationRounds.shift();
    }

    // 3. Autres éliminés
    sortedEliminationRounds.forEach(round => {
      this.shuffleArray(teamsByEliminationRound[round]).forEach(team => {
        this.finalRanking.push({ team, position: currentPosition, eliminationRound: round });
      });
      currentPosition += teamsByEliminationRound[round].length;
    });

    this.cdr.detectChanges();
  }

  /**
   * Finaliser et retourner les résultats
   */
  complete() {
    this.phase = 'completed';
    const positions: { [teamId: number]: number } = {};
    this.finalRanking.forEach(rank => {
      if (rank.team.id) {
        positions[rank.team.id] = rank.position;
      }
    });
    this.completed.emit({ positions });
  }

  /**
   * Annuler
   */
  cancel() {
    this.cancelled.emit();
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
   * Calculer le nombre total de rounds attendus
   */
  getTotalRounds(): number {
    let teamCount = this.teams.length;
    let rounds = 0;
    while (teamCount > 1) {
      teamCount = Math.ceil(teamCount / 2);
      rounds++;
    }
    return rounds;
  }

  /**
   * Obtenir le nom du round
   */
  getRoundName(roundNumber: number, totalRounds?: number): string {
    const total = totalRounds || this.getTotalRounds();
    const positionFromEnd = total - roundNumber + 1;
    
    if (positionFromEnd === 1) {
      return '🏆 Finale';
    } else if (positionFromEnd === 2) {
      return '⚔️ Demi-finale';
    } else if (positionFromEnd === 3) {
      return '🎯 Quart de finale';
    } else if (positionFromEnd === 4) {
      return '🎲 Huitième de finale';
    }
    return `Round ${roundNumber}`;
  }
}
