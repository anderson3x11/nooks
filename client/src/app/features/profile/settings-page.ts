import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Auth } from '../../core/auth';
import { MemberProfile } from '../../core/models';
import { MembersApi } from '../../core/members-api';
import { SiteFooter } from '../../shared/site-footer';
import { SiteHeader } from '../../shared/site-header';

/**
 * Les réglages du compte, séparés du profil : le profil montre ce qu'un membre a
 * contribué et se consulte aussi chez les autres, alors qu'on ne change son mot de
 * passe que chez soi.
 */
@Component({
  selector: 'nooks-settings-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, SiteHeader, SiteFooter],
  template: `
    <nooks-header />

    <main class="min-h-screen bg-ink-50 pt-28">
      <div class="mx-auto max-w-6xl px-5 pb-16">
        <header class="mb-8">
          <h1 class="text-[32px]">Paramètres</h1>
          <p class="mt-1 text-[14.5px] text-ink-500">
            Votre présentation publique et vos identifiants de connexion.
            <a routerLink="/profil" class="underline underline-offset-2 hover:text-ink-950">Voir mon profil</a>
          </p>
        </header>

        @if (profile(); as member) {
          <div class="grid gap-4 lg:grid-cols-2">
            <!-- Profil public -->
            <form class="card p-6 lg:col-span-2" [formGroup]="profileForm" (ngSubmit)="saveProfile()">
              <h2 class="text-[19px]">Profil</h2>
              <p class="mt-1 text-[13.5px] text-ink-500">Ce que les autres membres voient de vous.</p>

              <div class="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start">
                <div class="relative shrink-0">
                  @if (member.avatarUrl) {
                    <img [src]="member.avatarUrl" alt="" class="size-24 rounded-full object-cover" />
                  } @else {
                    <span
                      class="flex size-24 items-center justify-center rounded-full bg-ink-950 text-[32px] font-bold text-white"
                    >
                      {{ initial(member.displayName) }}
                    </span>
                  }

                  <label class="btn-round absolute -right-1 -bottom-1 size-9 cursor-pointer" aria-label="Changer la photo">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path
                        d="M2.5 5.5h2l1-1.5h5l1 1.5h2v7h-11Z"
                        stroke="currentColor"
                        stroke-width="1.3"
                        stroke-linejoin="round"
                      />
                      <circle cx="8" cy="9" r="2.2" stroke="currentColor" stroke-width="1.3" />
                    </svg>
                    <input type="file" accept="image/*" class="hidden" (change)="pickAvatar($event)" />
                  </label>
                </div>

                <div class="min-w-0 flex-1">
                  <label class="label-caps mb-1.5 block" for="settings-name">Pseudo</label>
                  <input id="settings-name" class="field" formControlName="displayName" />

                  <label class="label-caps mt-4 mb-1.5 block" for="settings-bio">Présentation</label>
                  <textarea
                    id="settings-bio"
                    class="field min-h-24"
                    rows="3"
                    formControlName="bio"
                    placeholder="Deux lignes sur vous, les coins que vous aimez..."
                  ></textarea>

                  @if (profileMessage(); as message) {
                    <p class="mt-3 text-[13.5px]" [class]="profileFailed() ? 'text-red-600' : 'text-ink-600'">
                      {{ message }}
                    </p>
                  }

                  <button type="submit" class="btn btn-primary mt-5" [disabled]="profileForm.invalid || profileBusy()">
                    Enregistrer
                  </button>
                </div>
              </div>
            </form>

            <!-- Adresse e-mail -->
            <form class="card p-6" [formGroup]="emailForm" (ngSubmit)="changeEmail()">
              <h2 class="text-[19px]">Adresse e-mail</h2>
              <p class="mt-1 text-[13.5px] text-ink-500">C'est aussi votre identifiant de connexion.</p>

              <label class="label-caps mt-6 mb-1.5 block" for="settings-email">Nouvelle adresse</label>
              <input id="settings-email" class="field" type="email" formControlName="email" autocomplete="email" />

              <label class="label-caps mt-4 mb-1.5 block" for="settings-email-password">Mot de passe actuel</label>
              <input
                id="settings-email-password"
                class="field"
                type="password"
                formControlName="currentPassword"
                autocomplete="current-password"
              />

              @if (emailMessage(); as message) {
                <p class="mt-3 text-[13.5px]" [class]="emailFailed() ? 'text-red-600' : 'text-ink-600'">{{ message }}</p>
              }

              <button type="submit" class="btn btn-primary mt-5" [disabled]="emailForm.invalid || emailBusy()">
                Changer l'adresse
              </button>
            </form>

            <!-- Mot de passe -->
            <form class="card p-6" [formGroup]="passwordForm" (ngSubmit)="changePassword()">
              <h2 class="text-[19px]">Mot de passe</h2>
              <p class="mt-1 text-[13.5px] text-ink-500">Huit caractères au minimum.</p>

              <label class="label-caps mt-6 mb-1.5 block" for="settings-current">Mot de passe actuel</label>
              <input
                id="settings-current"
                class="field"
                type="password"
                formControlName="currentPassword"
                autocomplete="current-password"
              />

              <label class="label-caps mt-4 mb-1.5 block" for="settings-new">Nouveau mot de passe</label>
              <input
                id="settings-new"
                class="field"
                type="password"
                formControlName="newPassword"
                autocomplete="new-password"
              />

              @if (passwordMessage(); as message) {
                <p class="mt-3 text-[13.5px]" [class]="passwordFailed() ? 'text-red-600' : 'text-ink-600'">
                  {{ message }}
                </p>
              }

              <button type="submit" class="btn btn-primary mt-5" [disabled]="passwordForm.invalid || passwordBusy()">
                Changer le mot de passe
              </button>
            </form>
          </div>
        }
      </div>
    </main>

    <nooks-footer />
  `,
})
export class SettingsPage {
  private readonly api = inject(MembersApi);
  private readonly auth = inject(Auth);
  private readonly fb = inject(FormBuilder);

