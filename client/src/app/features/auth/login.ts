import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../core/auth';
import { AuthShell } from './auth-shell';

@Component({
  selector: 'nooks-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AuthShell],
  template: `
    <nooks-auth-shell title="Se connecter" subtitle="Pour proposer un lieu et noter ceux des autres.">
      <form [formGroup]="form" (ngSubmit)="submit()">
        <label class="label-caps mb-1.5 block" for="login-email">Email</label>
        <input id="login-email" type="email" class="field" formControlName="email" autocomplete="email" />

        <label class="label-caps mt-5 mb-1.5 block" for="login-password">Mot de passe</label>
        <input
          id="login-password"
          type="password"
          class="field"
          formControlName="password"
          autocomplete="current-password"
        />

        @if (error()) {
          <p class="mt-3 text-[13px] text-negative">{{ error() }}</p>
        }

        <button type="submit" class="btn btn-primary mt-6 w-full" [disabled]="form.invalid || busy()">
          {{ busy() ? 'Connexion…' : 'Se connecter' }}
        </button>
      </form>

      <p class="mt-4 text-center text-[14px] text-ink-700">
        Pas encore de compte ?
        <a routerLink="/inscription" class="font-semibold text-ink-900 underline underline-offset-2">En créer un</a>
      </p>

    </nooks-auth-shell>
  `,
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected submit(): void {
    if (this.form.invalid) {
      return;
    }

    this.busy.set(true);
    this.error.set(null);

    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => this.router.navigate(['/']),
      error: () => {
        this.busy.set(false);
        this.error.set('Email ou mot de passe incorrect.');
      },
    });
  }
}
