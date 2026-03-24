/**
 * Google Maps Client Intelligence Page
 *
 * Full-screen interactive map with custom Licona Realty brand styling.
 * Contact pins by track type, zone drawing, heatmap layers.
 * Google Maps JavaScript API exclusively.
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { BRAND } from '@/lib/brand';
import {
  DFW_CENTER,
  DEFAULT_ZOOM,
  MAP_STYLES,
  createPinIcon,
  HEATMAP_GRADIENT,
  ZONE_COLORS,
} from '@/lib/maps/config';
import type { MapContact } from '@/lib/maps/config';
import type { TrackType } from '@/types/database';
import {
  MapPin, Layers, Filter, Search, ZoomIn, ZoomOut,
  Crosshair, Eye, EyeOff, PenTool, Download,
} from 'lucide-react';

const TRACK_FILTERS: { value: TrackType | 'all'; label: string; color: string }[] = [
  { value: 'all', label: 'All', color: BRAND.colors.accent },
  { value: 'buyer', label: 'Buyers', color: '#3B82F6' },
  { value: 'seller', label: 'Sellers', color: '#22C55E' },
  { value: 'landlord', label: 'Landlords', color: '#A855F7' },
  { value: 'tenant', label: 'Tenants', color: '#F97316' },
  { value: 'investor', label: 'Investors', color: BRAND.colors.accent },
  { value: 'sphere', label: 'Sphere', color: '#9CA3AF' },
];

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const heatmapRef = useRef<google.maps.visualization.HeatmapLayer | null>(null);

  const [contacts, setContacts] = useState<MapContact[]>([]);
  const [activeFilter, setActiveFilter] = useState<TrackType | 'all'>('all');
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showZoneTool, setShowZoneTool] = useState(false);
  const [selectedContact, setSelectedContact] = useState<MapContact | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch contacts with lat/lng
  const fetchContacts = useCallback(async (trackType?: TrackType) => {
    try {
      const params = new URLSearchParams();
      if (trackType) params.set('track_type', trackType);
      const res = await fetch(`/api/contacts/geocode?${params}`);
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts);
      }
    } catch {
      // Silently handle - map shows empty
    }
  }, []);

  useEffect(() => {
    fetchContacts(activeFilter === 'all' ? undefined : activeFilter);
  }, [activeFilter, fetchContacts]);

  // Initialize Google Maps
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !mapRef.current) return;

    // Check if script already loaded
    if (window.google?.maps) {
      initMap();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=visualization,drawing&callback=initLiconaMap`;
    script.async = true;
    script.defer = true;

    (window as unknown as Record<string, unknown>).initLiconaMap = () => {
      initMap();
    };

    document.head.appendChild(script);

    return () => {
      delete (window as unknown as Record<string, unknown>).initLiconaMap;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function initMap() {
    if (!mapRef.current) return;

    const map = new google.maps.Map(mapRef.current, {
      center: DFW_CENTER,
      zoom: DEFAULT_ZOOM,
      styles: MAP_STYLES,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: false,
    });

    googleMapRef.current = map;
    setIsMapLoaded(true);
  }

  // Update markers when contacts change
  useEffect(() => {
    if (!googleMapRef.current || !isMapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    const filtered = searchQuery
      ? contacts.filter(c =>
          `${c.firstName} ${c.lastName} ${c.address}`
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
        )
      : contacts;

    filtered.forEach(contact => {
      const marker = new google.maps.Marker({
        position: { lat: contact.latitude, lng: contact.longitude },
        map: googleMapRef.current!,
        icon: {
          url: createPinIcon(contact.trackType),
          scaledSize: new google.maps.Size(32, 42),
        },
        title: `${contact.firstName} ${contact.lastName}`,
      });

      marker.addListener('click', () => {
        setSelectedContact(contact);
      });

      markersRef.current.push(marker);
    });
  }, [contacts, isMapLoaded, searchQuery]);

  // Toggle heatmap
  useEffect(() => {
    if (!googleMapRef.current || !isMapLoaded) return;

    if (showHeatmap) {
      const points = contacts.map(c =>
        new google.maps.LatLng(c.latitude, c.longitude)
      );
      heatmapRef.current = new google.maps.visualization.HeatmapLayer({
        data: points,
        map: googleMapRef.current,
        radius: 30,
        gradient: HEATMAP_GRADIENT,
      });
    } else {
      heatmapRef.current?.setMap(null);
      heatmapRef.current = null;
    }
  }, [showHeatmap, contacts, isMapLoaded]);

  const handleZoom = (delta: number) => {
    if (!googleMapRef.current) return;
    const current = googleMapRef.current.getZoom() || DEFAULT_ZOOM;
    googleMapRef.current.setZoom(current + delta);
  };

  const handleRecenter = () => {
    googleMapRef.current?.panTo(DFW_CENTER);
    googleMapRef.current?.setZoom(DEFAULT_ZOOM);
  };

  const toggleDrawing = () => {
    setShowZoneTool(!showZoneTool);
    if (!showZoneTool && googleMapRef.current) {
      const drawingManager = new google.maps.drawing.DrawingManager({
        drawingMode: google.maps.drawing.OverlayType.POLYGON,
        drawingControl: false,
        polygonOptions: {
          fillColor: ZONE_COLORS.farming.fill,
          strokeColor: ZONE_COLORS.farming.stroke,
          strokeWeight: 2,
          editable: true,
        },
      });
      drawingManager.setMap(googleMapRef.current);
    }
  };

  const hasApiKey = !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  return (
    <div className="h-[calc(100vh-4rem)] lg:h-screen flex flex-col">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-navy-dark border-b border-gold/15">
        <div className="flex items-center gap-3">
          <MapPin size={20} className="text-gold" />
          <h1
            className="text-lg font-semibold text-navy dark:text-white"
            style={{ fontFamily: BRAND.fonts.playfair }}
          >
            Client Map
          </h1>
          <Badge variant="gold">{contacts.length} contacts</Badge>
        </div>

        {/* Search */}
        <div className="hidden md:flex items-center gap-2 bg-surface dark:bg-navy/50 rounded-lg px-3 py-1.5">
          <Search size={14} className="text-navy/40 dark:text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search contacts..."
            className="bg-transparent text-sm font-inter outline-none w-48 text-navy dark:text-white"
          />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant={showHeatmap ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setShowHeatmap(!showHeatmap)}
            title="Toggle Heatmap"
          >
            <Layers size={16} />
          </Button>
          <Button
            variant={showZoneTool ? 'primary' : 'ghost'}
            size="sm"
            onClick={toggleDrawing}
            title="Draw Zone"
          >
            <PenTool size={16} />
          </Button>
        </div>
      </div>

      {/* Track Type Filters */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gold/10 overflow-x-auto scrollbar-hide" style={{ backgroundColor: BRAND.colors.primary }}>
        {TRACK_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setActiveFilter(f.value)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-montserrat font-medium transition-all whitespace-nowrap"
            style={
              activeFilter === f.value
                ? { backgroundColor: BRAND.colors.accent, color: BRAND.colors.primary }
                : { backgroundColor: 'transparent', color: BRAND.colors.surface, border: '1px solid rgba(211,169,113,0.3)' }
            }
            onMouseEnter={e => {
              if (activeFilter !== f.value) {
                (e.target as HTMLElement).style.backgroundColor = 'rgba(211,169,113,0.1)';
                (e.target as HTMLElement).style.color = BRAND.colors.accent;
              }
            }}
            onMouseLeave={e => {
              if (activeFilter !== f.value) {
                (e.target as HTMLElement).style.backgroundColor = 'transparent';
                (e.target as HTMLElement).style.color = BRAND.colors.surface;
              }
            }}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: f.color }}
            />
            {f.label}
          </button>
        ))}
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        {hasApiKey ? (
          <>
            <div ref={mapRef} className="w-full h-full" />

            {/* Zoom Controls */}
            <div className="absolute right-4 top-4 flex flex-col gap-1">
              <button
                onClick={() => handleZoom(1)}
                className="w-10 h-10 bg-white dark:bg-navy-dark rounded-lg shadow-md flex items-center justify-center hover:bg-surface transition-colors"
              >
                <ZoomIn size={18} className="text-navy dark:text-white" />
              </button>
              <button
                onClick={() => handleZoom(-1)}
                className="w-10 h-10 bg-white dark:bg-navy-dark rounded-lg shadow-md flex items-center justify-center hover:bg-surface transition-colors"
              >
                <ZoomOut size={18} className="text-navy dark:text-white" />
              </button>
              <button
                onClick={handleRecenter}
                className="w-10 h-10 bg-white dark:bg-navy-dark rounded-lg shadow-md flex items-center justify-center hover:bg-surface transition-colors mt-2"
              >
                <Crosshair size={18} className="text-gold" />
              </button>
            </div>

            {/* Selected Contact Info */}
            {selectedContact && (
              <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80">
                <Card className="!p-4 shadow-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-montserrat font-semibold text-navy dark:text-white">
                        {selectedContact.firstName} {selectedContact.lastName}
                      </h3>
                      <p className="text-xs text-navy/50 dark:text-white/50 font-inter">
                        {selectedContact.address}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedContact(null)}
                      className="text-navy/40 dark:text-white/40 hover:text-navy dark:hover:text-white"
                    >
                      ×
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={selectedContact.trackType === 'investor' ? 'gold' : 'navy'}
                    >
                      {selectedContact.trackType}
                    </Badge>
                    <Badge variant="navy">
                      {selectedContact.pipelineStage.replace('_', ' ')}
                    </Badge>
                  </div>
                  {selectedContact.lastContactedAt && (
                    <p className="text-xs text-navy/40 dark:text-white/40 font-inter mt-2">
                      Last contacted: {new Date(selectedContact.lastContactedAt).toLocaleDateString()}
                    </p>
                  )}
                </Card>
              </div>
            )}

            {/* Legend */}
            <div className="absolute bottom-4 left-4 hidden md:block">
              <Card className="!p-3">
                <p className="text-xs font-montserrat font-semibold text-navy/60 dark:text-white/60 mb-2">
                  PIN LEGEND
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {TRACK_FILTERS.filter(f => f.value !== 'all').map(f => (
                    <div key={f.value} className="flex items-center gap-1.5">
                      <span
                        className="w-3 h-3 rounded-full border-2"
                        style={{
                          backgroundColor: f.color,
                          borderColor: BRAND.colors.accent,
                        }}
                      />
                      <span className="text-[10px] font-inter text-navy/60 dark:text-white/60">
                        {f.label}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </>
        ) : (
          /* Placeholder when no API key */
          <div className="w-full h-full flex items-center justify-center bg-surface dark:bg-navy px-4">
            <Card className="!p-8 text-center max-w-md">
              <MapPin size={40} className="text-gold mx-auto mb-4 opacity-50" />
              <h2 className="text-lg font-montserrat font-semibold text-navy dark:text-white mb-2">
                DFW Contact Map
              </h2>
              <p className="text-sm text-navy/50 dark:text-white/50 font-inter mb-4 break-words [overflow-wrap:anywhere]">
                The interactive map requires configuration. Contact your administrator
                or visit Settings &gt; Integrations &gt; Google Maps to complete setup.
              </p>
              <div className="bg-navy/5 dark:bg-white/5 rounded-[8px] p-3 text-left">
                <p className="text-xs font-mono text-navy/60 dark:text-white/60 break-words [overflow-wrap:anywhere]">
                  Features: Contact pins by track type, heatmap overlay,
                  zone drawing for targeted campaigns, contact detail cards.
                </p>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
