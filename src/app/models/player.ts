// src/app/models/player.ts
export interface Player {
  id?: number;
  name: string;
  gender: 'HOMME' | 'FEMME';
  shotsCount?: number; // Nombre de shots bus par ce joueur
}