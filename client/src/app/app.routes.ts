import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'login',
    loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./components/register/register.component').then(m => m.RegisterComponent),
  },
  {
    path: 'why',
    loadComponent: () => import('./components/why/why.component').then(m => m.WhyComponent),
  },
  {
    path: 'about',
    loadComponent: () => import('./components/about/about.component').then(m => m.AboutComponent),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  {
    path: 'personas',
    canActivate: [authGuard],
    loadComponent: () => import('./components/persona-list/persona-list.component').then(m => m.PersonaListComponent),
  },
  {
    path: 'personas/new',
    canActivate: [authGuard],
    loadComponent: () => import('./components/persona-form/persona-form.component').then(m => m.PersonaFormComponent),
  },
  {
    path: 'personas/:id/edit',
    canActivate: [authGuard],
    loadComponent: () => import('./components/persona-form/persona-form.component').then(m => m.PersonaFormComponent),
  },
  {
    path: 'matches',
    canActivate: [authGuard],
    loadComponent: () => import('./components/match-dashboard/match-dashboard.component').then(m => m.MatchDashboardComponent),
  },
  {
    path: 'connect',
    canActivate: [authGuard],
    loadComponent: () => import('./components/connect/connect.component').then(m => m.ConnectComponent),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./components/profile/profile.component').then(m => m.ProfileComponent),
  },
  {
    path: 'graph',
    canActivate: [authGuard],
    loadComponent: () => import('./components/graph/graph.component').then(m => m.GraphComponent),
  },
  {
    path: 'drift',
    canActivate: [authGuard],
    loadComponent: () => import('./components/drift-timeline/drift-timeline.component').then(m => m.DriftTimelineComponent),
  },
  {
    path: 'drift/:personaId',
    canActivate: [authGuard],
    loadComponent: () => import('./components/drift-timeline/drift-timeline.component').then(m => m.DriftTimelineComponent),
  },
  { path: '**', redirectTo: 'dashboard' },
];
