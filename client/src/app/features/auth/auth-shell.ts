import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Décor commun aux pages de compte : fond clair très légèrement quadrillé,
 * comme un plan, et la fiche blanche posée au centre.
 */
@Component({
  selector: 'nooks-auth-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="relative flex min-h-dvh items-center justify-center overflow-hidden bg-ink-50 px-4 py-10">
      <div
        class="pointer-events-none absolute inset-0"
        style="background-image:
          repeating-linear-gradient(to right, rgb(10 10 10 / 0.035) 0 1px, transparent 1px 40px),
          repeating-linear-gradient(to bottom, rgb(10 10 10 / 0.035) 0 1px, transparent 1px 40px);"
      ></div>
      <div
        class="pointer-events-none absolute inset-0"
        style="background: radial-gradient(ellipse at 50% 40%, transparent 30%, rgb(250 250 250 / 0.9) 78%);"
      ></div>

      <div class="relative w-full max-w-sm">
        <a routerLink="/" class="mb-7 flex items-center justify-center gap-2.5">
          <span class="flex size-9 items-center justify-center rounded-full bg-ink-950">
            <svg width="17" height="17" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M8 1.6c-2.7 0-4.9 2.2-4.9 4.9 0 3.6 4.9 8.1 4.9 8.1s4.9-4.5 4.9-8.1c0-2.7-2.2-4.9-4.9-4.9Z"
                fill="#fff"
              />
              <circle cx="8" cy="6.3" r="1.9" fill="#0a0a0a" />
            </svg>
          </span>
          <span class="text-[22px] leading-none font-extrabold tracking-tight">Nooks</span>
        </a>

        <div class="card card-float animate-rise px-6 py-6">
          <h1 class="text-[22px]">{{ title() }}</h1>
          <p class="mt-1.5 text-[14px] text-ink-500">{{ subtitle() }}</p>
          <div class="divider my-5"></div>
          <ng-content />
        </div>

        <p class="mt-6 text-center text-[13px] text-ink-500">
          <a routerLink="/" class="hover:text-ink-900">Retour à la carte</a>
        </p>
      </div>
    </div>
  `,
})
export class AuthShell {
  readonly title = input.required<string>();
  readonly subtitle = input('');
}
