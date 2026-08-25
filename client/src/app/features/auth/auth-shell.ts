import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Décor commun aux pages de compte : fond encre quadrillé comme un papier
 * millimétré, halo ambre, et la fiche posée dessus.
 */
@Component({
  selector: 'nooks-auth-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="relative flex min-h-dvh items-center justify-center overflow-hidden bg-ink-950 px-4 py-10">
      <div
        class="pointer-events-none absolute inset-0 opacity-70"
        style="background-image:
          repeating-linear-gradient(to right, rgb(245 240 230 / 0.05) 0 1px, transparent 1px 32px),
          repeating-linear-gradient(to bottom, rgb(245 240 230 / 0.05) 0 1px, transparent 1px 32px);"
      ></div>
      <div
        class="pointer-events-none absolute -top-40 -right-32 size-[34rem] rounded-full opacity-40 blur-3xl"
        style="background: radial-gradient(circle, #dd8438 0%, transparent 68%);"
      ></div>

      <div class="relative w-full max-w-sm">
        <a routerLink="/" class="mb-6 block text-center">
          <span class="font-display text-[26px] text-paper-100">Nooks</span>
          <span class="mt-1 block text-[10.5px] tracking-[0.18em] text-ink-400 uppercase">
            carnet de lieux insolites
          </span>
        </a>

        <div class="plate grain animate-rise px-6 py-6">
          <h1 class="text-[21px] text-ink-900">{{ title() }}</h1>
          <p class="mt-1 text-[13px] text-ink-600">{{ subtitle() }}</p>
          <div class="rule my-4"></div>
          <ng-content />
        </div>

        <p class="mt-5 text-center text-[12px] text-ink-400">
          <a routerLink="/" class="hover:text-paper-300">Retour à la carte</a>
        </p>
      </div>
    </div>
  `,
})
export class AuthShell {
  readonly title = input.required<string>();
  readonly subtitle = input('');
}
