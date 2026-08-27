import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreatePlaceInput,
  GeocodeResult,
  MapBounds,
  PlaceDetail,
  PlaceFilters,
  PlaceStatus,
  PlaceSummary,
} from './models';

@Injectable({ providedIn: 'root' })
export class PlacesApi {
  private readonly http = inject(HttpClient);

  search(bounds: MapBounds, filters: PlaceFilters): Observable<PlaceSummary[]> {
    let params = new HttpParams().set(
      'bbox',
      `${bounds.minLon},${bounds.minLat},${bounds.maxLon},${bounds.maxLat}`,
    );

    if (filters.categories.length > 0) {
      params = params.set('categories', filters.categories.join(','));
    }
    if (filters.minRating !== null) {
      params = params.set('minRating', filters.minRating);
    }
    if (filters.text.trim().length > 0) {
      params = params.set('q', filters.text.trim());
    }

    return this.http.get<PlaceSummary[]>('/api/places', { params });
  }

  detail(id: string): Observable<PlaceDetail> {
    return this.http.get<PlaceDetail>(`/api/places/${id}`);
  }

  /** Création en multipart : le lieu part avec ses photos, dont la première sert de marqueur. */
  create(input: CreatePlaceInput, photos: File[], force = false): Observable<PlaceDetail> {
    const body = new FormData();
    body.append('name', input.name);
    body.append('description', input.description);
    body.append('category', input.category);
    body.append('latitude', String(input.latitude));
    body.append('longitude', String(input.longitude));
    body.append('address', input.address ?? '');
    body.append('city', input.city);
    body.append('country', input.country);

    if (force) {
      body.append('force', 'true');
    }

    for (const photo of photos) {
      body.append('photos', photo, photo.name);
    }

    return this.http.post<PlaceDetail>('/api/places', body);
  }

  /** Lieux déjà connus qui ressemblent à celui qu'on s'apprête à proposer. */
  findSimilar(input: Pick<CreatePlaceInput, 'name' | 'category' | 'latitude' | 'longitude'>): Observable<PlaceSummary[]> {
    const params = new HttpParams()
      .set('latitude', input.latitude)
      .set('longitude', input.longitude)
      .set('name', input.name)
      .set('category', input.category);

    return this.http.get<PlaceSummary[]>('/api/places/similar', { params });
  }

  rate(id: string, stars: number, comment: string | null): Observable<PlaceDetail> {
    return this.http.put<PlaceDetail>(`/api/places/${id}/rating`, { stars, comment });
  }

  uploadPhoto(id: string, file: File): Observable<PlaceDetail> {
    const body = new FormData();
    body.append('file', file, file.name);
    return this.http.post<PlaceDetail>(`/api/places/${id}/photos`, body);
  }

  /** Illustre son propre avis : il faut l'avoir publié d'abord. */
  uploadRatingPhoto(id: string, file: File): Observable<PlaceDetail> {
    const body = new FormData();
    body.append('file', file, file.name);
    return this.http.post<PlaceDetail>(`/api/places/${id}/rating/photos`, body);
  }

  geocode(query: string): Observable<GeocodeResult[]> {
    return this.http.get<GeocodeResult[]>('/api/geocode', { params: new HttpParams().set('q', query) });
  }

  moderationQueue(status: PlaceStatus = 'Pending'): Observable<PlaceSummary[]> {
    return this.http.get<PlaceSummary[]>('/api/admin/places', {
      params: new HttpParams().set('status', status),
    });
  }

  approve(id: string): Observable<PlaceDetail> {
    return this.http.post<PlaceDetail>(`/api/admin/places/${id}/approve`, null);
  }

  reject(id: string): Observable<PlaceDetail> {
    return this.http.post<PlaceDetail>(`/api/admin/places/${id}/reject`, null);
  }
}
