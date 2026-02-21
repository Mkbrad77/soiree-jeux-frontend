export interface Game {
  id?: number;
  name: string;
  description: string;
  order: number;
  completed: boolean;
  type: 'TOUS_ENSEMBLE' | 'REPRESENTANT' | 'DUO' | 'UN_VS_UN';
}
