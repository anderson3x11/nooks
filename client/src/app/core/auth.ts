import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AuthResponse, CurrentUser } from './models';

const STORAGE_KEY = 'nooks.session';

interface StoredSession {
  token: string;
  expiresAt: string;
  user: CurrentUser;
}

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly http = inject(HttpClient);
  private readonly session = signal<StoredSession | null>(restore());

  readonly user = computed(() => this.session()?.user ?? null);
  readonly isSignedIn = computed(() => this.session() !== null);
  readonly isAdmin = computed(() => this.session()?.user.roles.includes('Admin') ?? false);

  get token(): string | null {
    return this.session()?.token ?? null;
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/login', { email, password }).pipe(tap((r) => this.store(r)));
  }

  register(email: string, password: string, displayName: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>('/api/auth/register', { email, password, displayName })
      .pipe(tap((r) => this.store(r)));
  }

  changeEmail(email: string, currentPassword: string): Observable<AuthResponse> {
    return this.http
      .put<AuthResponse>('/api/auth/email', { email, currentPassword })
      .pipe(tap((r) => this.store(r)));
  }

  changePassword(currentPassword: string, newPassword: string): Observable<AuthResponse> {
    return this.http
      .put<AuthResponse>('/api/auth/password', { currentPassword, newPassword })
      .pipe(tap((r) => this.store(r)));
  }

  logout(): void {
    this.session.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  private store(response: AuthResponse): void {
    const session: StoredSession = {
      token: response.token,
      expiresAt: response.expiresAt,
      user: response.user,
    };
    this.session.set(session);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }
}

/** Une session périmée ou illisible est jetée plutôt que de faire échouer chaque appel. */
function restore(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const session = JSON.parse(raw) as StoredSession;
    if (!session.token || new Date(session.expiresAt) <= new Date()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return session;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}
