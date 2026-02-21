import { Routes } from '@angular/router';
import { Setup } from './components/setup/setup';
import { Dashboard } from './components/dashboard/dashboard';
import { GameIntro } from './components/game-intro/game-intro';
import { PodiumComponent } from './components/podium/podium';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/setup',
    pathMatch: 'full'
  },
  {
    path: 'setup',
    component: Setup
  },
  {
    path: 'dashboard',
    component: Dashboard
  },
  {
    path: 'games/:id/intro',
    component: GameIntro
  },
  {
    path: 'podium',
    component: PodiumComponent
  },
  {
    path: '**',
    redirectTo: '/setup'
  }
];
