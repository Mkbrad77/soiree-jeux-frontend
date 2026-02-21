import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface BlindtestTheme {
  id: number;
  name: string;
  youtubeUrl: string;
}

const BLINDTEST_THEMES: BlindtestTheme[] = [
  { id: 1, name: 'Blindtest Afrobeat', youtubeUrl: 'https://youtu.be/4EdArYgOK5w?si=XURAROrNNjgTql3S' },
  { id: 2, name: 'Finish the Lyrics – Afrobeat', youtubeUrl: 'https://youtu.be/aV9bHh20JJg?si=GDzx2fhCBwD6ZTjN' },
  { id: 3, name: 'Aya Nakamura', youtubeUrl: 'https://youtu.be/V1PGmYvzsaU?si=nijRWT66CCmc6RtD' },
  { id: 4, name: 'Rap US (2016–2022)', youtubeUrl: 'https://youtu.be/dI6bt12UDRU?si=izxjS5diSMVyCHqr' },
  { id: 5, name: 'Rap US – Iconiques', youtubeUrl: 'https://youtu.be/nBOU2h5JfP0?si=w2oEARRW6Z7DU7mQ' },
  { id: 6, name: 'Rap FR', youtubeUrl: 'https://youtu.be/M8K7wumU0wE?si=5w6XXYLpUjfFFZlK' },
  { id: 7, name: 'Rap FR – Années 2010', youtubeUrl: 'https://youtu.be/4ipf13FydAU?si=wLKkiIuN3ah2d97w' },
];

@Component({
  selector: 'app-blindtest',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './blindtest.html',
  styleUrl: './blindtest.css',
})
export class BlindtestComponent implements OnInit, OnDestroy {
  @Output() completed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  themes = BLINDTEST_THEMES;
  currentThemeIndex = 0;
  phase: 'theme-selection' | 'playing' = 'theme-selection';

  /** Pour le swipe */
  private touchStartX = 0;

  constructor(
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cdr.detectChanges();
  }

  ngOnDestroy() {}

  get currentTheme(): BlindtestTheme {
    return this.themes[this.currentThemeIndex];
  }

  /** Convertit une URL youtu.be ou youtube.com en URL d'embed */
  getEmbedUrl(url: string): SafeResourceUrl {
    let videoId = '';
    if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0]?.split('&')[0] || '';
    } else {
      const match = url.match(/[?&]v=([^&]+)/);
      videoId = match ? match[1] : '';
    }
    const embed = `https://www.youtube.com/embed/${videoId}?autoplay=0`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(embed);
  }

  selectTheme(index: number) {
    this.currentThemeIndex = index;
    this.cdr.detectChanges();
  }

  startGame() {
    this.phase = 'playing';
    this.cdr.detectChanges();
  }

  previousTheme() {
    this.currentThemeIndex = (this.currentThemeIndex - 1 + this.themes.length) % this.themes.length;
    this.cdr.detectChanges();
  }

  nextTheme() {
    this.currentThemeIndex = (this.currentThemeIndex + 1) % this.themes.length;
    this.cdr.detectChanges();
  }

  /** Swipe : toucher */
  onTouchStart(e: TouchEvent) {
    this.touchStartX = e.touches[0].clientX;
  }

  onTouchEnd(e: TouchEvent) {
    const endX = e.changedTouches[0].clientX;
    const diff = this.touchStartX - endX;
    const minSwipe = 80;
    if (diff > minSwipe) this.nextTheme();
    else if (diff < -minSwipe) this.previousTheme();
  }

  /** Clavier : flèches gauche/droite */
  @HostListener('document:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {
    if (this.phase !== 'playing') return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this.previousTheme();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      this.nextTheme();
    }
  }

  goToResults() {
    this.completed.emit();
  }

  cancel() {
    this.cancelled.emit();
  }
}
