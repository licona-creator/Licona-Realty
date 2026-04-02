/**
 * Google Maps Configuration and Utilities
 *
 * DFW-centered map with branded pins by contact type.
 * Dark navy map style matching Licona Realty brand.
 * Zone drawing for targeted campaigns. Heatmap for lead density.
 */

import { BRAND } from '@/lib/brand';
import type { TrackType } from '@/types/database';

// DFW Center coordinates
export const DFW_CENTER = { lat: 32.7767, lng: -96.7970 };
export const DEFAULT_ZOOM = 10;

// Pin type colors for Neighborhood Intelligence
export const PIN_COLORS = {
  homeowner: { fill: '#14B8A6', border: '#0D9488', label: 'Homeowner' },
  active_buyer: { fill: '#d3a971', border: '#B8894D', label: 'Active Buyer' },
  active_deal: { fill: '#EF4444', border: '#DC2626', label: 'Active Deal' },
  closed_deal: { fill: '#3B82F6', border: '#2563EB', label: 'Closed Deal' },
  other: { fill: '#132236', border: '#d3a971', label: 'Contact' },
} as const;

export type PinType = keyof typeof PIN_COLORS;

// Dark navy map style matching Licona Realty brand
export const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1a2535' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#132236' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a9ab5' }] },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#2a3f5f' }],
  },
  {
    featureType: 'administrative.land_parcel',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#64748b' }],
  },
  {
    featureType: 'landscape',
    elementType: 'geometry.fill',
    stylers: [{ color: '#1a2535' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#1e2d42' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry.fill',
    stylers: [{ color: '#1a3028' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#243447' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1a2535' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#2c4a6b' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#d3a971', weight: 0.5 }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#1e2d42' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry.fill',
    stylers: [{ color: '#0e1a2b' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#4a6a8a' }],
  },
];

// Pin SVG for each track type (legacy support)
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

// Create pin icon for specific pin type (Neighborhood Intelligence)
export function createPinSVG(pinType: PinType): string {
  const colors = PIN_COLORS[pinType];
  const icons: Record<PinType, string> = {
    homeowner: '<path d="M16 10l-6 5v7h4v-4h4v4h4v-7l-6-5z" fill="white" opacity="0.9"/>',
    active_buyer: '<circle cx="16" cy="14" r="3" fill="white" opacity="0.9"/><path d="M10 22c0-3.3 2.7-6 6-6s6 2.7 6 6" fill="white" opacity="0.9"/>',
    active_deal: '<path d="M12 16l3 3 5-6" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    closed_deal: '<path d="M12 16l3 3 5-6" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    other: '<circle cx="16" cy="16" r="4" fill="white" opacity="0.9"/>',
  };

  return `<svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 26 16 26s16-14 16-26C32 7.16 24.84 0 16 0z"
          fill="${colors.fill}" stroke="${colors.border}" stroke-width="2"/>
    ${icons[pinType]}
  </svg>`;
}

// Create Google Maps marker icon from SVG
export function createPinIcon(trackType: TrackType | 'sphere'): string {
  const svg = getMapPinSVG(trackType);
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

// Create pin icon URL for pin type
export function createPinTypeIcon(pinType: PinType): string {
  const svg = createPinSVG(pinType);
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
