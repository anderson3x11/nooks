import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Auth } from '../core/auth';
import { Wordmark } from './wordmark';

/** Ancres des sections de la page d'accueil. */
const SECTIONS = [
  { fragment: 'concept', label: 'Le concept' },
  { fragment: 'categories', label: 'Catégories' },
  { fragment: 'fonctionnement', label: 'Comment ça marche' },
  { fragment: 'derniers', label: 'Derniers lieux' },
];

/**
 * Barre de navigation flottante, en pilule. Elle survole la page plutôt que de
 * s'y coller : la page défile dessous, la navigation reste toujours atteignable.
 */
@Component({
  selector: 'nooks-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, Wordmark],
  template: `
    <div class="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <nav class="card card-float pointer-events-auto flex h-14 max-w-full items-center gap-1 rounded-full py-2 pr-2 pl-3">
        <a routerLink="/" aria-label="Accueil Nooks" class="shrink-0 pr-1"><nooks-wordmark [size]="32" /></a>

        <span class="mx-1 hidden h-6 w-px shrink-0 bg-ink-200 lg:block"></span>

        <div class="hidden items-center lg:flex">
          @for (section of sections; track section.fragment) {
            <a
              routerLink="/"
              [fragment]="section.fragment"
              class="rounded-full px-3 py-2 text-[14px] font-medium whitespace-nowrap text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-950"
            >
              {{ section.label }}
            </a>
          }
        </div>

        <span class="mx-1 hidden h-6 w-px shrink-0 bg-ink-200 lg:block"></span>

        <a
          routerLink="/carte"
          routerLinkActive="bg-ink-100 text-ink-950"
          class="rounded-full px-3 py-2 text-[14px] font-medium whitespace-nowrap text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-950"
        >
          La carte
        </a>

        @if (auth.isAdmin()) {
          <a
            routerLink="/admin"
            routerLinkActive="bg-ink-100 text-ink-950"
            class="hidden rounded-full px-3 py-2 text-[14px] font-medium whitespace-nowrap text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-950 sm:block"
          >
            Admin
          </a>
        }

        <span class="mx-1 h-6 w-px shrink-0 bg-ink-200"></span>

        @if (auth.user(); as user) {
          <a routerLink="/profil" class="flex shrink-0 items-center gap-2 rounded-full py-1 pr-2 pl-2 transition-colors hover:bg-ink-100">
            <span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink-950 text-[13px] font-bold text-white">
              {{ initial(user.displayName) }}
            </span>
            <span class="hidden text-[14px] font-medium whitespace-nowrap sm:inline">{{ user.displayName }}</span>
          </a>
          <button
            type="button"
            class="shrink-0 rounded-full px-3 py-2 text-[14px] font-medium text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-950"
            (click)="auth.logout()"
          >
            Quitter
          </button>
        } @else {
          <a
            routerLink="/connexion"
            class="rounded-full px-3 py-2 text-[14px] font-medium whitespace-nowrap text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-950"
          >
            Connexion
          </a>
          <a routerLink="/inscription" class="btn btn-primary shrink-0 py-2 whitespace-nowrap">Créer un compte</a>
        }
      </nav>
    </div>
  `,
})
export class SiteHeader {
  protected readonly auth = inject(Auth);
  protected readonly sections = SECTIONS;
  protected readonly open = signal(false);

  protected initial(name: string): string {
    return name.trim().charAt(0).toUpperCase();
  }
}
