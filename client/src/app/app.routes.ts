import { Routes } from '@angular/router';
import { adminGuard, memberGuard } from './core/admin.guard';
import { MapPage } from './features/map/map-page';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home-page').then((m) => m.HomePage),
    title: "Nooks - les lieux qu'on ne trouve dans aucun guide",
  },
  { path: 'carte', component: MapPage, title: 'La carte - Nooks' },
  {
    path: 'profil',
    loadComponent: () => import('./features/profile/profile-page').then((m) => m.ProfilePage),
    canActivate: [memberGuard],
    title: 'Mon profil - Nooks',
  },
  {
    path: 'membres/:id',
    loadComponent: () => import('./features/profile/profile-page').then((m) => m.ProfilePage),
    title: 'Profil - Nooks',
  },
  {
    path: 'admin',
    loadComponent: () => import('./features/admin/admin-page').then((m) => m.AdminPage),
    canActivate: [adminGuard],
    title: 'Administration - Nooks',
  },
  {
    path: 'connexion',
    loadComponent: () => import('./features/auth/login').then((m) => m.Login),
    title: 'Se connecter - Nooks',
  },
  {
    path: 'inscription',
    loadComponent: () => import('./features/auth/register').then((m) => m.Register),
    title: 'Créer un compte - Nooks',
  },
  { path: '**', redirectTo: '' },
];
