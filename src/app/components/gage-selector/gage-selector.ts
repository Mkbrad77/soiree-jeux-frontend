// src/app/components/gage-selector/gage-selector.ts
import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { Team } from '../../models/team';
import { Player } from '../../models/player';
import { TeamService } from '../../services/team';

interface Gage {
  id: number;
  text: string;
  category: 'vert' | 'orange' | 'rouge';
  points: number;
}

@Component({
  selector: 'app-gage-selector',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule
  ],
  templateUrl: './gage-selector.html',
  styleUrl: './gage-selector.css'
})
export class GageSelectorComponent implements OnInit, OnDestroy {
  @Input() teams: Team[] = [];
  @Output() completed = new EventEmitter<{ teamId: number; points: number }>();
  @Output() cancelled = new EventEmitter<void>();

  phase: 'selecting-player' | 'gage-choice' | 'result' = 'selecting-player';
  
  lastTeam: Team | null = null;
  selectedPlayer: Player | null = null;
  excludedPlayers: Player[] = [];
  availablePlayers: Player[] = [];
  
  gages: Gage[] = [];
  selectedGage: Gage | null = null;
  pointsEarned: number = 0;
  
  // Pour l'animation de sélection aléatoire
  isSelectingPlayer: boolean = false;
  selectionAnimationTimeout: any = null;

  // Liste complète des gages par catégorie
  private gagesVert: string[] = [
    "Faire un bisou sur la joue à une personne du sexe opposé de ton choix",
    "Faire un câlin de 10 secondes à quelqu'un de l'équipe adverse",
    "Dire un compliment osé à voix haute à quelqu'un de ton choix",
    "Danser de façon sexy pendant 30 secondes sur une musique imposée",
    "Chanter \"Je t'aime\" en regardant quelqu'un dans les yeux",
    "Faire 5 pompes en mode sensuel (en te léchant les lèvres)",
    "Masser les épaules de quelqu'un pendant 1 minute",
    "Dire à voix haute : \"Je suis le/la plus sexy de cette soirée\" en posant",
    "Faire un clin d'œil à chaque personne du sexe opposé présente",
    "Raconter ton pire date Tinder/rencard devant tout le monde"
  ];

  private gagesOrange: string[] = [
    "Faire un bisou rapide sur la bouche (2 secondes) à une personne du sexe opposé de ton choix",
    "Embrasser le cou de quelqu'un pendant 5 secondes (avec son accord)",
    "Danser collé-serré avec quelqu'un de ton choix pendant 45 secondes",
    "S'asseoir sur les genoux de quelqu'un pendant 1 minute",
    "Dire ton fantasme le plus soft devant tout le monde",
    "Faire une lap dance de 20 secondes (sur une chaise, habillé)",
    "Souffler sensuellement dans l'oreille de quelqu'un",
    "Répondre honnêtement : \"Qui est la personne la plus sexy ici selon toi ?\"",
    "Répondre honnêtement : \"Avec qui tu partirais dans une chambre ce soir ?\"",
    "Mimer une scène de séduction de 30 secondes avec quelqu'un"
  ];

  private gagesRouge: string[] = [
    "Faire un bisou langoureux (5 secondes) à une personne du sexe opposé de ton choix (CONSENTEMENT requis)",
    "Embrasser le cou + souffler dans l'oreille de quelqu'un (CONSENTEMENT requis)",
    "Répondre honnêtement : \"Quel est ton fantasme secret ?\"",
    "Répondre honnêtement : \"Quelle est la dernière chose coquine que tu as faite ?\"",
    "Répondre honnêtement : \"Tu as déjà embrassé quelqu'un du même sexe ? Si oui, raconte\"",
    "Danser un slow très collé pendant 1 minute entière (CONSENTEMENT requis)",
    "Enlever un vêtement de ton choix (sauf sous-vêtements) pour le reste du jeu en cours",
    "Faire un massage sensuel (dos/nuque) de 2 minutes à quelqu'un (CONSENTEMENT requis)",
    "Jouer \"7 minutes au paradis soft\" : partir 5 minutes dans une autre pièce avec quelqu'un pour une discussion osée (CONSENTEMENT requis)",
    "Lécher sensuellement ton doigt et caresser la joue de quelqu'un (CONSENTEMENT requis)"
  ];

  constructor(
    private teamService: TeamService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.initializeGame();
  }

