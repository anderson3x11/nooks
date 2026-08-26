import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Auth } from '../core/auth';
import { Wordmark } from './wordmark';

/** Ancres des sections de la page d'accueil. */
const SECTIONS = [
  { fragment: 'concept', label: 'Le concept' },
  { fragment: 'categories', label: 'Catégories' },
  { fragment: 'fonctionnement', label: 'Comment ça marche' },
  { fragment: 'derniers', label: 'Derniers lieux' },
];

const LINK = 'rounded-full px-4 py-2.5 text-[14.5px] font-medium whitespace-nowrap text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-950';

/**
 * Barre de navigation flottante, à la largeur de la boîte de contenu des pages.
 * En dessous de 1024 px, tout passe derrière un menu déroulant : la pilule ne
 * peut pas contenir huit liens sur un téléphone.
 */
@Component({
  selector: 'nooks-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, Wordmark],
  template: `
    <div class="pointer-events-none fixed inset-x-0 top-4 z-50 mx-auto max-w-6xl px-5">
      <nav class="card card-float pointer-events-auto flex h-16 w-full items-center gap-1.5 rounded-full py-2 pr-3 pl-4 md:pl-5">
        <a routerLink="/" aria-label="Accueil Nooks" class="shrink-0 pr-2"><nooks-wordmark [size]="34" /></a>

        <span class="mx-2 hidden h-7 w-px shrink-0 bg-ink-200 lg:block"></span>

        <div class="hidden flex-1 items-center justify-center lg:flex">
          @for (section of sections; track section.fragment) {
            <a routerLink="/" [fragment]="section.fragment" [class]="link">{{ section.label }}</a>
          }
        </div>

        <span class="mx-2 hidden h-7 w-px shrink-0 bg-ink-200 lg:block"></span>

        <a routerLink="/carte" routerLinkActive="bg-ink-100 text-ink-950" [class]="link" class="hidden lg:block">
          La carte
        </a>

        @if (auth.isAdmin()) {
          <a routerLink="/admin" routerLinkActive="bg-ink-100 text-ink-950" [class]="link" class="hidden lg:block">
            Admin
          </a>
        }

        <span class="mx-2 hidden h-7 w-px shrink-0 bg-ink-200 lg:block"></span>

        <div class="hidden items-center gap-1.5 lg:flex">
          @if (auth.user(); as user) {
            <a routerLink="/profil" class="flex shrink-0 items-center gap-2.5 rounded-full px-2.5 py-1.5 transition-colors hover:bg-ink-100">
              <span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink-950 text-[13px] font-bold text-white">
                {{ initial(user.displayName) }}
              </span>
              <span class="text-[14.5px] font-medium whitespace-nowrap">{{ user.displayName }}</span>
            </a>
            <button type="button" [class]="link" (click)="auth.logout()">Quitter</button>
          } @else {
            <a routerLink="/connexion" [class]="link">Connexion</a>
            <a routerLink="/inscription" class="btn btn-primary shrink-0 px-5 py-2.5 whitespace-nowrap">Créer un compte</a>
          }
        </div>

        <!-- Menu déroulant en dessous de 1024 px. -->
        <div class="flex-1 lg:hidden"></div>

        @if (auth.user(); as user) {
          <a routerLink="/profil" class="shrink-0 lg:hidden" [attr.aria-label]="'Profil de ' + user.displayName">
            <span class="flex size-9 items-center justify-center rounded-full bg-ink-950 text-[13px] font-bold text-white">
              {{ initial(user.displayName) }}
            </span>
          </a>
        }

        <button
          type="button"
          class="btn-round shrink-0 lg:hidden"
          [attr.aria-label]="open() ? 'Fermer le menu' : 'Ouvrir le menu'"
          [attr.aria-expanded]="open()"
          (click)="open.set(!open())"
        >
          @if (open()) {
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M1.5 1.5 12.5 12.5M12.5 1.5 1.5 12.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            </svg>
          } @else {
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M2 4.5h12M2 8h12M2 11.5h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            </svg>
          }
        </button>
      </nav>

      @if (open()) {
        <div class="card card-float animate-rise pointer-events-auto mt-2 p-2 lg:hidden">
          @for (section of sections; track section.fragment) {
            <a
              routerLink="/"
              [fragment]="section.fragment"
              class="block rounded-xl px-4 py-3 text-[15px] font-medium text-ink-700 transition-colors hover:bg-ink-100"
              (click)="open.set(false)"
            >
              {{ section.label }}
            </a>
          }

          <div class="divider my-2"></div>

          <a
            routerLink="/carte"
            class="block rounded-xl px-4 py-3 text-[15px] font-medium text-ink-700 transition-colors hover:bg-ink-100"
            (click)="open.set(false)"
          >
            La carte
          </a>

          @if (auth.isAdmin()) {
            <a
              routerLink="/admin"
              class="block rounded-xl px-4 py-3 text-[15px] font-medium text-ink-700 transition-colors hover:bg-ink-100"
              (click)="open.set(false)"
            >
              Administration
            </a>
          }

          <div class="divider my-2"></div>

          @if (auth.isSignedIn()) {
            <a
              routerLink="/profil"
              class="block rounded-xl px-4 py-3 text-[15px] font-medium text-ink-700 transition-colors hover:bg-ink-100"
              (click)="open.set(false)"
            >
              Mon profil
            </a>
            <button
              type="button"
              class="block w-full rounded-xl px-4 py-3 text-left text-[15px] font-medium text-ink-500 transition-colors hover:bg-ink-100"
              (click)="signOut()"
            >
              Quitter
            </button>
          } @else {
            <a
              routerLink="/connexion"
              class="block rounded-xl px-4 py-3 text-[15px] font-medium text-ink-700 transition-colors hover:bg-ink-100"
              (click)="open.set(false)"
            >
              Connexion
            </a>
            <a routerLink="/inscription" class="btn btn-primary mt-1 w-full py-3" (click)="open.set(false)">
              Créer un compte
            </a>
          }
        </div>
      }
    </div>
  `,
})
export class SiteHeader {
  protected readonly auth = inject(Auth);
  protected readonly sections = SECTIONS;
  protected readonly link = LINK;
  protected readonly open = signal(false);

  constructor() {
    // Changer de page referme le menu, sinon il resterait ouvert par-dessus la suivante.
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.open.set(false));
  }

  protected signOut(): void {
    this.open.set(false);
    this.auth.logout();
  }

  protected initial(name: string): string {
    return name.trim().charAt(0).toUpperCase();
  }
}

