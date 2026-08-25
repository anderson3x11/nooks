import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Auth } from '../core/auth';
import { Wordmark } from './wordmark';

/** Barre de navigation des pages hors carte : accueil, profil, administration. */
@Component({
  selector: 'nooks-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, Wordmark],
  template: `
    <header class="sticky top-0 z-50 border-b border-ink-200 bg-white/85 backdrop-blur-xl">
      <div class="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5">
        <a routerLink="/" aria-label="Accueil Nooks"><nooks-wordmark /></a>

        <nav class="hidden items-center gap-1 md:flex">
          <a
            routerLink="/carte"
            routerLinkActive="bg-ink-100 text-ink-950"
            class="rounded-full px-3.5 py-2 text-[14.5px] font-medium text-ink-700 transition-colors hover:text-ink-950"
          >
            La carte
          </a>
          @if (auth.isSignedIn()) {
            <a
              routerLink="/profil"
              routerLinkActive="bg-ink-100 text-ink-950"
              class="rounded-full px-3.5 py-2 text-[14.5px] font-medium text-ink-700 transition-colors hover:text-ink-950"
            >
              Mon profil
            </a>
          }
          @if (auth.isAdmin()) {
            <a
              routerLink="/admin"
              routerLinkActive="bg-ink-100 text-ink-950"
              class="rounded-full px-3.5 py-2 text-[14.5px] font-medium text-ink-700 transition-colors hover:text-ink-950"
            >
              Administration
            </a>
          }
        </nav>

        <div class="flex-1"></div>

        @if (auth.user(); as user) {
          <a routerLink="/profil" class="flex items-center gap-2.5">
            <span class="hidden text-[14.5px] font-medium sm:inline">{{ user.displayName }}</span>
            <span class="flex size-9 items-center justify-center overflow-hidden rounded-full bg-ink-950 text-[13px] font-bold text-white">
              {{ initial(user.displayName) }}
            </span>
          </a>
          <button type="button" class="btn btn-quiet hidden py-2 sm:inline-flex" (click)="auth.logout()">Quitter</button>
        } @else {
          <a routerLink="/connexion" class="text-[14.5px] font-medium text-ink-700 hover:text-ink-950">Connexion</a>
          <a routerLink="/inscription" class="btn btn-primary py-2">Créer un compte</a>
        }
      </div>
    </header>
  `,
})
export class SiteHeader {
  protected readonly auth = inject(Auth);
  protected readonly open = signal(false);

  protected initial(name: string): string {
    return name.trim().charAt(0).toUpperCase();
  }
}
