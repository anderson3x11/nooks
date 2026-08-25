import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ViewportScroller } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class App {
  constructor() {
    // La navbar flotte au-dessus du contenu : sans ce décalage, une ancre amène
    // le titre de section juste dessous, à moitié caché.
    inject(ViewportScroller).setOffset([0, 100]);
  }
}
