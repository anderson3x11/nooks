import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from './auth';

/** Le back-office n'est pas seulement caché : la route elle-même est fermée. */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  if (auth.isAdmin()) {
    return true;
  }

  return router.createUrlTree(auth.isSignedIn() ? ['/'] : ['/connexion']);
};

/** Réservé aux membres connectés, quel que soit leur rôle. */
export const memberGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  return auth.isSignedIn() ? true : router.createUrlTree(['/connexion']);
};
