'use client';

import { useState, useRef, useEffect } from 'react';

interface AddressComponents {
  street: string;
  city: string;
  state: string;
  zip: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (components: AddressComponents) => void;
  onRawChange?: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

declare global {
  interface Window {
    google?: {
      maps: {
        places: {
          Autocomplete: new (
            input: HTMLInputElement,
            opts?: Record<string, unknown>
          ) => GoogleAutocomplete;
        };
      };
    };
    __googleMapsLoaded?: boolean;
    __googleMapsCallbacks?: Array<() => void>;
    __googleMapsPacStyled?: boolean;
  }
}

interface GoogleAutocomplete {
  addListener: (event: string, handler: () => void) => void;
  getPlace: () => {
    address_components?: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
    formatted_address?: string;
  };
}

function loadGoogleMaps(apiKey: string): Promise<void> {
  return new Promise((resolve) => {
    if (window.__googleMapsLoaded && window.google?.maps?.places) {
      resolve();
      return;
    }

    if (window.__googleMapsCallbacks) {
      window.__googleMapsCallbacks.push(resolve);
      return;
    }

    window.__googleMapsCallbacks = [resolve];

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.__googleMapsLoaded = true;
      const callbacks = window.__googleMapsCallbacks || [];
      window.__googleMapsCallbacks = undefined;
      callbacks.forEach((cb) => cb());
    };
    document.head.appendChild(script);
  });
}

function ensurePacStyles() {
  if (window.__googleMapsPacStyled) return;
  window.__googleMapsPacStyled = true;
  const style = document.createElement('style');
  style.textContent = `.pac-container { z-index: 99999 !important; }`;
  document.head.appendChild(style);
}

function parsePlace(place: ReturnType<GoogleAutocomplete['getPlace']>): AddressComponents {
  const components = place.address_components || [];
  let streetNumber = '';
  let route = '';
  let city = '';
  let state = '';
  let zip = '';

  for (const component of components) {
    const types = component.types;
    if (types.includes('street_number')) streetNumber = component.long_name;
    else if (types.includes('route')) route = component.long_name;
    else if (types.includes('locality')) city = component.long_name;
    else if (types.includes('sublocality_level_1') && !city) city = component.long_name;
    else if (types.includes('administrative_area_level_1')) state = component.short_name;
    else if (types.includes('postal_code')) zip = component.long_name;
  }

  const street = streetNumber ? `${streetNumber} ${route}` : route;
  return { street, city, state, zip };
}

export function AddressAutocomplete({
  value,
  onChange,
  onRawChange,
  label,
  placeholder = 'Start typing an address...',
  disabled = false,
  className,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<GoogleAutocomplete | null>(null);
  const onChangeRef = useRef(onChange);
  const onRawChangeRef = useRef(onRawChange);
  const [loaded, setLoaded] = useState(false);
  const [internalValue, setInternalValue] = useState(value);
  const googleSelectedRef = useRef(false);

  // Keep refs current without re-initializing autocomplete
  onChangeRef.current = onChange;
  onRawChangeRef.current = onRawChange;

  // Sync external value changes into internal state
  // but not when Google just set the value
  useEffect(() => {
    if (!googleSelectedRef.current) {
      setInternalValue(value);
    }
  }, [value]);

  // Load Google Maps once
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setLoaded(true);
      return;
    }
    loadGoogleMaps(apiKey).then(() => {
      setLoaded(true);
    });
  }, []);

  // Initialize autocomplete once when loaded and input is ready
  useEffect(() => {
    if (!loaded || !inputRef.current || autocompleteRef.current) return;
    if (!window.google?.maps?.places) return;

    ensurePacStyles();

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'us' },
      types: ['address'],
      fields: ['address_components', 'formatted_address'],
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.address_components) {
        const parsed = parsePlace(place);
        const formatted = place.formatted_address || parsed.street;

        // Mark that Google just set the value so we don't
        // let the external value prop override it
        googleSelectedRef.current = true;
        setInternalValue(formatted);

        // Call the parent callbacks via refs (always current)
        onRawChangeRef.current?.(parsed.street);
        onChangeRef.current(parsed);

        // Reset the flag after React has had time to process
        setTimeout(() => {
          googleSelectedRef.current = false;
        }, 500);
      }
    });

    autocompleteRef.current = autocomplete;
  }, [loaded]);

  const inputClassName = className || `
    w-full px-4 py-2.5 rounded-[8px]
    bg-white dark:bg-dark-card
    border border-gold/15
    text-navy dark:text-white
    font-inter text-sm
    placeholder:text-navy/40 dark:placeholder:text-white/40
    focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold
    transition-all duration-200 ease-in-out
    disabled:opacity-50 disabled:cursor-not-allowed
  `.replace(/\n\s+/g, ' ').trim();

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-montserrat font-medium text-navy dark:text-white mb-1.5">
          {label}
        </label>
      )}
      <input
        ref={inputRef}
        type="text"
        value={internalValue}
        onChange={(e) => {
          googleSelectedRef.current = false;
          setInternalValue(e.target.value);
          onRawChangeRef.current?.(e.target.value);
        }}
        placeholder={placeholder}
        disabled={disabled}
        className={inputClassName}
        autoComplete="off"
      />
    </div>
  );
}
