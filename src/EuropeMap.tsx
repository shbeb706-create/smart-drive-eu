import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface GpsPosition {
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
  accuracy: number;
}

interface TrafficPoint {
  lat: number;
  lng: number;
  congestion_level: number;
  average_speed_kmh: number;
  flow_type: string;
  road_name: string;
}

interface AutobahnSegment {
  id: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
  speed_limit: number | null;
  has_speed_limit: boolean;
  advisory_speed: number;
  lanes: number;
  traffic_density: string;
  route_coords: Array<[number, number]>;
}

interface Baustelle {
  id: string;
  autobahn: string;
  description: string;
  lat: number;
  lng: number;
  severity: string;
  speed_limit: number;
  delay_minutes: number;
  active: boolean;
}

interface EuropeMapProps {
  className?: string;
  onMapReady?: (map: L.Map) => void;
  markers?: Array<{ lat: number; lng: number; label: string }>;
  route?: Array<{ lat: number; lng: number }>;
  gpsPosition?: GpsPosition | null;
  showGps?: boolean;
  interactive?: boolean;
  centerOnGps?: boolean;
  followMode?: 'none' | 'follow' | 'heading';
  trafficHeatmap?: TrafficPoint[];
  showTrafficHeatmap?: boolean;
  autobahnSegments?: AutobahnSegment[];
  showAutobahnSegments?: boolean;
  baustellen?: Baustelle[];
  showBaustellen?: boolean;
  routeProgress?: number;
  showRouteProgress?: boolean;
}

const EUROPE_CENTER: L.LatLngExpression = [50.11, 10.45];
const EUROPE_ZOOM = 5;

const DARK_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const DARK_TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';

const FLOW_COLORS: Record<string, { color: string; radius: number }> = {
  free: { color: '#00e676', radius: 8000 },
  moderate: { color: '#ffc107', radius: 10000 },
  heavy: { color: '#ff5252', radius: 12000 },
  standstill: { color: '#d50000', radius: 15000 },
};

