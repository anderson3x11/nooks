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
  /** L'auteur a maintenu sa proposition malgré un lieu semblable à proximité. */
  suspectedDuplicate: boolean;
}

export interface PlacePhoto {
  id: string;
  url: string;
  thumbnailUrl: string;
  isCover: boolean;
  /** Auteur et licence, pour les photos reprises d'une source libre. */
  attribution: string | null;
  sourceUrl: string | null;
}

export interface PlaceRating {
  id: string;
  userId: string;
  userDisplayName: string;
  stars: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  /** L'avis a été retouché après sa publication. */
  isEdited: boolean;
  photos: RatingPhoto[];
}

/** Photo jointe à un avis par son auteur. */
export interface RatingPhoto {
  id: string;
  url: string;
  thumbnailUrl: string;
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
  suspectedDuplicate: boolean;
  isFavorite: boolean;
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

export interface MemberReview {
  id: string;
  placeId: string;
  placeName: string;
  placeCity: string;
  stars: number;
  comment: string | null;
  updatedAt: string;
  isEdited: boolean;
  isRemoved: boolean;
}

export interface MemberProfile {
  id: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  joinedAt: string;
  reviewCount: number;
  placeCount: number;
  favoriteCount: number;
  places: PlaceSummary[];
  /** Renseigné uniquement sur son propre profil. */
  favorites: PlaceSummary[];
  reviews: MemberReview[];
}

export interface AdminMember {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  joinedAt: string;
  isAdmin: boolean;
  reviewCount: number;
  placeCount: number;
}

export interface AdminRating {
  id: string;
  placeId: string;
  placeName: string;
  userId: string;
  userDisplayName: string;
  stars: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  isEdited: boolean;
  isRemoved: boolean;
}

export interface HomeSummary {
  placeCount: number;
  cityCount: number;
  memberCount: number;
  reviewCount: number;
  latest: PlaceSummary[];
  categories: { category: PlaceCategory; count: number }[];
}
