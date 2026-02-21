import { Team } from './team';

export interface GameResult {
  id?: number;
  team: Team;
  position: number;
  pointsEarned: number;
  drankShot: boolean;
}
