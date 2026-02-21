// src/app/services/timer.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, interval, Subscription } from 'rxjs';
import { map, takeWhile } from 'rxjs/operators';

export interface TimerState {
  isRunning: boolean;
  timeRemaining: number; // en secondes
  duration: number; // durée totale en secondes
  progress: number; // 0-100
}

@Injectable({
  providedIn: 'root'
})
export class TimerService {
  private timerSubject = new BehaviorSubject<TimerState>({
    isRunning: false,
    timeRemaining: 0,
    duration: 0,
    progress: 0
  });

  private subscription: Subscription | null = null;
  private currentDuration: number = 0;
  private hasPlayedSound: boolean = false; // Pour éviter de jouer le son plusieurs fois

  /**
   * Observable pour suivre l'état du timer
   */
  getTimerState(): Observable<TimerState> {
    return this.timerSubject.asObservable();
  }

  /**
   * Démarrer un timer avec une durée en secondes
   */
  startTimer(durationInSeconds: number): void {
    if (this.subscription) {
      this.stopTimer();
    }

    this.currentDuration = durationInSeconds;
    this.hasPlayedSound = false; // Réinitialiser le flag
    
    this.timerSubject.next({
      isRunning: true,
      timeRemaining: durationInSeconds,
      duration: durationInSeconds,
      progress: 0
    });

    let startTime = Date.now();
    const totalDuration = durationInSeconds * 1000; // en millisecondes

    this.subscription = interval(100) // Mise à jour toutes les 100ms pour fluidité
      .pipe(
        map(() => {
          const elapsed = Date.now() - startTime; // en millisecondes
          const remaining = Math.max(0, totalDuration - elapsed);
          const remainingSeconds = Math.ceil(remaining / 1000);
          const progress = Math.min(100, (elapsed / totalDuration) * 100);
          const isRunning = remaining > 0; // Utiliser remaining > 0 au lieu de remainingSeconds > 0
          
          return {
            isRunning: isRunning,
            timeRemaining: remainingSeconds,
            duration: durationInSeconds,
            progress: progress
          };
        }),
        takeWhile(state => state.isRunning || state.timeRemaining > 0, true) // Continuer tant que le timer est actif
      )
      .subscribe({
        next: (state) => {
          this.timerSubject.next(state);
          
          // Vibration et notification quand le timer se termine (une seule fois)
          if (!state.isRunning && !this.hasPlayedSound) {
            this.hasPlayedSound = true;
            this.onTimerComplete();
          }
        },
        complete: () => {
          // Émettre l'état final
          const finalState = {
            isRunning: false,
            timeRemaining: 0,
            duration: this.currentDuration,
            progress: 100
          };
          this.timerSubject.next(finalState);
          
          // S'assurer que le son est joué même si complete() est appelé avant
          if (!this.hasPlayedSound) {
            this.hasPlayedSound = true;
            this.onTimerComplete();
          }
        }
      });
  }

  /**
   * Arrêter le timer
   */
  stopTimer(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
    
    this.hasPlayedSound = false; // Réinitialiser le flag
    
    this.timerSubject.next({
      isRunning: false,
      timeRemaining: 0,
      duration: this.currentDuration,
      progress: 0
    });
  }

  /**
   * Réinitialiser le timer
   */
  resetTimer(): void {
    this.stopTimer();
    this.timerSubject.next({
      isRunning: false,
      timeRemaining: 0,
      duration: 0,
      progress: 0
    });
  }

  /**
   * Actions à effectuer quand le timer se termine
   */
  private onTimerComplete(): void {
    // Vibration si supportée
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
    
    // Jouer un son d'alarme
    this.playAlarmSound();
  }

  /**
   * Jouer un son d'alarme à la fin du timer
   */
  private playAlarmSound(): void {
    try {
      // Créer un contexte audio (avec gestion de l'état suspendu)
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      
      // Si le contexte est suspendu, le reprendre (nécessite une interaction utilisateur)
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      
      // Fonction pour jouer un bip
      const playBeep = (frequency: number, duration: number, delay: number = 0) => {
        setTimeout(() => {
          try {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';
            
            // Enveloppe du son (fade in/out pour éviter les clics)
            const now = audioContext.currentTime;
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
            gainNode.gain.linearRampToValueAtTime(0.3, now + duration - 0.01);
            gainNode.gain.linearRampToValueAtTime(0, now + duration);
            
            oscillator.start(now);
            oscillator.stop(now + duration);
          } catch (e) {
            console.warn('Erreur lors de la lecture du bip:', e);
          }
        }, delay);
      };
      
      // Jouer 3 bips espacés
      playBeep(800, 0.3, 0);    // Premier bip immédiat
      playBeep(800, 0.3, 400);  // Deuxième bip après 400ms
      playBeep(800, 0.3, 800);  // Troisième bip après 800ms
      
    } catch (error) {
      console.warn('Impossible de jouer le son d\'alarme avec Web Audio API:', error);
      // Fallback : essayer avec un Audio HTML5 simple
      this.playFallbackSound();
    }
  }

  /**
   * Son de fallback utilisant l'API Audio HTML5
   */
  private playFallbackSound(): void {
    try {
      // Créer un son simple avec un data URI
      // Générer un son de beep avec un oscillateur via un Blob
      const sampleRate = 44100;
      const duration = 0.3;
      const frequency = 800;
      const samples = sampleRate * duration;
      const buffer = new ArrayBuffer(44 + samples * 2);
      const view = new DataView(buffer);
      
      // En-tête WAV
      const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      };
      
      writeString(0, 'RIFF');
      view.setUint32(4, 36 + samples * 2, true);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      writeString(36, 'data');
      view.setUint32(40, samples * 2, true);
      
      // Générer l'onde sinusoïdale
      for (let i = 0; i < samples; i++) {
        const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate);
        view.setInt16(44 + i * 2, sample * 0x7FFF, true);
      }
      
      // Créer un blob et jouer le son 3 fois
      const blob = new Blob([buffer], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          const audio = new Audio(url);
          audio.volume = 0.5;
          audio.play().catch(() => {
            // Ignorer les erreurs de lecture
          });
        }, i * 400);
      }
      
      // Nettoyer l'URL après un délai
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) {
      console.warn('Impossible de jouer le son de fallback:', e);
    }
  }

  /**
   * Formater le temps restant en MM:SS
   */
  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}

