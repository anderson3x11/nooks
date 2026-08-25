import { Routes } from '@angular/router';
import { adminGuard } from './core/admin.guard';
import { MapPage } from './features/map/map-page';

export const routes: Routes = [
  { path: '', component: MapPage, title: 'Nooks — la carte des lieux insolites' },
  {
    path: 'connexion',
    loadComponent: () => import('./features/auth/login').then((m) => m.Login),
    title: 'Se connecter — Nooks',
  },
  {
    path: 'inscription',
    loadComponent: () => import('./features/auth/register').then((m) => m.Register),
    title: 'Créer un compte — Nooks',
  },
  {
    path: 'moderation',
    loadComponent: () => import('./features/admin/moderation').then((m) => m.Moderation),
    canActivate: [adminGuard],
    title: 'Modération — Nooks',
  },
  { path: '**', redirectTo: '' },
];
