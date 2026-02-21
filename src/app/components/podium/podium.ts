// src/app/components/podium/podium.ts
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Team } from '../../models/team';
import { Game } from '../../models/game';
import { TeamService } from '../../services/team';
import { GameService } from '../../services/game';

interface TeamStats {
  team: Team;
  position: number;
  totalPoints: number;
  totalShots: number;
  gamesPlayed: number;
  wins: number;
  worstPosition: number;
  bestPosition: number;
  progress: number; // Différence entre position finale et position initiale (négatif = comeback)
}

@Component({
  selector: 'app-podium',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './podium.html',
  styleUrl: './podium.css'
})
export class PodiumComponent implements OnInit, OnDestroy {
  teams: Team[] = [];
  games: Game[] = [];
  sortedTeams: TeamStats[] = [];
  
  // Stats fun
  mostDrunkTeam: Team | null = null;
  bestComebackTeam: Team | null = null;
  worstPerformanceTeam: Team | null = null;
  
  // Confettis
  showConfetti: boolean = true;
  confettiInterval: any = null;
  
  // Vérifier si tous les jeux sont complétés
  allGamesCompleted: boolean = false;
  loading: boolean = true;

  constructor(
    private teamService: TeamService,
    private gameService: GameService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadData();
    this.startConfetti();
  }

  ngOnDestroy() {
    this.stopConfetti();
  }

  loadData() {
    this.loading = true;
    this.cdr.detectChanges();

    // Charger les équipes
    this.teamService.getAllTeams().subscribe({
      next: (teams) => {
        this.teams = teams || [];
        this.calculateStats();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des équipes:', error);
        this.teams = [];
        this.sortedTeams = [];
        this.loading = false;
        this.cdr.detectChanges();
      }
    });

    // Charger les jeux pour vérifier s'ils sont tous complétés
    this.gameService.getAllGames().subscribe({
      next: (games) => {
        this.games = games || [];
        this.allGamesCompleted = this.games.length > 0 && this.games.every(game => game.completed);
        if (!this.allGamesCompleted) {
          this.showConfetti = false;
          this.stopConfetti();
        }
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des jeux:', error);
        this.cdr.detectChanges();
      }
    });
  }

  calculateStats() {
    // Trier les équipes par points
    const sorted = [...this.teams].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
    
    // Calculer les stats pour chaque équipe
    this.sortedTeams = sorted.map((team, index) => {
      const stats: TeamStats = {
        team,
        position: index + 1,
        totalPoints: team.totalPoints || 0,
        totalShots: team.shotsCount || 0,
        gamesPlayed: 0,
        wins: 0,
        worstPosition: 0,
        bestPosition: 999,
        progress: 0
      };

      // TODO: Calculer les stats détaillées si nécessaire
      // Pour l'instant, on utilise les données de base
      
      return stats;
    });

    // Calculer les stats fun
    this.calculateFunStats();
  }

  calculateFunStats() {
    if (this.sortedTeams.length === 0) return;

    // Équipe la plus bourrée (le plus de shots)
    const teamsWithShots = this.sortedTeams.filter(t => t.totalShots > 0);
    if (teamsWithShots.length > 0) {
      this.mostDrunkTeam = teamsWithShots.reduce((max, current) => 
        current.totalShots > max.totalShots ? current : max
      ).team;
    }

    // Meilleur comeback : équipe qui n'est pas 1ère mais qui a le plus de points parmi les autres
    // (logique simplifiée : on prend la 2ème équipe)
    if (this.sortedTeams.length > 1) {
      this.bestComebackTeam = this.sortedTeams[1]?.team || null;
    }

    // Pire performance (équipe avec le moins de points)
    if (this.sortedTeams.length > 0) {
      this.worstPerformanceTeam = this.sortedTeams[this.sortedTeams.length - 1]?.team || null;
    }
  }

  getMedalEmoji(position: number): string {
    switch (position) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '';
    }
  }

  getPositionText(position: number): string {
    switch (position) {
      case 1: return '1er';
      case 2: return '2ème';
      case 3: return '3ème';
      default: return `${position}ème`;
    }
  }

  startConfetti() {
    // Créer des confettis animés
    this.confettiInterval = setInterval(() => {
      this.createConfetti();
    }, 300);
    
    // Arrêter après 10 secondes
    setTimeout(() => {
      this.stopConfetti();
    }, 10000);
  }

  stopConfetti() {
    if (this.confettiInterval) {
      clearInterval(this.confettiInterval);
      this.confettiInterval = null;
    }
  }

  createConfetti() {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.left = Math.random() * 100 + '%';
    confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
    confetti.style.backgroundColor = this.getRandomColor();
    document.body.appendChild(confetti);

    setTimeout(() => {
      confetti.remove();
    }, 5000);
  }

  getRandomColor(): string {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }
}

