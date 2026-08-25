import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Wordmark } from './wordmark';

@Component({
  selector: 'nooks-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Wordmark],
  template: `
    <footer class="border-t border-ink-200 bg-ink-50">
      <div class="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-12 sm:flex-row sm:items-start sm:justify-between">
        <div class="max-w-xs">
          <nooks-wordmark [size]="32" />
          <p class="mt-3 text-[14px] leading-relaxed text-ink-500">
            La carte des endroits qu'on trouve par hasard, tenue par ceux qui les trouvent.
          </p>
        </div>

        <div class="flex gap-12">
          <div>
            <p class="label-caps mb-3">Explorer</p>
            <ul class="flex flex-col gap-2 text-[14px] text-ink-700">
              <li><a routerLink="/carte" class="hover:text-ink-950">La carte</a></li>
              <li><a routerLink="/inscription" class="hover:text-ink-950">Créer un compte</a></li>
              <li><a routerLink="/connexion" class="hover:text-ink-950">Connexion</a></li>
            </ul>
          </div>

          <div>
            <p class="label-caps mb-3">Données</p>
            <ul class="flex flex-col gap-2 text-[14px] text-ink-700">
              <li>
                <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener" class="hover:text-ink-950">
                  OpenStreetMap
                </a>
              </li>
              <li>
                <a href="https://carto.com/attributions" target="_blank" rel="noopener" class="hover:text-ink-950">
                  CARTO
                </a>
              </li>
              <li>
                <a href="https://commons.wikimedia.org" target="_blank" rel="noopener" class="hover:text-ink-950">
                  Wikimedia Commons
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div class="border-t border-ink-200 py-5 text-center text-[13px] text-ink-400">
        Preuve de concept. Les lieux du jeu de départ ont des coordonnées approximatives.
      </div>
    </footer>
  `,
})
export class SiteFooter {}