export default function EuropeMap({
  className = '',
  onMapReady,
  markers = [],
  route = [],
  gpsPosition = null,
  showGps = false,
  interactive = true,
  centerOnGps = false,
  followMode = 'none',
  trafficHeatmap = [],
  showTrafficHeatmap = false,
  autobahnSegments = [],
  showAutobahnSegments = false,
  baustellen = [],
  showBaustellen = false,
  routeProgress = 0,
  showRouteProgress = false,
}: EuropeMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const gpsMarkerRef = useRef<L.Marker | null>(null);
  const gpsAccuracyRef = useRef<L.Circle | null>(null);
  const gpsTrailRef = useRef<L.Polyline | null>(null);
  const gpsTrailCoords = useRef<Array<[number, number]>>([]);
  const trafficLayerRef = useRef<L.LayerGroup | null>(null);
  const autobahnLayerRef = useRef<L.LayerGroup | null>(null);
  const baustelleLayerRef = useRef<L.LayerGroup | null>(null);
  const routeCompletedRef = useRef<L.Polyline | null>(null);
  const lastFollowUpdate = useRef(0);

  function createVehicleIcon(heading: number, speed: number): L.DivIcon {
    const isMoving = speed > 5;
    const glowIntensity = Math.min(1, speed / 150);
    return L.divIcon({
      className: 'vehicle-marker',
      html: `<div style="position:relative;width:48px;height:48px;transform:rotate(${heading}deg);">${isMoving ? `<div style="position:absolute;inset:-8px;border-radius:50%;background:radial-gradient(circle,rgba(0,229,255,${0.08 * glowIntensity}) 0%,transparent 70%);animation:vehicle-glow 1.5s ease-in-out infinite;"></div>` : ''}<div style="position:absolute;inset:0;border-radius:50%;background:rgba(0,229,255,0.06);"></div><div style="position:absolute;inset:8px;border-radius:50%;background:rgba(0,229,255,0.12);border:1px solid rgba(0,229,255,0.2);"></div><div style="position:absolute;inset:14px;border-radius:50%;background:#00e5ff;border:2.5px solid #fff;box-shadow:0 0 16px rgba(0,229,255,0.6),0 0 32px rgba(0,229,255,0.2);"></div><div style="position:absolute;top:2px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-bottom:12px solid #00e5ff;filter:drop-shadow(0 0 6px rgba(0,229,255,0.8));"></div></div>`,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
    });
  }

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: EUROPE_CENTER,
      zoom: EUROPE_ZOOM,
      zoomControl: false,
      attributionControl: false,
      dragging: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      touchZoom: interactive,
    });

    L.tileLayer(DARK_TILE_URL, {
      attribution: DARK_TILE_ATTR,
      maxZoom: 18,
    }).addTo(map);

    L.control.attribution({ position: 'bottomright', prefix: false }).addTo(map);

    trafficLayerRef.current = L.layerGroup().addTo(map);
    autobahnLayerRef.current = L.layerGroup().addTo(map);
    baustelleLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    onMapReady?.(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update markers and route
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        if (
          layer !== gpsMarkerRef.current &&
          layer !== gpsTrailRef.current
        ) {
          if (!trafficLayerRef.current?.hasLayer(layer) &&
              !autobahnLayerRef.current?.hasLayer(layer) &&
              !baustelleLayerRef.current?.hasLayer(layer)) {
            map.removeLayer(layer);
          }
        }
      }
      if (layer instanceof L.Circle && layer === gpsAccuracyRef.current) {
        return;
      }
    });

    const icon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="width:12px;height:12px;background:#00e5ff;border-radius:50%;box-shadow:0 0 12px #00e5ff,0 0 24px rgba(0,229,255,0.3);border:2px solid #fff;"></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    });

    markers.forEach(({ lat, lng, label }) => {
      L.marker([lat, lng], { icon })
        .addTo(map)
        .bindPopup(`<div style="color:#111;font-family:system-ui;font-size:13px;">${label}</div>`);
    });

    if (route.length > 1) {
      L.polyline(route, {
        color: '#00e5ff',
        weight: 12,
        opacity: 0.12,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      L.polyline(route, {
        color: '#00e5ff',
        weight: 6,
        opacity: 0.3,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      L.polyline(route, {
        color: '#00e5ff',
        weight: 3,
        opacity: 0.9,
        dashArray: '16 8',
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      const startIcon = L.divIcon({
        className: 'route-start',
        html: `<div style="width:16px;height:16px;background:#00e676;border-radius:50%;box-shadow:0 0 10px #00e676,0 0 20px rgba(0,230,118,0.3);border:2px solid #fff;"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      const endIcon = L.divIcon({
        className: 'route-end',
        html: `<div style="width:16px;height:16px;background:#ff5252;border-radius:50%;box-shadow:0 0 10px #ff5252,0 0 20px rgba(255,82,82,0.3);border:2px solid #fff;"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      L.marker(route[0], { icon: startIcon }).addTo(map);
      L.marker(route[route.length - 1], { icon: endIcon }).addTo(map);

      // Completed route overlay
      if (showRouteProgress && routeProgress > 0) {
        const completedIdx = Math.floor(routeProgress * (route.length - 1));
        const completedRoute = route.slice(0, completedIdx + 1);
        if (routeCompletedRef.current) map.removeLayer(routeCompletedRef.current);
        routeCompletedRef.current = L.polyline(completedRoute, { color: '#00e5ff', weight: 5, opacity: 0.8, lineCap: 'round', lineJoin: 'round' }).addTo(map);
      }
    }
  }, [markers, route, routeProgress, showRouteProgress]);

  // Traffic heatmap overlay
  useEffect(() => {
    const layer = trafficLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (!showTrafficHeatmap || trafficHeatmap.length === 0) return;

    trafficHeatmap.forEach((point) => {
      const config = FLOW_COLORS[point.flow_type] || FLOW_COLORS.moderate;
      const opacity = 0.15 + point.congestion_level * 0.35;

      L.circle([point.lat, point.lng], {
        radius: config.radius,
        color: config.color,
        fillColor: config.color,
        fillOpacity: opacity,
        weight: 0,
        opacity: 0,
      }).addTo(layer);

      // Inner brighter core
      L.circle([point.lat, point.lng], {
        radius: config.radius * 0.4,
        color: config.color,
        fillColor: config.color,
        fillOpacity: opacity * 1.5,
        weight: 0,
        opacity: 0,
      }).addTo(layer);
    });
  }, [trafficHeatmap, showTrafficHeatmap]);

  // Autobahn segments overlay
  useEffect(() => {
    const layer = autobahnLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (!showAutobahnSegments || autobahnSegments.length === 0) return;

    const densityColors: Record<string, string> = {
      low: '#00e676',
      moderate: '#ffc107',
      high: '#ff5252',
      standstill: '#d50000',
    };

    autobahnSegments.forEach((segment) => {
      const coords = segment.route_coords;
      if (!coords || coords.length < 2) return;

      const color = densityColors[segment.traffic_density] || '#00e5ff';

      // Outer glow
      L.polyline(coords as L.LatLngExpression[], {
        color,
        weight: 8,
        opacity: 0.15,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(layer);

      // Core line
      L.polyline(coords as L.LatLngExpression[], {
        color,
        weight: 3,
        opacity: 0.7,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: segment.has_speed_limit ? '8 4' : undefined,
      }).addTo(layer);

      // Speed limit marker at center
      const centerIdx = Math.floor(coords.length / 2);
      const center = coords[centerIdx];
      if (center) {
        const speedIcon = L.divIcon({
          className: 'autobahn-speed',
          html: segment.has_speed_limit
            ? `<div style="width:24px;height:24px;border-radius:50%;background:#ff5252;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 0 8px rgba(255,82,82,0.5);"><span style="color:#fff;font-size:8px;font-weight:700;font-family:system-ui;">${segment.speed_limit}</span></div>`
            : `<div style="width:24px;height:24px;border-radius:50%;border:2px solid rgba(255,255,255,0.3);display:flex;align-items:center;justify-content:center;box-shadow:0 0 8px rgba(0,229,255,0.3);"><span style="color:rgba(255,255,255,0.5);font-size:10px;font-weight:700;font-family:system-ui;">∞</span></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });
        L.marker(center, { icon: speedIcon, interactive: false }).addTo(layer);
      }
    });
  }, [autobahnSegments, showAutobahnSegments]);

  // Baustellen markers
  useEffect(() => {
    const layer = baustelleLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (!showBaustellen || baustellen.length === 0) return;

    const severityColors: Record<string, string> = {
      minor: '#ffc107',
      moderate: '#ff9800',
      major: '#ff5252',
    };

    baustellen.filter((b) => b.active).forEach((baustelle) => {
      const color = severityColors[baustelle.severity] || '#ff9800';

      // Warning zone circle
      L.circle([baustelle.lat, baustelle.lng], {
        radius: 5000,
        color,
        fillColor: color,
        fillOpacity: 0.08,
        weight: 1,
        opacity: 0.3,
        dashArray: '4 4',
      }).addTo(layer);

      // Baustelle icon
      const icon = L.divIcon({
        className: 'baustelle-marker',
        html: `<div style="width:28px;height:28px;border-radius:6px;background:${color}20;border:1.5px solid ${color}60;display:flex;align-items:center;justify-content:center;box-shadow:0 0 12px ${color}40;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      L.marker([baustelle.lat, baustelle.lng], { icon })
        .addTo(layer)
        .bindPopup(`
          <div style="font-family:system-ui;color:#fff;background:#12121a;padding:8px;border-radius:8px;min-width:160px;">
            <div style="font-size:12px;font-weight:600;margin-bottom:4px;">${baustelle.autobahn} Baustelle</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:6px;">${baustelle.description}</div>
            <div style="display:flex;gap:8px;font-size:10px;color:rgba(255,255,255,0.4);">
              <span>${baustelle.speed_limit} km/h</span>
              <span>+${baustelle.delay_minutes} min</span>
            </div>
          </div>
        `);
    });
  }, [baustellen, showBaustellen]);

  // Update GPS marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !showGps || !gpsPosition) return;

    const pos: L.LatLngExpression = [gpsPosition.lat, gpsPosition.lng];
    const heading = gpsPosition.heading ?? 0;
    const speed = gpsPosition.speed ?? 0;

    if (!gpsMarkerRef.current) {
      const gpsIcon = createVehicleIcon(heading, speed);
      gpsMarkerRef.current = L.marker(pos, { icon: gpsIcon, zIndexOffset: 1000 }).addTo(map);
      gpsAccuracyRef.current = L.circle(pos, { radius: gpsPosition.accuracy, color: '#00e5ff', fillColor: '#00e5ff', fillOpacity: 0.04, weight: 1, opacity: 0.15 }).addTo(map);
      gpsTrailRef.current = L.polyline([], { color: '#00e5ff', weight: 2, opacity: 0.4, dashArray: '4 4' }).addTo(map);
      if (centerOnGps || followMode !== 'none') { map.setView(pos, 16, { animate: true, duration: 1.5 }); }
    } else {
      gpsMarkerRef.current.setLatLng(pos);
      gpsMarkerRef.current.setIcon(createVehicleIcon(heading, speed));
      if (gpsAccuracyRef.current) { gpsAccuracyRef.current.setLatLng(pos); gpsAccuracyRef.current.setRadius(gpsPosition.accuracy); }
      gpsTrailCoords.current.push([gpsPosition.lat, gpsPosition.lng]);
      if (gpsTrailCoords.current.length > 120) gpsTrailCoords.current.shift();
      if (gpsTrailRef.current) { gpsTrailRef.current.setLatLngs(gpsTrailCoords.current); }

      const now = Date.now();
      if (followMode !== 'none' && now - lastFollowUpdate.current > 500) {
        lastFollowUpdate.current = now;
        if (followMode === 'heading') {
          const offsetLat = gpsPosition.lat - 0.003 * Math.cos((heading * Math.PI) / 180);
          const offsetLng = gpsPosition.lng - 0.003 * Math.sin((heading * Math.PI) / 180);
          map.panTo([offsetLat, offsetLng], { animate: true, duration: 0.5 });
        } else {
          map.panTo(pos, { animate: true, duration: 0.5 });
        }
      } else if (centerOnGps) {
        map.panTo(pos, { animate: true, duration: 0.8 });
      }
    }
  }, [gpsPosition, showGps, centerOnGps, followMode]);

  return (
    <>
      <style>{`
        @keyframes gps-pulse {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes vehicle-glow {
          0% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.3); opacity: 0.3; }
          100% { transform: scale(1); opacity: 0.6; }
        }
        .leaflet-popup-content-wrapper {
          background: rgba(18, 18, 26, 0.95) !important;
          border-radius: 12px !important;
          border: 1px solid rgba(255,255,255,0.06) !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5) !important;
        }
        .leaflet-popup-content {
          margin: 0 !important;
        }
        .leaflet-popup-tip {
          background: rgba(18, 18, 26, 0.95) !important;
        }
        .leaflet-popup-close-button {
          color: rgba(255,255,255,0.3) !important;
        }
      `}</style>
      <div
        ref={mapRef}
        className={`w-full h-full ${className}`}
        style={{ background: '#0a0a0f' }}
      />
    </>
  );
}
