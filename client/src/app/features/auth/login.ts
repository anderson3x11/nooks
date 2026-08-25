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
        <label class="label-caps mb-1 block text-ink-400" for="login-email">Email</label>
        <input id="login-email" type="email" class="field" formControlName="email" autocomplete="email" />

        <label class="label-caps mt-4 mb-1 block text-ink-400" for="login-password">Mot de passe</label>
        <input
          id="login-password"
          type="password"
          class="field"
          formControlName="password"
          autocomplete="current-password"
        />

        @if (error()) {
          <p class="mt-3 text-[13px] text-rust-500">{{ error() }}</p>
        }

        <button type="submit" class="btn btn-ink mt-5 w-full" [disabled]="form.invalid || busy()">
          {{ busy() ? 'Connexion…' : 'Se connecter' }}
        </button>
      </form>

      <p class="mt-4 text-center text-[13px] text-ink-600">
        Pas encore de compte ?
        <a routerLink="/inscription" class="font-semibold text-signal-700 underline">En créer un</a>
      </p>

      <div class="rule my-4"></div>
      <p class="text-center text-[11.5px] leading-relaxed text-ink-400">
        Comptes de démonstration :<br />
        <span class="font-semibold text-ink-600">admin&#64;nooks.local</span> ou
        <span class="font-semibold text-ink-600">camille&#64;nooks.local</span><br />
        mot de passe <span class="font-semibold text-ink-600">Nooks!2026</span>
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
