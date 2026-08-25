import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Le logo : une goutte de carte, blanche sur un rond noir, et le nom. */
@Component({
  selector: 'nooks-wordmark',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="flex items-center gap-2.5">
      <span class="flex items-center justify-center rounded-full bg-ink-950" [style.width.px]="size()" [style.height.px]="size()">
        <svg [attr.width]="size() * 0.53" [attr.height]="size() * 0.53" viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M8 1.6c-2.7 0-4.9 2.2-4.9 4.9 0 3.6 4.9 8.1 4.9 8.1s4.9-4.5 4.9-8.1c0-2.7-2.2-4.9-4.9-4.9Z"
            fill="#fff"
          />
          <circle cx="8" cy="6.3" r="1.9" fill="#0a0a0a" />
        </svg>
      </span>
      <span class="leading-none font-extrabold tracking-tight" [style.font-size.px]="size() * 0.6">Nooks</span>
    </span>
  `,
  host: { class: 'inline-flex' },
})
export class Wordmark {
  readonly size = input(36);
}