  protected readonly profile = signal<MemberProfile | null>(null);

  protected readonly profileForm = this.fb.nonNullable.group({
    displayName: ['', [Validators.required, Validators.maxLength(60)]],
    bio: ['', Validators.maxLength(400)],
  });

  protected readonly emailForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    currentPassword: ['', Validators.required],
  });

  protected readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
  });

  protected readonly profileBusy = signal(false);
  protected readonly profileMessage = signal<string | null>(null);
  protected readonly profileFailed = signal(false);
  protected readonly emailBusy = signal(false);
  protected readonly emailMessage = signal<string | null>(null);
  protected readonly emailFailed = signal(false);
  protected readonly passwordBusy = signal(false);
  protected readonly passwordMessage = signal<string | null>(null);
  protected readonly passwordFailed = signal(false);

  constructor() {
    this.api.me().subscribe((profile) => {
      this.profile.set(profile);
      this.profileForm.setValue({ displayName: profile.displayName, bio: profile.bio ?? '' });
    });
  }

  protected saveProfile(): void {
    if (this.profileForm.invalid) {
      return;
    }

    this.profileBusy.set(true);
    this.profileMessage.set(null);
    const { displayName, bio } = this.profileForm.getRawValue();

    this.api.updateProfile(displayName, bio.trim() || null).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.profileFailed.set(false);
        this.profileMessage.set('Profil enregistré.');
        this.profileBusy.set(false);
      },
      error: (error: unknown) => {
        this.profileFailed.set(true);
        this.profileMessage.set(firstError(error, "Le profil n'a pas pu être enregistré."));
        this.profileBusy.set(false);
      },
    });
  }

  protected pickAvatar(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (!file) {
      return;
    }

    this.api.uploadAvatar(file).subscribe({
      next: (profile) => this.profile.set(profile),
      error: (error: unknown) => {
        this.profileFailed.set(true);
        this.profileMessage.set(firstError(error, "La photo n'a pas pu être envoyée."));
      },
    });
  }

  protected changeEmail(): void {
    if (this.emailForm.invalid) {
      return;
    }

    this.emailBusy.set(true);
    this.emailMessage.set(null);
    const { email, currentPassword } = this.emailForm.getRawValue();

    this.auth.changeEmail(email.trim(), currentPassword).subscribe({
      next: () => {
        this.emailForm.reset();
        this.emailFailed.set(false);
        this.emailMessage.set('Adresse mise à jour.');
        this.emailBusy.set(false);
      },
      error: (error: unknown) => {
        this.emailFailed.set(true);
        this.emailMessage.set(firstError(error, "L'adresse n'a pas pu être changée."));
        this.emailBusy.set(false);
      },
    });
  }

  protected changePassword(): void {
    if (this.passwordForm.invalid) {
      return;
    }

    this.passwordBusy.set(true);
    this.passwordMessage.set(null);
    const { currentPassword, newPassword } = this.passwordForm.getRawValue();

    this.auth.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.passwordForm.reset();
        this.passwordFailed.set(false);
        this.passwordMessage.set('Mot de passe mis à jour.');
        this.passwordBusy.set(false);
      },
      error: (error: unknown) => {
        this.passwordFailed.set(true);
        this.passwordMessage.set(firstError(error, "Le mot de passe n'a pas pu être changé."));
        this.passwordBusy.set(false);
      },
    });
  }

  protected initial(name: string): string {
    return name.trim().charAt(0).toUpperCase();
  }
}

/** Identity renvoie ses refus dans un ProblemDetails de validation : on en tire la première phrase. */
function firstError(error: unknown, fallback: string): string {
  const errors = (error as { error?: { errors?: Record<string, string[]> } })?.error?.errors;
  const first = errors ? Object.values(errors).flat()[0] : undefined;
  return first ?? fallback;
}
