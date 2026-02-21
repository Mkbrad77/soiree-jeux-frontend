import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { Team } from '../../models/team';
import { Player } from '../../models/player';

/** Un garçon qui performe devant une fille désignée */
interface Passage {
  boy: Player;
  team: Team;
  inFrontOf: Player; // fille devant qui il performe
}

@Component({
  selector: 'app-speed-dating',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatSelectModule
  ],
  templateUrl: './speed-dating.html',
  styleUrl: './speed-dating.css'
})
export class SpeedDatingComponent implements OnInit {
  @Input() teams: Team[] = [];
  @Output() completed = new EventEmitter<{ positions: { [teamId: number]: number } }>();
  @Output() cancelled = new EventEmitter<void>();

  phase: 'draw' | 'passages' | 'finalists' | 'final' | 'ranking' = 'draw';

  // Tirage : fille principale, 2e fille (si besoin), 1 garçon par équipe
  mainGirl: Player | null = null;
  mainGirlTeam: Team | null = null;
  secondGirl: Player | null = null;
  secondGirlTeam: Team | null = null;
  boysPerTeam: { [teamId: number]: Player } = {};
  passageOrder: Passage[] = [];

  // Finalistes (2 garçons) puis gagnant (1)
  selectedFinalist1: Passage | null = null;
  selectedFinalist2: Passage | null = null;
  winnerPassage: Passage | null = null;

  // Classement final
  finalRanking: { team: Team; position: number }[] = [];

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.doDraw();
  }

  /** Tirage au sort : fille principale, garçons (1 par équipe), 2e fille si équipe de la fille a un garçon */
  doDraw() {
    const allGirls: { player: Player; team: Team }[] = [];
    this.teams.forEach(team => {
      team.players.filter(p => p.gender === 'FEMME').forEach(p => allGirls.push({ player: p, team }));
    });
    const allBoysByTeam: { team: Team; boys: Player[] }[] = this.teams.map(team => ({
      team,
      boys: team.players.filter(p => p.gender === 'HOMME')
    }));

    if (allGirls.length === 0) {
      this.phase = 'ranking';
      this.finalRanking = this.teams.map((t, i) => ({ team: t, position: i + 1 }));
      this.cdr.detectChanges();
      return;
    }

    // Fille principale (tirée au sort)
    const mainIdx = Math.floor(Math.random() * allGirls.length);
    this.mainGirl = allGirls[mainIdx].player;
    this.mainGirlTeam = allGirls[mainIdx].team;

    // Un garçon par équipe (tiré au sort dans chaque équipe)
    this.boysPerTeam = {};
    allBoysByTeam.forEach(({ team, boys }) => {
      if (boys.length > 0) {
        this.boysPerTeam[team.id!] = boys[Math.floor(Math.random() * boys.length)];
      }
    });

    // Si l'équipe de la fille principale a un garçon en compétition → 2e fille (devant qui ce garçon performe)
    const mainTeamBoy = this.mainGirlTeam ? this.boysPerTeam[this.mainGirlTeam.id!] : null;
    const otherGirls = allGirls.filter(g => g.team.id !== this.mainGirlTeam?.id);
    if (mainTeamBoy && otherGirls.length > 0) {
      const secondIdx = Math.floor(Math.random() * otherGirls.length);
      this.secondGirl = otherGirls[secondIdx].player;
      this.secondGirlTeam = otherGirls[secondIdx].team;
    }

    // Ordre des passages : chaque garçon devant sa fille (principale ou 2e)
    this.passageOrder = [];
    this.teams.forEach(team => {
      const boy = this.boysPerTeam[team.id!];
      if (!boy) return;
      const inFrontOf = (team.id === this.mainGirlTeam?.id && this.secondGirl) ? this.secondGirl! : this.mainGirl!;
      this.passageOrder.push({ boy, team, inFrontOf });
    });
    this.shuffleArray(this.passageOrder);
    if (this.passageOrder.length === 0) {
      this.phase = 'ranking';
      this.finalRanking = this.teams.map((t, i) => ({ team: t, position: i + 1 }));
    } else if (this.passageOrder.length === 1) {
      this.winnerPassage = this.passageOrder[0];
      this.confirmWinner();
    } else {
      this.phase = 'draw'; // Afficher d'abord le résultat du tirage, puis l'utilisateur passe aux passages
    }
    this.cdr.detectChanges();
  }

  goToPassages() {
    this.phase = 'passages';
    this.cdr.detectChanges();
  }

  private shuffleArray<T>(a: T[]) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
  }

  goToFinalistsSelection() {
    this.phase = 'finalists';
    this.selectedFinalist1 = null;
    this.selectedFinalist2 = null;
    this.cdr.detectChanges();
  }

  isSelectedFinalist(p: Passage): boolean {
    return this.selectedFinalist1 === p || this.selectedFinalist2 === p;
  }

  selectFinalist(p: Passage) {
    if (this.isSelectedFinalist(p)) return;
    if (!this.selectedFinalist1) {
      this.selectedFinalist1 = p;
    } else if (!this.selectedFinalist2) {
      this.selectedFinalist2 = p;
    }
    this.cdr.detectChanges();
  }

  unselectFinalist(p: Passage) {
    if (this.selectedFinalist1 === p) this.selectedFinalist1 = null;
    if (this.selectedFinalist2 === p) this.selectedFinalist2 = null;
    this.cdr.detectChanges();
  }

  canConfirmFinalists(): boolean {
    return this.selectedFinalist1 != null && this.selectedFinalist2 != null &&
      this.selectedFinalist1.team.id !== this.selectedFinalist2.team.id;
  }

  confirmFinalists() {
    if (!this.canConfirmFinalists()) return;
    this.phase = 'final';
    this.winnerPassage = null;
    this.cdr.detectChanges();
  }

  selectWinner(p: Passage) {
    this.winnerPassage = p;
    this.cdr.detectChanges();
  }

  confirmWinner() {
    if (!this.winnerPassage) return;
    const winnerTeam = this.winnerPassage.team;
    if (this.selectedFinalist1 && this.selectedFinalist2) {
      const loserPassage = this.winnerPassage === this.selectedFinalist1 ? this.selectedFinalist2 : this.selectedFinalist1;
      const finalistTeam = loserPassage.team;
      const otherTeams = this.teams.filter(t => t.id !== winnerTeam.id && t.id !== finalistTeam.id);
      this.finalRanking = [
        { team: winnerTeam, position: 1 },
        { team: finalistTeam, position: 2 },
        ...otherTeams.map((t, i) => ({ team: t, position: 3 + i }))
      ];
    } else {
      const otherTeams = this.teams.filter(t => t.id !== winnerTeam.id);
      this.finalRanking = [
        { team: winnerTeam, position: 1 },
        ...otherTeams.map((t, i) => ({ team: t, position: 2 + i }))
      ];
    }
    this.phase = 'ranking';
    this.cdr.detectChanges();
  }

  complete() {
    const positions: { [teamId: number]: number } = {};
    this.finalRanking.forEach(r => {
      if (r.team.id) positions[r.team.id] = r.position;
    });
    this.completed.emit({ positions });
  }

  cancel() {
    this.cancelled.emit();
  }

  getGenderEmoji(g: string): string {
    return g === 'HOMME' ? '👨' : '👩';
  }

  getTeamForPlayer(player: Player): Team | undefined {
    return this.teams.find(t => t.players.some(p => p.id === player.id));
  }
}