  initializeGame() {
    // Charger les équipes triées par points
    this.teamService.getAllTeams().subscribe({
      next: (teams) => {
        // Trier par points décroissants
        teams.sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
        
        // L'équipe dernière est celle avec le moins de points
        this.lastTeam = teams[teams.length - 1];
        
        if (!this.lastTeam || !this.lastTeam.players || this.lastTeam.players.length === 0) {
          console.error('Aucune équipe dernière trouvée ou équipe sans joueurs');
          this.cancel();
          return;
        }

        this.availablePlayers = [...this.lastTeam.players];
        this.excludedPlayers = [];
        this.startPlayerSelection();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des équipes:', error);
        this.cancel();
      }
    });
  }

  startPlayerSelection() {
    if (this.availablePlayers.length === 0) {
      // Tous les joueurs ont refusé
      this.completeWithNoPoints();
      return;
    }

    // Phase d'animation de sélection
    this.phase = 'selecting-player';
    this.isSelectingPlayer = true;
    this.selectedPlayer = null;
    this.selectedGage = null;
    
    // Générer de nouveaux gages pour ce nouveau membre
    this.generateGages();

    // Animation de sélection aléatoire (2 secondes)
    if (this.selectionAnimationTimeout) {
      clearTimeout(this.selectionAnimationTimeout);
    }

    this.selectionAnimationTimeout = setTimeout(() => {
      // Sélectionner un joueur aléatoire parmi ceux disponibles
      const randomIndex = Math.floor(Math.random() * this.availablePlayers.length);
      this.selectedPlayer = this.availablePlayers[randomIndex];
      this.isSelectingPlayer = false;
      this.phase = 'gage-choice';
      this.cdr.detectChanges();
    }, 2000);
  }

  selectRandomPlayer() {
    // Cette méthode est maintenant remplacée par startPlayerSelection()
    this.startPlayerSelection();
  }

  generateGages() {
    // Sélectionner 1 gage aléatoire par catégorie
    const vertIndex = Math.floor(Math.random() * this.gagesVert.length);
    const orangeIndex = Math.floor(Math.random() * this.gagesOrange.length);
    const rougeIndex = Math.floor(Math.random() * this.gagesRouge.length);

    this.gages = [
      {
        id: 1,
        text: this.gagesVert[vertIndex],
        category: 'vert',
        points: 2
      },
      {
        id: 2,
        text: this.gagesOrange[orangeIndex],
        category: 'orange',
        points: 3
      },
      {
        id: 3,
        text: this.gagesRouge[rougeIndex],
        category: 'rouge',
        points: 5
      }
    ];
  }

  selectGage(gage: Gage) {
    this.selectedGage = gage;
    this.cdr.detectChanges();
  }

  acceptGage() {
    if (!this.selectedGage || !this.lastTeam) return;

    // Le joueur accepte et accomplit le gage
    // Les points sont ajoutés automatiquement
    this.pointsEarned = this.selectedGage.points;
    this.completeWithPoints();
  }

  refuseGage() {
    if (!this.selectedPlayer) return;

    // Exclure le joueur qui a refusé
    this.excludedPlayers.push(this.selectedPlayer);
    this.availablePlayers = this.availablePlayers.filter(p => p.id !== this.selectedPlayer?.id);
    
    // Réinitialiser la sélection
    this.selectedPlayer = null;
    this.selectedGage = null;
    
    // Retourner à la sélection d'un nouveau joueur (avec nouveaux gages)
    this.startPlayerSelection();
  }

  completeWithPoints() {
    if (!this.lastTeam || !this.selectedGage) return;

    // Nettoyer les timeouts
    if (this.selectionAnimationTimeout) {
      clearTimeout(this.selectionAnimationTimeout);
    }

    this.completed.emit({
      teamId: this.lastTeam.id!,
      points: this.selectedGage.points
    });
  }

  completeWithNoPoints() {
    // Nettoyer les timeouts
    if (this.selectionAnimationTimeout) {
      clearTimeout(this.selectionAnimationTimeout);
    }

    // Tous les joueurs ont refusé, aucun point
    this.completed.emit({
      teamId: this.lastTeam?.id || 0,
      points: 0
    });
  }

  ngOnDestroy() {
    if (this.selectionAnimationTimeout) {
      clearTimeout(this.selectionAnimationTimeout);
    }
  }

  cancel() {
    this.cancelled.emit();
  }

  getCategoryEmoji(category: string): string {
    switch (category) {
      case 'vert': return '🟢';
      case 'orange': return '🟠';
      case 'rouge': return '🔴';
      default: return '';
    }
  }

  getCategoryName(category: string): string {
    switch (category) {
      case 'vert': return 'Niveau 1 : Gage Léger';
      case 'orange': return 'Niveau 2 : Gage Moyen';
      case 'rouge': return 'Niveau 3 : Gage Osé';
      default: return '';
    }
  }
}

