import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, startWith, switchMap } from 'rxjs';
import { CATEGORIES } from '../../core/categories';
import { CreatePlaceInput, PlaceCategory, PlaceSummary } from '../../core/models';
import { PlacesApi } from '../../core/places-api';
import { CategorySymbol } from '../../shared/category-symbol';

/** Une photo choisie, avec son aperçu local pour l'afficher avant l'envoi. */
interface PickedPhoto {
  file: File;
  preview: string;
}

const MAX_PHOTOS = 6;

/**
 * Proposition d'un lieu. La position ne se saisit pas au clavier : on la pose
 * sur la carte. Une photo au moins est exigée, puisque c'est elle qui devient
 * le marqueur du lieu.
 */
@Component({
  selector: 'nooks-place-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, CategorySymbol],
  template: `
    <form class="card card-float animate-panel flex max-h-[82dvh] w-full flex-col overflow-hidden rounded-b-none md:max-h-full md:w-[26rem] md:rounded-[20px]" [formGroup]="form" (ngSubmit)="save()">
      <header class="flex items-center justify-between px-5 pt-4 pb-3">
        <h2 class="text-[18px]">Proposer un lieu</h2>
        <button type="button" class="btn-round size-8" aria-label="Annuler" (click)="cancelled.emit()">
          <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
            <path d="M1 1 11 11M11 1 1 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </button>
      </header>

      <div class="divider"></div>

      <div class="scroll-quiet min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div
          class="mb-5 flex items-start gap-2.5 rounded-2xl px-3.5 py-3 text-[13px] leading-snug"
          [class]="position() ? 'bg-ink-100 text-ink-700' : 'bg-ink-950 text-white'"
        >
          <svg width="15" height="15" viewBox="0 0 12 12" class="mt-0.5 shrink-0" aria-hidden="true">
            <path
              d="M6 1a3.6 3.6 0 0 0-3.6 3.6C2.4 7.2 6 11 6 11s3.6-3.8 3.6-6.4A3.6 3.6 0 0 0 6 1Z"
              fill="none"
              stroke="currentColor"
              stroke-width="1.2"
            />
            <circle cx="6" cy="4.6" r="1.2" fill="currentColor" />
          </svg>
          @if (position(); as point) {
            <span>
              <span class="font-semibold">Position posée</span>
              · {{ point.latitude.toFixed(5) }}, {{ point.longitude.toFixed(5) }}
              <span class="block text-ink-500">Cliquez ailleurs sur la carte pour la déplacer.</span>
            </span>
          } @else {
            <span class="font-semibold">Cliquez sur la carte pour poser le point du lieu.</span>
          }
        </div>

        <!-- Anti-doublon : on prévient et on propose d'aller enrichir l'existant. -->
        @if (duplicates().length > 0) {
          <div class="mb-5 rounded-2xl border border-ink-200 bg-ink-50 p-3.5">
            <p class="text-[13.5px] leading-snug font-semibold">Ce lieu existe peut-être déjà</p>
            <p class="mt-1 text-[13px] leading-snug text-ink-500">
              Plutôt que d'en créer un second, vous pouvez le noter, y laisser un avis ou y ajouter vos photos.
            </p>

            <ul class="mt-3 flex flex-col gap-1.5">
              @for (candidate of duplicates(); track candidate.id) {
                <li>
                  <button
                    type="button"
                    class="flex w-full cursor-pointer items-center gap-2.5 rounded-xl bg-white p-1.5 text-left transition-colors hover:bg-ink-100"
                    (click)="openExisting.emit(candidate.id)"
                  >
                    @if (candidate.coverThumbnailUrl) {
                      <img [src]="candidate.coverThumbnailUrl" alt="" class="size-9 shrink-0 rounded-lg object-cover" />
                    } @else {
                      <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-ink-100">
                        <nooks-symbol [category]="candidate.category" [size]="14" />
                      </span>
                    }
                    <span class="min-w-0 flex-1">
                      <span class="block truncate text-[13.5px] font-semibold">{{ candidate.name }}</span>
                      <span class="block text-[12px] text-ink-500">{{ candidate.city }}</span>
                    </span>
                    <svg width="12" height="12" viewBox="0 0 12 12" class="shrink-0 text-ink-400" aria-hidden="true">
                      <path d="M4.5 1.5 9 6l-4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  </button>
                </li>
              }
            </ul>

            <p class="mt-3 text-[12px] leading-snug text-ink-500">
              Si votre lieu est bien différent, publiez-le : un modérateur vérifiera avant sa mise en ligne.
            </p>
          </div>
        }

        <label class="label-caps mb-1.5 block" for="place-name">Nom</label>
        <input id="place-name" class="field" formControlName="name" placeholder="Le jardin des poètes" />

        <div class="label-caps mt-5 mb-2">Catégorie</div>
        <div class="flex flex-wrap gap-1.5">
          @for (category of categories; track category.id) {
            <button
              type="button"
              class="chip"
              [attr.aria-pressed]="form.controls.category.value === category.id"
              (click)="form.controls.category.setValue(category.id)"
            >
              <nooks-symbol
                [category]="category.id"
                [size]="11"
                [color]="form.controls.category.value === category.id ? '#ffffff' : null"
              />
              {{ category.label }}
            </button>
          }
        </div>

        <label class="label-caps mt-5 mb-1.5 block" for="place-description">Description</label>
        <textarea
          id="place-description"
          rows="4"
          class="field resize-none"
          formControlName="description"
          placeholder="Ce qu'on y voit, comment y entrer, à quel moment y aller…"
        ></textarea>

        <div class="mt-5 grid grid-cols-2 gap-3">
          <div>
            <label class="label-caps mb-1.5 block" for="place-city">Ville</label>
            <input id="place-city" class="field" formControlName="city" placeholder="Lyon" />
          </div>
          <div>
            <label class="label-caps mb-1.5 block" for="place-country">Pays</label>
            <input id="place-country" class="field" formControlName="country" />
          </div>
        </div>

        <label class="label-caps mt-5 mb-1.5 block" for="place-address">Adresse (facultatif)</label>
        <input id="place-address" class="field" formControlName="address" placeholder="12 rue des Capucins" />

        <div class="label-caps mt-5 mb-2">Photos · au moins une</div>
        <div class="flex flex-wrap gap-2">
          @for (photo of photos(); track photo.preview; let i = $index) {
            <div class="relative size-20 overflow-hidden rounded-2xl">
              <img [src]="photo.preview" alt="" class="size-full object-cover" />
              @if (i === 0) {
                <span class="absolute inset-x-0 bottom-0 bg-ink-950/75 py-0.5 text-center text-[10px] font-semibold text-white">
                  Marqueur
                </span>
              }
              <button
                type="button"
                class="absolute top-1 right-1 flex size-5 cursor-pointer items-center justify-center rounded-full bg-ink-950/70 text-white"
                aria-label="Retirer la photo"
                (click)="removePhoto(i)"
              >
                <svg width="8" height="8" viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M1 1 11 11M11 1 1 11" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                </svg>
              </button>
            </div>
          }

          <label
            class="flex size-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-ink-300 text-ink-500 transition-colors hover:border-ink-900 hover:text-ink-900"
          >
            <svg width="16" height="16" viewBox="0 0 12 12" aria-hidden="true">
              <path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            </svg>
            <span class="text-[11px] font-semibold">Ajouter</span>
            <input type="file" accept="image/*" multiple class="hidden" (change)="addPhotos($event)" />
          </label>
        </div>
        <p class="mt-2 text-[12px] text-ink-500">La première photo devient le marqueur du lieu sur la carte.</p>

        @if (error()) {
          <p class="mt-4 text-[13.5px] font-medium text-negative">{{ error() }}</p>
        }
      </div>

      <div class="divider"></div>

      <footer class="shrink-0 px-5 py-4">
        <button type="submit" class="btn btn-primary w-full" [disabled]="!canSubmit()">
          @if (busy()) {
            Publication…
          } @else if (duplicates().length > 0) {
            Publier quand même
          } @else {
            Publier le lieu
          }
        </button>
        @if (!position() || photos().length === 0) {
          <p class="mt-2 text-center text-[12px] text-ink-500">
            {{ !position() ? 'Posez le point sur la carte' : 'Ajoutez au moins une photo' }} pour publier.
          </p>
        }
      </footer>
    </form>
  `,
})
export class PlaceForm {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(PlacesApi);

