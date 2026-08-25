import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AdminMember, AdminRating, HomeSummary, MemberProfile, PlaceDetail, PlaceSummary } from './models';

@Injectable({ providedIn: 'root' })
export class MembersApi {
  private readonly http = inject(HttpClient);

  home(): Observable<HomeSummary> {
    return this.http.get<HomeSummary>('/api/home');
  }

  me(): Observable<MemberProfile> {
    return this.http.get<MemberProfile>('/api/me');
  }

  profile(id: string): Observable<MemberProfile> {
    return this.http.get<MemberProfile>(`/api/members/${id}`);
  }

  updateProfile(displayName: string, bio: string | null): Observable<MemberProfile> {
    return this.http.put<MemberProfile>('/api/me', { displayName, bio });
  }

  uploadAvatar(file: File): Observable<MemberProfile> {
    const body = new FormData();
    body.append('file', file, file.name);
    return this.http.post<MemberProfile>('/api/me/avatar', body);
  }

  favorites(): Observable<PlaceSummary[]> {
    return this.http.get<PlaceSummary[]>('/api/me/favorites');
  }

  toggleFavorite(placeId: string): Observable<{ isFavorite: boolean }> {
    return this.http.post<{ isFavorite: boolean }>(`/api/places/${placeId}/favorite`, null);
  }

  // --- Administration ---------------------------------------------------

  members(): Observable<AdminMember[]> {
    return this.http.get<AdminMember[]>('/api/admin/members');
  }

  ratings(removedOnly: boolean): Observable<AdminRating[]> {
    return this.http.get<AdminRating[]>('/api/admin/ratings', {
      params: new HttpParams().set('removedOnly', removedOnly),
    });
  }

  removeRating(placeId: string, ratingId: string): Observable<PlaceDetail> {
    return this.http.post<PlaceDetail>(`/api/admin/ratings/${placeId}/${ratingId}/remove`, null);
  }

  restoreRating(placeId: string, ratingId: string): Observable<PlaceDetail> {
    return this.http.post<PlaceDetail>(`/api/admin/ratings/${placeId}/${ratingId}/restore`, null);
  }

  deleteRating(placeId: string, ratingId: string): Observable<void> {
    return this.http.delete<void>(`/api/admin/ratings/${placeId}/${ratingId}`);
  }

  deletePlace(placeId: string): Observable<void> {
    return this.http.delete<void>(`/api/admin/places/${placeId}`);
  }
}
