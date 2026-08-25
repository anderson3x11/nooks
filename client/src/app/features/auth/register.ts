import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../core/auth';
import { AuthShell } from './auth-shell';

@Component({
  selector: 'nooks-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AuthShell],
  template: `
    <nooks-auth-shell title="Créer un compte" subtitle="Deux champs, et vous pouvez enrichir la carte.">
      <form [formGroup]="form" (ngSubmit)="submit()">
        <label class="label-caps mb-1.5 block" for="register-name">Pseudo</label>
        <input id="register-name" class="field" formControlName="displayName" autocomplete="nickname" />

        <label class="label-caps mt-5 mb-1.5 block" for="register-email">Email</label>
        <input id="register-email" type="email" class="field" formControlName="email" autocomplete="email" />

        <label class="label-caps mt-5 mb-1.5 block" for="register-password">Mot de passe</label>
        <input
          id="register-password"
          type="password"
          class="field"
          formControlName="password"
          autocomplete="new-password"
        />
        <p class="mt-1 text-[12px] text-ink-500">8 caractères minimum, dont une majuscule et un chiffre.</p>

        @if (error()) {
          <p class="mt-3 text-[13px] text-negative">{{ error() }}</p>
        }

        <button type="submit" class="btn btn-primary mt-6 w-full" [disabled]="form.invalid || busy()">
          {{ busy() ? 'Création…' : 'Créer mon compte' }}
        </button>
      </form>

      <p class="mt-4 text-center text-[14px] text-ink-700">
        Déjà inscrit ?
        <a routerLink="/connexion" class="font-semibold text-ink-900 underline underline-offset-2">Se connecter</a>
      </p>
    </nooks-auth-shell>
  `,
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    displayName: ['', [Validators.required, Validators.maxLength(60)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  protected submit(): void {
    if (this.form.invalid) {
      return;
    }

    this.busy.set(true);
    this.error.set(null);

    const { email, password, displayName } = this.form.getRawValue();
    this.auth.register(email, password, displayName).subscribe({
      next: () => this.router.navigate(['/']),
      error: (response) => {
        this.busy.set(false);
        this.error.set(firstIdentityError(response) ?? "La création du compte a échoué.");
      },
    });
  }
}

/** Identity renvoie ses refus par code (mot de passe trop faible, email déjà pris…). */
function firstIdentityError(response: unknown): string | null {
  const errors = (response as { error?: { errors?: Record<string, string[]> } })?.error?.errors;
  return errors ? (Object.values(errors)[0]?.[0] ?? null) : null;
}