  readonly position = input<{ latitude: number; longitude: number } | null>(null);
  readonly busy = input(false);
  readonly error = input<string | null>(null);
  /** Doublons renvoyés par le serveur au moment de la publication. */
  readonly rejectedAs = input<PlaceSummary[]>([]);

  readonly submitted = output<{ input: CreatePlaceInput; photos: File[]; force: boolean }>();
  readonly cancelled = output<void>();
  readonly openExisting = output<string>();

  protected readonly categories = CATEGORIES;
  protected readonly photos = signal<PickedPhoto[]>([]);
  private readonly found = signal<PlaceSummary[]>([]);

  /** Ce que le serveur a refusé prime sur ce que la recherche anticipée a trouvé. */
  protected readonly duplicates = computed(() => (this.rejectedAs().length > 0 ? this.rejectedAs() : this.found()));

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    category: ['Curiosity' as PlaceCategory, Validators.required],
    description: ['', [Validators.required, Validators.maxLength(2000)]],
    city: ['', [Validators.required, Validators.maxLength(100)]],
    country: ['France', [Validators.required, Validators.maxLength(100)]],
    address: [''],
  });

  private readonly formStatus = toSignalStatus(this.form);
  private readonly lookup = new Subject<CreatePlaceInput>();

  protected readonly canSubmit = computed(
    () => this.position() !== null && this.photos().length > 0 && this.formStatus() === 'VALID' && !this.busy(),
  );

  private readonly nameValue = toSignal(
    this.form.controls.name.valueChanges.pipe(startWith(this.form.controls.name.value)),
    { initialValue: '' },
  );

  private readonly categoryValue = toSignal(
    this.form.controls.category.valueChanges.pipe(startWith(this.form.controls.category.value)),
    { initialValue: 'Curiosity' as PlaceCategory },
  );

  constructor() {
    this.lookup
      .pipe(
        debounceTime(500),
        distinctUntilChanged((a, b) => a.name === b.name && a.category === b.category && a.latitude === b.latitude && a.longitude === b.longitude),
        switchMap((input) => this.api.findSimilar(input).pipe(catchError(() => of([] as PlaceSummary[])))),
        takeUntilDestroyed(),
      )
      .subscribe((found) => this.found.set(found));

    // Dès qu'un nom et un point sont posés, on va voir si le lieu existe déjà.
    effect(() => {
      const point = this.position();
      const name = this.nameValue();
      const category = this.categoryValue();

      if (!point || name.trim().length < 3) {
        this.found.set([]);
        return;
      }

      this.lookup.next({ ...this.draft(), name, category, latitude: point.latitude, longitude: point.longitude });
    });
  }

  protected addPhotos(event: Event): void {
    const input = event.target as HTMLInputElement;
    const picked = Array.from(input.files ?? []).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    this.photos.update((current) => [...current, ...picked].slice(0, MAX_PHOTOS));
    input.value = '';
  }

  protected removePhoto(index: number): void {
    this.photos.update((current) => {
      URL.revokeObjectURL(current[index].preview);
      return current.filter((_, i) => i !== index);
    });
  }

  protected save(): void {
    const point = this.position();
    if (!point || this.form.invalid || this.photos().length === 0) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitted.emit({
      input: { ...this.draft(), latitude: point.latitude, longitude: point.longitude },
      photos: this.photos().map((photo) => photo.file),
      force: this.duplicates().length > 0,
    });
  }

  private draft(): CreatePlaceInput {
    const value = this.form.getRawValue();
    return {
      name: value.name.trim(),
      description: value.description.trim(),
      category: value.category,
      latitude: 0,
      longitude: 0,
      address: value.address.trim() || null,
      city: value.city.trim(),
      country: value.country.trim(),
    };
  }
}

/** L'état de validité d'un formulaire réactif, exposé en signal pour le template. */
function toSignalStatus(control: AbstractControl) {
  return toSignal(control.statusChanges.pipe(startWith(control.status)), { initialValue: control.status });
}
