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
    <div class="min-h-dvh bg-ink-50 px-6 py-10">
      <div class="mx-auto max-w-3xl">
        <header class="mb-7 flex items-end justify-between gap-4">
          <div>
            <h1 class="text-[30px]">Modération</h1>
            <p class="mt-1.5 text-[14.5px] text-ink-500">
              Les lieux proposés par la communauté, en attente d'une décision.
            </p>
          </div>
          <a routerLink="/" class="btn btn-secondary shrink-0">Retour à la carte</a>
        </header>

        <nav class="segment mb-5">
          @for (tab of tabs; track tab.status) {
            <button type="button" [attr.aria-pressed]="status() === tab.status" (click)="switchTo(tab.status)">
              {{ tab.label }}
            </button>
          }
        </nav>

        @if (loading()) {
          <p class="text-[14px] text-ink-500">Chargement…</p>
        } @else if (places().length === 0) {
          <div class="card px-6 py-10 text-center">
            <p class="text-[15px] font-medium">
              {{ status() === 'Pending' ? 'Rien à valider pour le moment.' : 'Aucun lieu dans cette catégorie.' }}
            </p>
            @if (status() === 'Pending') {
              <p class="mt-2 text-[13.5px] text-ink-500">
                En mode POC, les lieux sont publiés directement. Passez
                <code class="rounded-md bg-ink-100 px-1.5 py-0.5 text-[12.5px]">Moderation:AutoApprove</code>
                à <code class="rounded-md bg-ink-100 px-1.5 py-0.5 text-[12.5px]">false</code> pour les faire passer
                par ici.
              </p>
            }
          </div>
        } @else {
          <ul class="flex flex-col gap-2.5">
            @for (place of places(); track place.id) {
              <li class="card flex items-center gap-4 px-4 py-3.5">
                @if (place.coverThumbnailUrl) {
                  <img [src]="place.coverThumbnailUrl" alt="" class="size-12 shrink-0 rounded-xl object-cover" />
                } @else {
                  <span class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-ink-100">
                    <nooks-symbol [category]="place.category" [size]="18" />
                  </span>
                }

                <div class="min-w-0 flex-1">
                  <p class="flex items-center gap-2 truncate text-[15.5px] font-semibold">
                    {{ place.name }}
                    @if (place.suspectedDuplicate) {
                      <span class="shrink-0 rounded-full bg-ink-950 px-2 py-0.5 text-[11px] font-semibold text-white">
                        Doublon possible
                      </span>
                    }
                  </p>
                  <p class="text-[13px] text-ink-500">
                    {{ place.city }} · {{ label(place.category) }} · proposé le {{ formatDate(place.createdAt) }}
                  </p>
                </div>

                @if (place.status === 'Pending') {
                  <div class="flex shrink-0 gap-2">
                    <button type="button" class="btn btn-secondary" [disabled]="busyId() === place.id" (click)="reject(place)">
                      Rejeter
                    </button>
                    <button type="button" class="btn btn-primary" [disabled]="busyId() === place.id" (click)="approve(place)">
                      Approuver
                    </button>
                  </div>
                } @else {
                  <span
                    class="shrink-0 rounded-full px-3 py-1 text-[12.5px] font-semibold"
                    [class]="place.status === 'Approved' ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'"
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
