export type PlaceCategory =
  | 'Viewpoint'
  | 'Shop'
  | 'Museum'
  | 'StreetArt'
  | 'Nature'
  | 'Abandoned'
  | 'FoodDrink'
  | 'Curiosity'
  | 'Other';

export type PlaceStatus = 'Pending' | 'Approved' | 'Rejected';

export interface PlaceSummary {
  id: string;
  name: string;
  category: PlaceCategory;
  latitude: number;
  longitude: number;
  city: string;
  averageRating: number;
  ratingCount: number;
  status: PlaceStatus;
  createdAt: string;
  coverThumbnailUrl: string | null;
}

export interface PlacePhoto {
  id: string;
  url: string;
  thumbnailUrl: string;
  isCover: boolean;
}

export interface PlaceRating {
  id: string;
  userId: string;
  userDisplayName: string;
  stars: number;
  comment: string | null;
  updatedAt: string;
}

export interface PlaceDetail {
  id: string;
  name: string;
  description: string;
  category: PlaceCategory;
  latitude: number;
  longitude: number;
  address: string | null;
  city: string;
  country: string;
  status: PlaceStatus;
  averageRating: number;
  ratingCount: number;
  createdAt: string;
  createdByDisplayName: string;
  photos: PlacePhoto[];
  ratings: PlaceRating[];
}

export interface CreatePlaceInput {
  name: string;
  description: string;
  category: PlaceCategory;
  latitude: number;
  longitude: number;
  address: string | null;
  city: string;
  country: string;
}

export interface GeocodeResult {
  displayName: string;
  latitude: number;
  longitude: number;
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}

export interface CurrentUser {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
}

export interface AuthResponse {
  token: string;
  expiresAt: string;
  user: CurrentUser;
}

/** Rectangle visible sur la carte, dans l'ordre attendu par l'API. */
export interface MapBounds {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}

export interface PlaceFilters {
  categories: PlaceCategory[];
  minRating: number | null;
  text: string;
}

export const emptyFilters: PlaceFilters = { categories: [], minRating: null, text: '' };
