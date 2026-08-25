import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { categoryStyle } from '../../core/categories';
import { PlaceDetail, PlaceStatus, PlaceSummary } from '../../core/models';
import { PlacesApi } from '../../core/places-api';
import { CategorySymbol } from '../../shared/category-symbol';

/** File de modération : ce qui attend une décision, et l'historique des décisions prises. */
@Component({
  selector: 'nooks-moderation',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CategorySymbol, RouterLink],
  template: `
    <div class="min-h-dvh bg-ink-950 px-6 py-8">
      <div class="mx-auto max-w-3xl">
        <header class="mb-6 flex items-end justify-between">
          <div>
            <h1 class="text-[26px] text-paper-100">Modération</h1>
            <p class="mt-1 text-[13px] text-ink-400">
              Les lieux proposés par la communauté, en attente d'une décision.
            </p>
          </div>
          <a routerLink="/" class="btn btn-ghost border-ink-700 text-paper-300 hover:bg-ink-800">Retour à la carte</a>
        </header>

        <nav class="mb-4 flex gap-1">
          @for (tab of tabs; track tab.status) {
            <button
              type="button"
              class="cursor-pointer rounded-sm px-3 py-1.5 text-[12px] font-semibold transition-colors"
              [class]="status() === tab.status ? 'bg-signal-500 text-ink-950' : 'text-ink-400 hover:bg-ink-800'"
              (click)="switchTo(tab.status)"
            >
              {{ tab.label }}
            </button>
          }
        </nav>

        @if (loading()) {
          <p class="text-[13px] text-ink-400">Chargement…</p>
        } @else if (places().length === 0) {
          <div class="plate grain px-5 py-8 text-center">
            <p class="text-[14px] text-ink-600">
              {{
                status() === 'Pending'
                  ? 'Rien à valider pour le moment.'
                  : 'Aucun lieu dans cette catégorie.'
              }}
            </p>
            @if (status() === 'Pending') {
              <p class="mt-1 text-[12px] text-ink-400">
                En mode POC, les lieux sont publiés directement. Passez
                <code class="text-signal-700">Moderation:AutoApprove</code> à <code>false</code> pour les faire
                passer par ici.
              </p>
            }
          </div>
        } @else {
          <ul class="flex flex-col gap-2">
            @for (place of places(); track place.id) {
              <li class="plate grain flex items-center gap-4 px-4 py-3">
                <nooks-symbol [category]="place.category" [size]="18" />

                <div class="min-w-0 flex-1">
                  <p class="truncate text-[15px] font-semibold text-ink-900">{{ place.name }}</p>
                  <p class="text-[12px] text-ink-400">
                    {{ place.city }} · {{ label(place.category) }} · proposé le {{ formatDate(place.createdAt) }}
                  </p>
                </div>

                @if (place.status === 'Pending') {
                  <div class="flex shrink-0 gap-2">
                    <button type="button" class="btn btn-ghost" [disabled]="busyId() === place.id" (click)="reject(place)">
                      Rejeter
                    </button>
                    <button type="button" class="btn btn-signal" [disabled]="busyId() === place.id" (click)="approve(place)">
                      Approuver
                    </button>
                  </div>
                } @else {
                  <span
                    class="label-caps shrink-0"
                    [class]="place.status === 'Approved' ? 'text-moss-500' : 'text-rust-500'"
                  >
                    {{ place.status === 'Approved' ? 'Approuvé' : 'Rejeté' }}
                  </span>
                }
              </li>
            }
          </ul>
        }
      </div>
    </div>
  `,
})
export class Moderation {
  private readonly api = inject(PlacesApi);

  protected readonly tabs: { status: PlaceStatus; label: string }[] = [
    { status: 'Pending', label: 'En attente' },
    { status: 'Approved', label: 'Approuvés' },
    { status: 'Rejected', label: 'Rejetés' },
  ];

  protected readonly status = signal<PlaceStatus>('Pending');
  protected readonly places = signal<PlaceSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly busyId = signal<string | null>(null);

  constructor() {
    this.load();
  }

  protected switchTo(status: PlaceStatus): void {
    this.status.set(status);
    this.load();
  }

  protected approve(place: PlaceSummary): void {
    this.decide(place, this.api.approve(place.id));
  }

  protected reject(place: PlaceSummary): void {
    this.decide(place, this.api.reject(place.id));
  }

  protected label(category: PlaceSummary['category']): string {
    return categoryStyle(category).label;
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(
      new Date(value),
    );
  }

  private decide(place: PlaceSummary, request: Observable<PlaceDetail>): void {
    this.busyId.set(place.id);
    request.subscribe({
      next: () => {
        this.busyId.set(null);
        this.load();
      },
      error: () => this.busyId.set(null),
    });
  }

  private load(): void {
    this.loading.set(true);
    this.api.moderationQueue(this.status()).subscribe({
      next: (places) => {
        this.places.set(places);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
