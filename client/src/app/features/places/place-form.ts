import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { startWith } from 'rxjs';
import { CATEGORIES } from '../../core/categories';
import { CreatePlaceInput, PlaceCategory } from '../../core/models';

/**
 * Proposition d'un lieu. La position ne se saisit pas au clavier : on la pose
 * sur la carte, c'est plus rapide et ça évite les coordonnées fantaisistes.
 */
@Component({
  selector: 'nooks-place-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <form
      class="plate grain animate-slide-in flex max-h-full w-96 flex-col overflow-hidden"
      [formGroup]="form"
      (ngSubmit)="save()"
    >
      <header class="flex items-baseline justify-between px-5 pt-4">
        <h2 class="text-[19px] text-ink-900">Proposer un lieu</h2>
        <button type="button" class="label-caps cursor-pointer text-ink-400 hover:text-ink-700" (click)="cancelled.emit()">
          Annuler
        </button>
      </header>

      <div class="rule mx-5 mt-3"></div>

      <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div
          class="mb-4 rounded-sm border border-dashed px-3 py-2.5 text-[12px] leading-snug transition-colors"
          [class]="
            position()
              ? 'border-moss-500/50 bg-moss-500/8 text-ink-700'
              : 'border-signal-500 bg-signal-500/10 text-ink-800'
          "
        >
          @if (position(); as point) {
            <span class="font-semibold">Position posée</span> · {{ point.latitude.toFixed(5) }},
            {{ point.longitude.toFixed(5) }}
            <span class="block text-ink-400">Cliquez ailleurs sur la carte pour la déplacer.</span>
          } @else {
            <span class="font-semibold">Cliquez sur la carte</span> pour poser le point du lieu.
          }
        </div>

        <label class="label-caps mb-1 block text-ink-400" for="place-name">Nom</label>
        <input id="place-name" class="field" formControlName="name" placeholder="Le jardin des poètes" />

        <label class="label-caps mt-4 mb-1 block text-ink-400" for="place-category">Catégorie</label>
        <select id="place-category" class="field" formControlName="category">
          @for (category of categories; track category.id) {
            <option [value]="category.id">{{ category.label }}</option>
          }
        </select>

        <label class="label-caps mt-4 mb-1 block text-ink-400" for="place-description">Description</label>
        <textarea
          id="place-description"
          rows="4"
          class="field resize-none"
          formControlName="description"
          placeholder="Ce qu'on y voit, comment y entrer, à quel moment y aller…"
        ></textarea>

        <div class="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label class="label-caps mb-1 block text-ink-400" for="place-city">Ville</label>
            <input id="place-city" class="field" formControlName="city" placeholder="Lyon" />
          </div>
          <div>
            <label class="label-caps mb-1 block text-ink-400" for="place-country">Pays</label>
            <input id="place-country" class="field" formControlName="country" />
          </div>
        </div>

        <label class="label-caps mt-4 mb-1 block text-ink-400" for="place-address">Adresse (facultatif)</label>
        <input id="place-address" class="field" formControlName="address" placeholder="12 rue des Capucins" />

        @if (error()) {
          <p class="mt-3 text-[13px] text-rust-500">{{ error() }}</p>
        }
      </div>

      <footer class="shrink-0 border-t border-paper-300 px-5 py-3">
        <button type="submit" class="btn btn-signal w-full" [disabled]="!canSubmit()">
          {{ busy() ? 'Publication…' : 'Publier le lieu' }}
        </button>
      </footer>
    </form>
  `,
})
export class PlaceForm {
  private readonly fb = inject(FormBuilder);

  readonly position = input<{ latitude: number; longitude: number } | null>(null);
  readonly busy = input(false);
  readonly error = input<string | null>(null);

  readonly submitted = output<CreatePlaceInput>();
  readonly cancelled = output<void>();

  protected readonly categories = CATEGORIES;

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    category: ['Curiosity' as PlaceCategory, Validators.required],
    description: ['', [Validators.required, Validators.maxLength(2000)]],
    city: ['', [Validators.required, Validators.maxLength(100)]],
    country: ['France', [Validators.required, Validators.maxLength(100)]],
    address: [''],
  });

  private readonly formStatus = toSignalStatus(this.form);

  protected readonly canSubmit = computed(
    () => this.position() !== null && this.formStatus() === 'VALID' && !this.busy(),
  );

  protected save(): void {
    const point = this.position();
    if (!point || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.submitted.emit({
      name: value.name.trim(),
      description: value.description.trim(),
      category: value.category,
      latitude: point.latitude,
      longitude: point.longitude,
      address: value.address.trim() || null,
      city: value.city.trim(),
      country: value.country.trim(),
    });
  }
}


/** L'état de validité d'un formulaire réactif, exposé en signal pour le template. */
function toSignalStatus(control: AbstractControl) {
  return toSignal(control.statusChanges.pipe(startWith(control.status)), { initialValue: control.status });
}
