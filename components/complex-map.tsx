'use client';

import { useEffect, useRef, useState } from 'react';
import type * as Leaflet from 'leaflet';

import type { ComplexSummary } from '@/lib/marketplace';
import { formatPriceMillions } from '@/lib/marketplace';

type ComplexMapProps = {
  items: ComplexSummary[];
  selectedId: string | null;
  onSelect: (complex: ComplexSummary) => void;
};

function markerIcon(library: typeof Leaflet, item: ComplexSummary, selected: boolean) {
  return library.divIcon({
    className: 'estate-map-marker-wrapper',
    html: `<span class="estate-map-marker${selected ? ' selected' : ''}">${formatPriceMillions(item.priceFrom)}</span>`,
    iconSize: [76, 34],
    iconAnchor: [38, 17],
  });
}

export function ComplexMap({ items, selectedId, onSelect }: ComplexMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const markersRef = useRef(new Map<string, Leaflet.Marker>());
  const [library, setLibrary] = useState<typeof Leaflet | null>(null);

  useEffect(() => {
    let active = true;
    void import('leaflet').then((module) => {
      if (active) setLibrary(module);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!library || !containerRef.current || mapRef.current) return;
    const container = containerRef.current;
    const map = library.map(container, {
      center: [39.6542, 66.9597],
      zoom: 12,
      minZoom: 10,
      maxZoom: 18,
      zoomControl: false,
      scrollWheelZoom: false,
      touchZoom: true,
    });
    library.control.zoom({ position: 'topright' }).addTo(map);
    library.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    const markers = markersRef.current;
    let lastPinchZoom = 0;
    const handleTrackpadPinch = (event: WheelEvent) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      const now = performance.now();
      if (now - lastPinchZoom < 90) return;
      lastPinchZoom = now;
      const direction = event.deltaY < 0 ? 1 : -1;
      const nextZoom = Math.min(map.getMaxZoom(), Math.max(map.getMinZoom(), map.getZoom() + direction));
      map.setZoomAround(map.mouseEventToContainerPoint(event), nextZoom, { animate: true });
    };
    container.addEventListener('wheel', handleTrackpadPinch, { passive: false });
    const observer = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    observer.observe(container);
    return () => {
      container.removeEventListener('wheel', handleTrackpadPinch);
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      markers.clear();
    };
  }, [library]);

  useEffect(() => {
    if (!library || !mapRef.current) return;
    const map = mapRef.current;
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    const points: Leaflet.LatLngExpression[] = [];
    for (const item of items) {
      const point: Leaflet.LatLngExpression = [item.latitude, item.longitude];
      points.push(point);
      const marker = library.marker(point, {
        icon: markerIcon(library, item, false),
        keyboard: true,
        title: `${item.name}, от ${formatPriceMillions(item.priceFrom)} сум`,
        riseOnHover: true,
      }).addTo(map);
      marker.on('click', () => {
        onSelect(item);
        map.panTo(point, { animate: true });
      });
      markersRef.current.set(item.id, marker);
    }

    if (points.length === 1) map.setView(points[0], 14, { animate: true });
    if (points.length > 1) map.fitBounds(library.latLngBounds(points).pad(0.18), { maxZoom: 13, animate: true });
  }, [items, library, onSelect]);

  useEffect(() => {
    if (!library) return;
    for (const item of items) {
      markersRef.current.get(item.id)?.setIcon(markerIcon(library, item, selectedId === item.id));
    }
  }, [items, library, selectedId]);

  return <div ref={containerRef} className="complex-leaflet-map" aria-label="Карта жилых комплексов Самарканда" />;
}
