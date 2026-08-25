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

  create(input: CreatePlaceInput): Observable<PlaceDetail> {
    return this.http.post<PlaceDetail>('/api/places', input);
  }

  rate(id: string, stars: number, comment: string | null): Observable<PlaceDetail> {
    return this.http.put<PlaceDetail>(`/api/places/${id}/rating`, { stars, comment });
  }

  uploadPhoto(id: string, file: File): Observable<PlaceDetail> {
    const body = new FormData();
    body.append('file', file, file.name);
    return this.http.post<PlaceDetail>(`/api/places/${id}/photos`, body);
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
