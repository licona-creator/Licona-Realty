/**
 * Neighborhood Intelligence Map
 *
 * Full-screen dark navy Google Map with DFW center.
 * Contact pins by type: homeowners (teal), active buyers (gold),
 * active deals (red pulse), closed deals (blue), other (navy).
 * Three-tab pull-up panel: My Network, Market Intel, Buyer Zones.
 * Mobile bottom sheet with drag interaction, desktop side panel.
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { BRAND } from '@/lib/brand';
import {
  DFW_CENTER,
  DEFAULT_ZOOM,
  MAP_STYLES,
  PIN_COLORS,
  createPinTypeIcon,
} from '@/lib/maps/config';
import type { PinType } from '@/lib/maps/config';
import {
  MapPin, Users, TrendingUp, Target,
  ZoomIn, ZoomOut, Crosshair, ChevronUp, ChevronDown,
  Search, X, Loader2,
} from 'lucide-react';

// Types for map data
interface MapContactData {
  id: string;
  firstName: string;
  lastName: string;
  latitude: number;
  longitude: number;
  zipCode: string | null;
  city: string | null;
  neighborhood: string | null;
  county: string | null;
  trackType: string;
  pinType: PinType;
  address: string;
  lastContactedAt: string | null;
  deal: {
    status: string;
    dealType: string | null;
    closingDate: string | null;
  } | null;
}

interface MarketData {
  zip_code: string;
  median_price: number | null;
  avg_dom: number | null;
  homes_sold: number | null;
  new_listings: number | null;
  inventory_level: number | null;
  list_to_sale_ratio: number | null;
  market_summary: string | null;
  data_source: string | null;
  fetched_at: string;
}

type TabId = 'network' | 'market' | 'buyers';
type PanelState = 'collapsed' | 'half' | 'full';

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const [contacts, setContacts] = useState<MapContactData[]>([]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Panel state
  const [activeTab, setActiveTab] = useState<TabId>('network');
  const [panelState, setPanelState] = useState<PanelState>('collapsed');
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number>(0);
  const dragStartState = useRef<PanelState>('collapsed');

  // Market intel state
  const [selectedZip, setSelectedZip] = useState('');
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState('');

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch contacts
  const fetchContacts = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/map/contacts');
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
      }
    } catch {
      // Map shows empty on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Initialize Google Maps
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !mapRef.current) return;

    if (window.google?.maps) {
      initMap();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=visualization&callback=initLiconaMap`;
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
    infoWindowRef.current = new google.maps.InfoWindow();
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
          `${c.firstName} ${c.lastName} ${c.address} ${c.zipCode || ''}`
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
        )
      : contacts;

    filtered.forEach(contact => {
      const marker = new google.maps.Marker({
        position: { lat: contact.latitude, lng: contact.longitude },
        map: googleMapRef.current!,
        icon: {
          url: createPinTypeIcon(contact.pinType),
          scaledSize: new google.maps.Size(32, 42),
        },
        title: `${contact.firstName} ${contact.lastName}`,
      });

      marker.addListener('click', () => {
        if (infoWindowRef.current && googleMapRef.current) {
          const pinLabel = PIN_COLORS[contact.pinType]?.label || 'Contact';
          const pinColor = PIN_COLORS[contact.pinType]?.fill || '#132236';
          const dealInfo = contact.deal
            ? `<div style="margin-top:4px;font-size:11px;color:#666;">
                ${contact.deal.status.replace('_', ' ')}${contact.deal.closingDate ? ' - Closing ' + new Date(contact.deal.closingDate).toLocaleDateString() : ''}
               </div>`
            : '';
          infoWindowRef.current.setContent(`
            <div style="font-family:Montserrat,sans-serif;padding:4px;min-width:180px;">
              <div style="font-weight:600;font-size:14px;color:#132236;">
                ${contact.firstName} ${contact.lastName}
              </div>
              <div style="font-size:12px;color:#666;margin-top:2px;">${contact.address}</div>
              <div style="margin-top:6px;">
                <span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;color:white;background:${pinColor};">
                  ${pinLabel}
                </span>
              </div>
              ${dealInfo}
            </div>
          `);
          infoWindowRef.current.open(googleMapRef.current, marker);
        }
      });

      markersRef.current.push(marker);
    });
  }, [contacts, isMapLoaded, searchQuery]);

  // Map controls
  const handleZoom = (delta: number) => {
    if (!googleMapRef.current) return;
    const current = googleMapRef.current.getZoom() || DEFAULT_ZOOM;
    googleMapRef.current.setZoom(current + delta);
  };

  const handleRecenter = () => {
    googleMapRef.current?.panTo(DFW_CENTER);
    googleMapRef.current?.setZoom(DEFAULT_ZOOM);
  };

  const centerOnContact = (contact: MapContactData) => {
    if (!googleMapRef.current) return;
    googleMapRef.current.panTo({ lat: contact.latitude, lng: contact.longitude });
    googleMapRef.current.setZoom(15);

    // Find and click the marker
    const marker = markersRef.current.find(m => {
      const pos = m.getPosition();
      return pos && Math.abs(pos.lat() - contact.latitude) < 0.0001 && Math.abs(pos.lng() - contact.longitude) < 0.0001;
    });
    if (marker) {
      google.maps.event.trigger(marker, 'click');
    }
  };

  // Market Intel
  const fetchMarketData = async (zip: string) => {
    if (!/^\d{5}$/.test(zip)) return;
    setMarketLoading(true);
    setMarketError('');
    try {
      const res = await fetch(`/api/map/market-intel?zip=${zip}`);
      if (res.ok) {
        const json = await res.json();
        setMarketData(json.data);
      } else {
        const err = await res.json().catch(() => ({ error: 'Failed to fetch' }));
        setMarketError(err.error || 'Failed to fetch market data');
      }
    } catch {
      setMarketError('Network error');
    } finally {
      setMarketLoading(false);
    }
  };

  // Get unique zip codes from contacts
  const zipCodes = [...new Set(contacts.map(c => c.zipCode).filter(Boolean))] as string[];

  // Group contacts by zip and neighborhood for My Network tab
  const contactsByZip = contacts.reduce<Record<string, MapContactData[]>>((acc, c) => {
    const key = c.zipCode || 'Unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  // Get active buyers for Buyer Zones tab
  const activeBuyers = contacts.filter(c => c.pinType === 'active_buyer');

  // Panel drag handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    dragStartState.current = panelState;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaY = dragStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(deltaY) < 30) return;

    if (deltaY > 0) {
      // Swiped up
      if (dragStartState.current === 'collapsed') setPanelState('half');
      else if (dragStartState.current === 'half') setPanelState('full');
    } else {
      // Swiped down
      if (dragStartState.current === 'full') setPanelState('half');
      else if (dragStartState.current === 'half') setPanelState('collapsed');
    }
  };

  const togglePanel = () => {
    if (panelState === 'collapsed') setPanelState('half');
    else if (panelState === 'half') setPanelState('full');
    else setPanelState('collapsed');
  };

  const panelHeight = panelState === 'collapsed' ? 'h-14' : panelState === 'half' ? 'h-[50vh]' : 'h-[85vh]';

  const hasApiKey = !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const formatPrice = (val: number | null) => {
    if (val === null) return '--';
    return '$' + val.toLocaleString();
  };

  const formatRatio = (val: number | null) => {
    if (val === null) return '--';
    return (val * 100).toFixed(1) + '%';
  };

  // Filter contacts by search
  const filteredContacts = searchQuery
    ? contacts.filter(c =>
        `${c.firstName} ${c.lastName} ${c.address} ${c.zipCode || ''}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      )
    : contacts;

  // Pin type counts
  const pinCounts = filteredContacts.reduce<Record<string, number>>((acc, c) => {
    acc[c.pinType] = (acc[c.pinType] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="h-[calc(100vh-4rem)] lg:h-screen flex flex-col relative">
      {/* Pulse animation for active deals */}
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        .pin-pulse::before {
          content: '';
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: #EF4444;
          animation: pulse-ring 1.5s ease-out infinite;
        }
      `}</style>

      {/* Header Bar */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-gold/15 z-10"
        style={{ backgroundColor: BRAND.colors.primary }}
      >
        <div className="flex items-center gap-3">
          <MapPin size={20} style={{ color: BRAND.colors.accent }} />
          <h1
            className="text-lg font-semibold text-white"
            style={{ fontFamily: BRAND.fonts.playfair }}
          >
            Neighborhood Intel
          </h1>
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-montserrat font-bold"
            style={{ backgroundColor: BRAND.colors.accent, color: BRAND.colors.primary }}
          >
            {filteredContacts.length}
          </span>
        </div>

        {/* Search */}
        <div className="hidden md:flex items-center gap-2 rounded-lg px-3 py-1.5" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
          <Search size={14} className="text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search contacts..."
            className="bg-transparent text-sm font-inter outline-none w-48 text-white placeholder:text-white/40"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-white/40 hover:text-white">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Pin Legend */}
        <div className="hidden lg:flex items-center gap-3">
          {Object.entries(PIN_COLORS).map(([type, colors]) => (
            <div key={type} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: colors.fill }}
              />
              <span className="text-[10px] font-inter text-white/60">
                {colors.label} {pinCounts[type] ? `(${pinCounts[type]})` : ''}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Map + Panel Layout */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Map Container */}
        <div className="flex-1 relative">
          {hasApiKey ? (
            <>
              <div ref={mapRef} className="w-full h-full" />

              {/* Loading overlay */}
              {(isLoading || !isMapLoaded) && (
                <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(19,34,54,0.8)' }}>
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 size={32} className="animate-spin" style={{ color: BRAND.colors.accent }} />
                    <span className="text-sm font-inter text-white/60">Loading map data...</span>
                  </div>
                </div>
              )}

              {/* Zoom Controls */}
              <div className="absolute right-4 top-4 flex flex-col gap-1 z-10">
                <button
                  onClick={() => handleZoom(1)}
                  className="w-10 h-10 rounded-lg shadow-md flex items-center justify-center transition-colors"
                  style={{ backgroundColor: BRAND.colors.primary }}
                >
                  <ZoomIn size={18} className="text-white" />
                </button>
                <button
                  onClick={() => handleZoom(-1)}
                  className="w-10 h-10 rounded-lg shadow-md flex items-center justify-center transition-colors"
                  style={{ backgroundColor: BRAND.colors.primary }}
                >
                  <ZoomOut size={18} className="text-white" />
                </button>
                <button
                  onClick={handleRecenter}
                  className="w-10 h-10 rounded-lg shadow-md flex items-center justify-center transition-colors mt-2"
                  style={{ backgroundColor: BRAND.colors.primary }}
                >
                  <Crosshair size={18} style={{ color: BRAND.colors.accent }} />
                </button>
              </div>

              {/* Mobile Pin Legend */}
              <div className="absolute left-3 top-3 lg:hidden z-10">
                <div
                  className="rounded-lg p-2 shadow-md"
                  style={{ backgroundColor: 'rgba(19,34,54,0.9)', backdropFilter: 'blur(8px)' }}
                >
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {Object.entries(PIN_COLORS).map(([type, colors]) => (
                      <div key={type} className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.fill }} />
                        <span className="text-[9px] font-inter text-white/60">{colors.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: BRAND.colors.primary }}>
              <div className="text-center max-w-md px-4">
                <MapPin size={40} style={{ color: BRAND.colors.accent }} className="mx-auto mb-4 opacity-50" />
                <h2 className="text-lg font-montserrat font-semibold text-white mb-2">
                  DFW Neighborhood Intelligence
                </h2>
                <p className="text-sm text-white/50 font-inter">
                  The interactive map requires Google Maps configuration. Visit Settings to complete setup.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Side Panel */}
        <div
          className="hidden lg:flex flex-col w-[400px] border-l border-gold/15 overflow-hidden"
          style={{ backgroundColor: BRAND.colors.primary }}
        >
          {/* Tab Bar */}
          <div className="flex border-b border-gold/15">
            {[
              { id: 'network' as TabId, label: 'My Network', icon: Users },
              { id: 'market' as TabId, label: 'Market Intel', icon: TrendingUp },
              { id: 'buyers' as TabId, label: 'Buyer Zones', icon: Target },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-montserrat font-medium transition-colors"
                style={{
                  color: activeTab === tab.id ? BRAND.colors.accent : 'rgba(255,255,255,0.5)',
                  borderBottom: activeTab === tab.id ? `2px solid ${BRAND.colors.accent}` : '2px solid transparent',
                }}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'network' && (
              <NetworkTab
                contactsByZip={contactsByZip}
                onSelectContact={centerOnContact}
              />
            )}
            {activeTab === 'market' && (
              <MarketTab
                zipCodes={zipCodes}
                selectedZip={selectedZip}
                onSelectZip={(zip) => { setSelectedZip(zip); fetchMarketData(zip); }}
                marketData={marketData}
                loading={marketLoading}
                error={marketError}
                formatPrice={formatPrice}
                formatRatio={formatRatio}
              />
            )}
            {activeTab === 'buyers' && (
              <BuyerZonesTab
                buyers={activeBuyers}
                onSelectBuyer={centerOnContact}
              />
            )}
          </div>
        </div>

        {/* Mobile Bottom Sheet */}
        <div
          ref={panelRef}
          className={`lg:hidden absolute bottom-0 left-0 right-0 z-20 transition-all duration-300 ease-out ${panelHeight}`}
          style={{
            backgroundColor: BRAND.colors.primary,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Drag Handle */}
          <button
            onClick={togglePanel}
            className="w-full flex flex-col items-center pt-2 pb-1"
          >
            <div className="w-10 h-1 rounded-full bg-white/20 mb-2" />
            {panelState === 'collapsed' ? (
              <ChevronUp size={16} className="text-white/40" />
            ) : panelState === 'full' ? (
              <ChevronDown size={16} className="text-white/40" />
            ) : null}
          </button>

          {/* Tab Bar */}
          <div className="flex border-b border-gold/15 px-2">
            {[
              { id: 'network' as TabId, label: 'Network', icon: Users },
              { id: 'market' as TabId, label: 'Intel', icon: TrendingUp },
              { id: 'buyers' as TabId, label: 'Buyers', icon: Target },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); if (panelState === 'collapsed') setPanelState('half'); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-montserrat font-medium transition-colors"
                style={{
                  color: activeTab === tab.id ? BRAND.colors.accent : 'rgba(255,255,255,0.5)',
                  borderBottom: activeTab === tab.id ? `2px solid ${BRAND.colors.accent}` : '2px solid transparent',
                }}
              >
                <tab.icon size={12} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          {panelState !== 'collapsed' && (
            <div className="flex-1 overflow-y-auto" style={{ maxHeight: panelState === 'half' ? 'calc(50vh - 5rem)' : 'calc(85vh - 5rem)' }}>
              {activeTab === 'network' && (
                <NetworkTab
                  contactsByZip={contactsByZip}
                  onSelectContact={(c) => { centerOnContact(c); setPanelState('collapsed'); }}
                />
              )}
              {activeTab === 'market' && (
                <MarketTab
                  zipCodes={zipCodes}
                  selectedZip={selectedZip}
                  onSelectZip={(zip) => { setSelectedZip(zip); fetchMarketData(zip); }}
                  marketData={marketData}
                  loading={marketLoading}
                  error={marketError}
                  formatPrice={formatPrice}
                  formatRatio={formatRatio}
                />
              )}
              {activeTab === 'buyers' && (
                <BuyerZonesTab
                  buyers={activeBuyers}
                  onSelectBuyer={(c) => { centerOnContact(c); setPanelState('collapsed'); }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Tab Components
// ============================================

function NetworkTab({
  contactsByZip,
  onSelectContact,
}: {
  contactsByZip: Record<string, MapContactData[]>;
  onSelectContact: (c: MapContactData) => void;
}) {
  const zipEntries = Object.entries(contactsByZip).sort((a, b) => b[1].length - a[1].length);

  if (zipEntries.length === 0) {
    return (
      <div className="p-6 text-center">
        <Users size={32} className="mx-auto mb-3 opacity-30" style={{ color: BRAND.colors.accent }} />
        <p className="text-sm text-white/50 font-inter">
          Add addresses to your contacts to see them here
        </p>
      </div>
    );
  }

  return (
    <div className="p-3">
      {zipEntries.map(([zip, zipContacts]) => {
        // Group by neighborhood within zip
        const byNeighborhood = zipContacts.reduce<Record<string, MapContactData[]>>((acc, c) => {
          const key = c.neighborhood || 'Other';
          if (!acc[key]) acc[key] = [];
          acc[key].push(c);
          return acc;
        }, {});

        return (
          <div key={zip} className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-xs font-montserrat font-bold px-2 py-0.5 rounded"
                style={{ backgroundColor: 'rgba(211,169,113,0.15)', color: BRAND.colors.accent }}
              >
                {zip}
              </span>
              <span className="text-[10px] text-white/40 font-inter">
                {zipContacts.length} contact{zipContacts.length !== 1 ? 's' : ''}
              </span>
            </div>

            {Object.entries(byNeighborhood).map(([neighborhood, nhContacts]) => (
              <div key={neighborhood} className="ml-2 mb-2">
                {neighborhood !== 'Other' && (
                  <p className="text-[10px] text-white/30 font-inter mb-1 uppercase tracking-wider">
                    {neighborhood}
                  </p>
                )}
                {nhContacts.map(contact => (
                  <button
                    key={contact.id}
                    onClick={() => onSelectContact(contact)}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: PIN_COLORS[contact.pinType]?.fill || '#132236' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-montserrat font-medium text-white truncate">
                        {contact.firstName} {contact.lastName}
                      </p>
                      <p className="text-[11px] text-white/40 font-inter truncate">
                        {contact.address}
                      </p>
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0">
                      <span
                        className="text-[9px] font-montserrat font-bold px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: PIN_COLORS[contact.pinType]?.fill || '#132236',
                          color: 'white',
                        }}
                      >
                        {PIN_COLORS[contact.pinType]?.label || 'Contact'}
                      </span>
                      {contact.lastContactedAt && (
                        <span className="text-[9px] text-white/30 font-inter mt-0.5">
                          {new Date(contact.lastContactedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function MarketTab({
  zipCodes,
  selectedZip,
  onSelectZip,
  marketData,
  loading,
  error,
  formatPrice,
  formatRatio,
}: {
  zipCodes: string[];
  selectedZip: string;
  onSelectZip: (zip: string) => void;
  marketData: MarketData | null;
  loading: boolean;
  error: string;
  formatPrice: (val: number | null) => string;
  formatRatio: (val: number | null) => string;
}) {
  const [manualZip, setManualZip] = useState('');

  return (
    <div className="p-4">
      {/* Zip Selector */}
      <div className="mb-4">
        <label className="text-[10px] text-white/40 font-montserrat uppercase tracking-wider mb-1 block">
          Select Zip Code
        </label>
        <div className="flex gap-2">
          <select
            value={selectedZip}
            onChange={(e) => { if (e.target.value) onSelectZip(e.target.value); }}
            className="flex-1 rounded-lg px-3 py-2 text-sm font-inter outline-none"
            style={{
              backgroundColor: 'rgba(255,255,255,0.08)',
              color: 'white',
              border: `1px solid rgba(211,169,113,0.2)`,
            }}
          >
            <option value="" style={{ backgroundColor: BRAND.colors.primary }}>Choose zip...</option>
            {zipCodes.sort().map(zip => (
              <option key={zip} value={zip} style={{ backgroundColor: BRAND.colors.primary }}>{zip}</option>
            ))}
          </select>
          <div className="flex gap-1">
            <input
              type="text"
              value={manualZip}
              onChange={e => setManualZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
              placeholder="ZIP"
              className="w-20 rounded-lg px-2 py-2 text-sm font-inter outline-none"
              style={{
                backgroundColor: 'rgba(255,255,255,0.08)',
                color: 'white',
                border: `1px solid rgba(211,169,113,0.2)`,
              }}
            />
            <button
              onClick={() => { if (manualZip.length === 5) onSelectZip(manualZip); }}
              disabled={manualZip.length !== 5}
              className="px-3 rounded-lg text-xs font-montserrat font-medium disabled:opacity-30"
              style={{ backgroundColor: BRAND.colors.accent, color: BRAND.colors.primary }}
            >
              Go
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center py-8">
          <Loader2 size={28} className="animate-spin mb-3" style={{ color: BRAND.colors.accent }} />
          <p className="text-xs text-white/50 font-inter">Searching market data...</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}>
          <p className="text-sm text-red-400 font-inter">{error}</p>
        </div>
      )}

      {/* Market Data */}
      {marketData && !loading && (
        <div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <MetricCard label="Median Price" value={formatPrice(marketData.median_price)} />
            <MetricCard label="Avg Days on Market" value={marketData.avg_dom !== null ? String(marketData.avg_dom) : '--'} />
            <MetricCard label="Homes Sold (30d)" value={marketData.homes_sold !== null ? String(marketData.homes_sold) : '--'} />
            <MetricCard label="New Listings" value={marketData.new_listings !== null ? String(marketData.new_listings) : '--'} />
            <MetricCard label="Inventory" value={marketData.inventory_level !== null ? String(marketData.inventory_level) : '--'} />
            <MetricCard label="List-to-Sale" value={formatRatio(marketData.list_to_sale_ratio)} />
          </div>

          {marketData.market_summary && (
            <div
              className="p-3 rounded-lg mb-3"
              style={{ backgroundColor: 'rgba(211,169,113,0.08)', border: '1px solid rgba(211,169,113,0.15)' }}
            >
              <p className="text-xs text-white/70 font-inter">{marketData.market_summary}</p>
            </div>
          )}

          <div className="text-[10px] text-white/30 font-inter text-center">
            {marketData.data_source && `Data from ${marketData.data_source}`}
            {marketData.fetched_at && ` - Updated ${new Date(marketData.fetched_at).toLocaleDateString()}`}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!selectedZip && !loading && (
        <div className="text-center py-8">
          <TrendingUp size={32} className="mx-auto mb-3 opacity-30" style={{ color: BRAND.colors.accent }} />
          <p className="text-sm text-white/50 font-inter">
            Select a zip code to view market intelligence
          </p>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="p-3 rounded-lg"
      style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(211,169,113,0.1)' }}
    >
      <p
        className="text-lg font-bold font-montserrat"
        style={{ color: BRAND.colors.accent }}
      >
        {value}
      </p>
      <p className="text-[10px] text-white/40 font-inter mt-0.5">{label}</p>
    </div>
  );
}

function BuyerZonesTab({
  buyers,
  onSelectBuyer,
}: {
  buyers: MapContactData[];
  onSelectBuyer: (c: MapContactData) => void;
}) {
  if (buyers.length === 0) {
    return (
      <div className="p-6 text-center">
        <Target size={32} className="mx-auto mb-3 opacity-30" style={{ color: BRAND.colors.accent }} />
        <p className="text-sm text-white/50 font-inter">
          No active buyer searches right now
        </p>
      </div>
    );
  }

  // Group buyers by target area (city or zip)
  const buyersByArea = buyers.reduce<Record<string, MapContactData[]>>((acc, b) => {
    const key = b.city || b.zipCode || 'DFW Area';
    if (!acc[key]) acc[key] = [];
    acc[key].push(b);
    return acc;
  }, {});

  return (
    <div className="p-3">
      {Object.entries(buyersByArea).sort((a, b) => b[1].length - a[1].length).map(([area, areaBuyers]) => (
        <div key={area} className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Target size={12} style={{ color: BRAND.colors.accent }} />
            <span className="text-xs font-montserrat font-bold text-white/80">{area}</span>
            <span className="text-[10px] text-white/30 font-inter">
              {areaBuyers.length} buyer{areaBuyers.length !== 1 ? 's' : ''}
            </span>
          </div>

          {areaBuyers.map(buyer => (
            <button
              key={buyer.id}
              onClick={() => onSelectBuyer(buyer)}
              className="w-full flex items-center gap-3 p-2 ml-2 rounded-lg hover:bg-white/5 transition-colors text-left"
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: PIN_COLORS.active_buyer.fill }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-montserrat font-medium text-white truncate">
                  {buyer.firstName} {buyer.lastName}
                </p>
                <p className="text-[11px] text-white/40 font-inter truncate">
                  {buyer.address || 'Searching in ' + area}
                </p>
              </div>
              {buyer.deal && (
                <span className="text-[10px] text-white/30 font-inter flex-shrink-0">
                  {buyer.deal.status.replace('_', ' ')}
                </span>
              )}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
