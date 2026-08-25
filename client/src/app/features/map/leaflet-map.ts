import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';
import * as L from 'leaflet';
import { Basemap, DEFAULT_BASEMAP } from '../../core/basemaps';
import { PIN_ANCHOR, PIN_SIZE, draftPinHtml, pinHtml } from '../../core/categories';
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
  readonly basemap = input<Basemap>(DEFAULT_BASEMAP);

  readonly boundsChanged = output<MapBounds>();
  readonly placeSelected = output<string>();
  readonly mapClicked = output<{ latitude: number; longitude: number }>();

  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host');
  private map?: L.Map;
  private tiles?: L.TileLayer;
  private readonly markers = new Map<string, { marker: L.Marker; photo: string | null }>();
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
      for (const [id, entry] of this.markers) {
        entry.marker.getElement()?.classList.toggle('nooks-pin--selected', id === selected);
      }
    });

    effect(() => {
      const basemap = this.basemap();
      if (this.map) {
        this.applyBasemap(basemap);
      }
    });
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  /** Recadre la carte sur un rectangle, typiquement après une recherche de ville. */
  fitTo(bounds: MapBounds): void {
    this.map?.flyToBounds(L.latLngBounds([bounds.minLat, bounds.minLon], [bounds.maxLat, bounds.maxLon]), {
      duration: 0.8,
      maxZoom: 15,
    });
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
      return;
    }

    const icon = L.divIcon({
      html: draftPinHtml(),
      className: 'nooks-pin nooks-pin--draft',
      iconSize: PIN_SIZE,
      iconAnchor: PIN_ANCHOR,
    });
    this.draft = L.marker(latLng, { icon, zIndexOffset: 1000 }).addTo(this.map);
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

    map.on('moveend', () => this.emitBounds(map));
    map.on('click', (event: L.LeafletMouseEvent) =>
      this.mapClicked.emit({ latitude: event.latlng.lat, longitude: event.latlng.lng }),
    );

    this.map = map;
    this.applyBasemap(this.basemap());
    this.syncMarkers(this.places());
    this.emitBounds(map);
  }

  private applyBasemap(basemap: Basemap): void {
    this.tiles?.remove();
    this.tiles = L.tileLayer(basemap.url, {
      maxZoom: 19,
      attribution: basemap.attribution,
    }).addTo(this.map!);
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

  /**
   * Les marqueurs sont ajoutés et retirés un par un : recréer la couche entière
   * ferait clignoter la carte à chaque déplacement.
   */
  private syncMarkers(places: PlaceSummary[]): void {
    const map = this.map;
    if (!map) {
      return;
    }

    const wanted = new Set(places.map((place) => place.id));

    for (const [id, entry] of this.markers) {
      if (!wanted.has(id)) {
        entry.marker.remove();
        this.markers.delete(id);
      }
    }

    for (const place of places) {
      const existing = this.markers.get(place.id);

      if (existing) {
        // La photo de couverture a pu changer depuis le dernier chargement.
        if (existing.photo !== place.coverThumbnailUrl) {
          existing.marker.setIcon(this.icon(place));
          existing.photo = place.coverThumbnailUrl;
        }
        continue;
      }

      const marker = L.marker([place.latitude, place.longitude], {
        icon: this.icon(place, 'nooks-pin--drop'),
        title: place.name,
      })
        .addTo(map)
        .on('click', () => this.placeSelected.emit(place.id));

      marker.bindTooltip(place.name, { direction: 'top', offset: [0, -52], className: 'nooks-tooltip' });
      this.markers.set(place.id, { marker, photo: place.coverThumbnailUrl });
    }
  }

  private icon(place: PlaceSummary, extraClass = ''): L.DivIcon {
    return L.divIcon({
      html: pinHtml(place.category, place.coverThumbnailUrl),
      className: `nooks-pin ${extraClass}`.trim(),
      iconSize: PIN_SIZE,
      iconAnchor: PIN_ANCHOR,
    });
  }
}
