/**
 * Google Maps Configuration and Utilities
 *
 * DFW-centered map with branded pins by contact track type.
 * Zone drawing for targeted campaigns. Heatmap for lead density.
 */

import { BRAND } from '@/lib/brand';
import type { TrackType } from '@/types/database';

// DFW Center coordinates
export const DFW_CENTER = { lat: 32.7767, lng: -96.7970 };
export const DEFAULT_ZOOM = 10;

// Map styles matching Licona Realty brand
export const MAP_STYLES: google.maps.MapTypeStyle[] = [
  {
    featureType: 'water',
    elementType: 'geometry.fill',
    stylers: [{ color: '#c9d9e8' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.fill',
    stylers: [{ color: '#e8dccf' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: BRAND.colors.accent }],
  },
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry.fill',
    stylers: [{ color: '#c5e8c5' }],
  },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: BRAND.colors.primary }],
  },
];

// Pin SVG for each track type
export function getMapPinSVG(trackType: TrackType | 'sphere'): string {
  const colors = BRAND.mapPins[trackType] || BRAND.mapPins.buyer;
  return `
    <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 26 16 26s16-14 16-26C32 7.16 24.84 0 16 0z"
            fill="${colors.fill}" stroke="${colors.border}" stroke-width="2"/>
      <circle cx="16" cy="16" r="6" fill="white" opacity="0.9"/>
      <text x="16" y="20" text-anchor="middle" fill="${colors.fill}"
            font-size="10" font-weight="bold" font-family="Montserrat, sans-serif">
        ${trackType[0].toUpperCase()}
      </text>
    </svg>
  `;
}

// Create Google Maps marker icon from SVG
export function createPinIcon(trackType: TrackType | 'sphere'): string {
  const svg = getMapPinSVG(trackType);
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

// Zone colors for drawing tools
export const ZONE_COLORS = {
  farming: { fill: 'rgba(211, 169, 113, 0.15)', stroke: BRAND.colors.accent },
  campaign: { fill: 'rgba(59, 130, 246, 0.15)', stroke: '#3B82F6' },
  custom: { fill: 'rgba(19, 34, 54, 0.15)', stroke: BRAND.colors.primary },
} as const;

export type ZoneType = keyof typeof ZONE_COLORS;

export interface MapZone {
  id: string;
  name: string;
  type: ZoneType;
  coordinates: { lat: number; lng: number }[];
  contactCount: number;
  createdAt: string;
}

export interface MapContact {
  id: string;
  firstName: string;
  lastName: string;
  trackType: TrackType;
  pipelineStage: string;
  latitude: number;
  longitude: number;
  address: string;
  lastContactedAt: string | null;
}

// Heatmap gradient matching brand
export const HEATMAP_GRADIENT = [
  'rgba(211, 169, 113, 0)',
  'rgba(211, 169, 113, 0.2)',
  'rgba(211, 169, 113, 0.4)',
  'rgba(211, 169, 113, 0.6)',
  'rgba(211, 169, 113, 0.8)',
  'rgba(19, 34, 54, 0.8)',
  'rgba(19, 34, 54, 1)',
];
