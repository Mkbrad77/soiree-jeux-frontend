import { Player } from './player';

export interface Team {
  id?: number;
  name: string;
  color: string;
  totalPoints: number;
  shotsCount: number;
  players: Player[];
}
