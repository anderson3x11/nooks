import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  OnDestroy,
  afterNextRender,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';
import * as L from 'leaflet';
import { draftPinSvg, pinSvg } from '../../core/categories';
import { MapBounds, PlaceSummary } from '../../core/models';

const PARIS: L.LatLngTuple = [48.8566, 2.3522];

/**
 * Unique point de contact avec Leaflet. Le reste de l'application ne manipule
 * que des lieux et des rectangles ; tout ce qui est carte vit ici.
 */
@Component({
  selector: 'nooks-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div #host class="h-full w-full" [class.map-picking]="picking()"></div>`,
  host: { class: 'block h-full w-full' },
})
export class LeafletMap implements OnDestroy {
  readonly places = input<PlaceSummary[]>([]);
  readonly selectedId = input<string | null>(null);
  readonly picking = input(false);

  readonly boundsChanged = output<MapBounds>();
  readonly placeSelected = output<string>();
  readonly mapClicked = output<{ latitude: number; longitude: number }>();

  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host');
  private map?: L.Map;
  private readonly markers = new Map<string, L.Marker>();
  private draft?: L.Marker;

  constructor() {
    afterNextRender(() => this.initialise());

    effect(() => {
      const places = this.places();
      if (this.map) {
        this.syncMarkers(places);
      }
    });

    effect(() => {
      const selected = this.selectedId();
      for (const [id, marker] of this.markers) {
        marker.getElement()?.classList.toggle('nooks-pin--selected', id === selected);
      }
    });
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  /** Recadre la carte sur un rectangle, typiquement après une recherche de ville. */
  fitTo(bounds: MapBounds): void {
    this.map?.flyToBounds(
      L.latLngBounds([bounds.minLat, bounds.minLon], [bounds.maxLat, bounds.maxLon]),
      { duration: 0.8, maxZoom: 15 },
    );
  }

  panToPlace(place: PlaceSummary): void {
    this.map?.flyTo([place.latitude, place.longitude], Math.max(this.map.getZoom(), 15), { duration: 0.6 });
  }

  /** Épingle provisoire montrant où sera posé le lieu en cours de création. */
  showDraftPin(position: { latitude: number; longitude: number } | null): void {
    if (!this.map) {
      return;
    }

    if (!position) {
      this.draft?.remove();
      this.draft = undefined;
      return;
    }

    const latLng = L.latLng(position.latitude, position.longitude);
    if (this.draft) {
      this.draft.setLatLng(latLng);
    } else {
      const icon = L.divIcon({
        html: draftPinSvg(),
        className: 'nooks-pin nooks-pin--draft',
        iconSize: [28, 36],
        iconAnchor: [14, 36],
      });
      this.draft = L.marker(latLng, { icon, zIndexOffset: 1000 }).addTo(this.map);
    }
  }

  private initialise(): void {
    const map = L.map(this.host().nativeElement, {
      center: PARIS,
      zoom: 13,
      zoomControl: false,
      attributionControl: true,
    });

    // En bas à droite : le coin haut gauche revient au bandeau de titre.
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    map.on('moveend', () => this.emitBounds(map));
    map.on('click', (event: L.LeafletMouseEvent) =>
      this.mapClicked.emit({ latitude: event.latlng.lat, longitude: event.latlng.lng }),
    );

    this.map = map;
    this.syncMarkers(this.places());
    this.emitBounds(map);
  }

  private emitBounds(map: L.Map): void {
    const bounds = map.getBounds();
    this.boundsChanged.emit({
      minLon: bounds.getWest(),
      minLat: bounds.getSouth(),
      maxLon: bounds.getEast(),
      maxLat: bounds.getNorth(),
    });
  }

  /** Les marqueurs sont ajoutés et retirés un par un : recréer la couche entière ferait clignoter la carte. */
  private syncMarkers(places: PlaceSummary[]): void {
    const map = this.map;
    if (!map) {
      return;
    }

    const wanted = new Set(places.map((place) => place.id));

    for (const [id, marker] of this.markers) {
      if (!wanted.has(id)) {
        marker.remove();
        this.markers.delete(id);
      }
    }

    for (const place of places) {
      if (this.markers.has(place.id)) {
        continue;
      }

      const marker = L.marker([place.latitude, place.longitude], {
        icon: this.icon(place.category, 'nooks-pin--drop'),
        title: place.name,
      })
        .addTo(map)
        .on('click', () => this.placeSelected.emit(place.id));

      marker.bindTooltip(place.name, { direction: 'top', offset: [0, -34], className: 'nooks-tooltip' });
      this.markers.set(place.id, marker);
    }
  }

  private icon(category: PlaceSummary['category'], extraClass = ''): L.DivIcon {
    return L.divIcon({
      html: pinSvg(category),
      className: `nooks-pin ${extraClass}`.trim(),
      iconSize: [28, 36],
      iconAnchor: [14, 36],
    });
  }
}
