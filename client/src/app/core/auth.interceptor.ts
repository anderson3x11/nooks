import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Auth } from './auth';

/**
 * Ajoute le jeton sur les appels à notre API, et déconnecte proprement si le
 * serveur le refuse : un jeton expiré ne doit pas laisser une interface
 * qui se croit encore connectée.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(Auth);
  const token = auth.token;

  const outgoing =
    token && request.url.startsWith('/api')
      ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : request;

  return next(outgoing).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && auth.isSignedIn()) {
        auth.logout();
      }
      return throwError(() => error);
    }),
  );
};
