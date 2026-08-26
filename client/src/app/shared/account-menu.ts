import { ChangeDetectionStrategy, Component, ElementRef, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Auth } from '../core/auth';

const ITEM =
  'block w-full rounded-xl px-4 py-2.5 text-left text-[14.5px] font-medium text-ink-700 transition-colors hover:bg-ink-100 hover:text-ink-950';

/**
 * Le nom du membre dans la barre, qui ouvre son menu au survol. Le clic marche aussi,
 * sans quoi le menu serait hors de portée au doigt et au clavier.
 */
@Component({
  selector: 'nooks-account-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  host: {
    class: 'relative',
    '(mouseenter)': 'open.set(true)',
    '(mouseleave)': 'open.set(false)',
    '(document:click)': 'onDocumentClick($event)',
  },
  template: `
    @if (auth.user(); as user) {
      <button
        type="button"
        class="flex shrink-0 items-center gap-2.5 rounded-full px-2.5 py-1.5 transition-colors hover:bg-ink-100"
        aria-haspopup="menu"
        [attr.aria-expanded]="open()"
        (click)="open.set(!open())"
      >
        <span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink-950 text-[13px] font-bold text-white">
          {{ initial(user.displayName) }}
        </span>
        <span class="hidden text-[14.5px] font-medium whitespace-nowrap md:inline">{{ user.displayName }}</span>
      </button>

      @if (open()) {
        <!-- Le padding haut fait le pont avec le bouton : sans lui, traverser l'espace
             vide refermerait le menu en plein mouvement de souris. -->
        <div class="absolute top-full right-0 z-50 w-52 pt-2">
          <div class="card card-float animate-rise p-2" role="menu">
            <a routerLink="/profil" [class]="item" role="menuitem" (click)="open.set(false)">Mon profil</a>
            <a routerLink="/parametres" [class]="item" role="menuitem" (click)="open.set(false)">Paramètres</a>
            <div class="divider my-1"></div>
            <button type="button" [class]="item" role="menuitem" (click)="signOut()">Se déconnecter</button>
          </div>
        </div>
      }
    }
  `,
})
export class AccountMenu {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly auth = inject(Auth);
  protected readonly item = ITEM;
  protected readonly open = signal(false);

  constructor() {
    // Changer de page referme le menu, sinon il flotterait par-dessus la suivante.
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.open.set(false));
  }

  /** Au doigt, il n'y a pas de survol à quitter : un appui à côté referme. */
  protected onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  protected signOut(): void {
    this.open.set(false);
    this.auth.logout();
  }

  protected initial(name: string): string {
    return name.trim().charAt(0).toUpperCase();
  }
}
