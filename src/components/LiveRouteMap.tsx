import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, Truck, ShieldCheck, AlertTriangle, Play, RefreshCw, X, Check, Search, 
  Map, Compass, Navigation, ExternalLink, Calendar, User, ShoppingBag, Weight, Eye
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Shipment, Driver } from '../types';

// Let's declare window interface for Leaflet global
declare global {
  interface Window {
    L: any;
  }
}

// Coordinates mapping for major Israeli cities
export const CITY_COORDS: Record<string, [number, number]> = {
  'קריית שמונה': [33.2078, 35.5701],
  'חצור הגלילית': [32.9814, 35.5411],
  'צפת': [32.9646, 35.4960],
  'טבריה': [32.7922, 35.5312],
  'עכו': [32.9262, 35.0835],
  'חיפה': [32.7940, 34.9896],
  'נצרת': [32.6996, 35.3035],
  'עפולה': [32.6074, 35.2892],
  'חדרה': [32.4340, 34.9197],
  'נתניה': [32.3215, 34.8532],
  'הרצליה': [32.1624, 34.8447],
  'רעננה': [32.1848, 34.8713],
  'כפר סבא': [32.1750, 34.9069],
  'תל אביב': [32.0853, 34.7818],
  'תל אביב-יפו': [32.0853, 34.7818],
  'רמת גן': [32.0684, 34.8248],
  'גבעתיים': [32.0722, 34.8125],
  'בני ברק': [32.0833, 34.8333],
  'חולון': [32.0158, 34.7874],
  'בת ים': [32.0167, 34.7500],
  'ראשון לציון': [31.9730, 34.7925],
  'פתח תקווה': [32.0840, 34.8878],
  'לוד': [31.9510, 34.8881],
  'רמלה': [31.9275, 34.8642],
  'רחובות': [31.8928, 34.8113],
  'נס ציונה': [31.9250, 34.7981],
  'ירושלים': [31.7683, 35.2137],
  'בית שמש': [31.7456, 34.9867],
  'מודיעין': [31.9077, 35.0069],
  'אשדוד': [31.8044, 34.6553],
  'אשקלון': [31.6688, 34.5743],
  'קרית גת': [31.6031, 34.7639],
  'באר שבע': [31.2529, 34.7915],
  'נתיבות': [31.4222, 34.5886],
  'שדרות': [31.5247, 34.5953],
  'אופקים': [31.3144, 34.6214],
  'דימונה': [31.0691, 35.0342],
  'ערד': [31.2611, 35.2149],
  'מצפה רמון': [30.6078, 34.8028],
  'אילת': [29.5577, 34.9519],
};

// Default coordinates in case a city lookup fails (Tel Aviv center)
const DEFAULT_COORDS: [number, number] = [32.0853, 34.7818];

// Leaflet CDN injection Promise
let leafletPromise: Promise<any> | null = null;
const loadLeafletCDN = (): Promise<any> => {
  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise((resolve, reject) => {
    if (window.L) {
      resolve(window.L);
      return;
    }

    const existingScript = document.getElementById('leaflet-js-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.L));
      existingScript.addEventListener('error', (err) => reject(err));
      return;
    }

    // Add CSS
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    css.id = 'leaflet-css-style';
    document.head.appendChild(css);

    // Add JS
    const js = document.createElement('script');
    js.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    js.id = 'leaflet-js-script';
    js.onload = () => resolve(window.L);
    js.onerror = (err) => reject(err);
    document.body.appendChild(js);
  });

  return leafletPromise;
};

interface LiveRouteMapProps {
  shipments: Shipment[];
  drivers: Driver[];
}

export default function LiveRouteMap({ shipments, drivers }: LiveRouteMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);
  const routesGroupRef = useRef<any>(null);

  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapStyle, setMapStyle] = useState<'dark' | 'light' | 'street'>('dark');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isSimulationActive, setIsSimulationActive] = useState(true);

  // Helper to get coords with tiny jitter to avoid exact overlaps
  const getCityCoords = (cityName: string, index: number = 0): [number, number] => {
    const base = CITY_COORDS[cityName.trim()] || DEFAULT_COORDS;
    if (index === 0) return [base[0], base[1]];
    // Add micro jitter
    const jitter = 0.005 * Math.sin(index * 45);
    return [base[0] + jitter, base[1] + (0.005 * Math.cos(index * 45))];
  };

  // Interpolate coordinates along the line based on percentage progress
  const getInterpolatedCoords = (start: [number, number], end: [number, number], progress: number = 50): [number, number] => {
    const fraction = Math.min(Math.max(progress, 0), 100) / 100;
    return [
      start[0] + (end[0] - start[0]) * fraction,
      start[1] + (end[1] - start[1]) * fraction
    ];
  };

  // Initialize Leaflet Map
  useEffect(() => {
    let active = true;
    loadLeafletCDN()
      .then((L) => {
        if (!active || !mapContainerRef.current) return;

        // If map already initialized, remove old one
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
        }

        // Standard center around central Israel
        const map = L.map(mapContainerRef.current, {
          center: [32.0853, 34.7818],
          zoom: 8,
          zoomControl: false // custom placement later
        });

        mapInstanceRef.current = map;

        // Add standard zoom control at bottom right
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // Define Tile Layer based on style choice
        let tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'; // Dark standard
        let attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

        if (mapStyle === 'light') {
          tileUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
        } else if (mapStyle === 'street') {
          tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        }

        L.tileLayer(tileUrl, { attribution }).addTo(map);

        // Add subgroups for markers and lines
        markersGroupRef.current = L.featureGroup().addTo(map);
        routesGroupRef.current = L.featureGroup().addTo(map);

        setIsMapLoaded(true);
      })
      .catch((err) => {
        console.error('Failed to load Leaflet from CDN:', err);
      });

    return () => {
      active = false;
    };
  }, [mapStyle]);

  // Update map contents when shipments or drivers update
  useEffect(() => {
    if (!isMapLoaded || !mapInstanceRef.current || !window.L) return;

    const L = window.L;
    const markersGroup = markersGroupRef.current;
    const routesGroup = routesGroupRef.current;

    // Clear previous elements
    markersGroup.clearLayers();
    routesGroup.clearLayers();

    // 1. Plot all Active Shipments, routes, and trucks
    shipments.forEach((shipment, index) => {
      // Filter if search term is active
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesSearch = 
          shipment.trackingNumber.toLowerCase().includes(query) ||
          shipment.customerName.toLowerCase().includes(query) ||
          shipment.origin.toLowerCase().includes(query) ||
          shipment.destination.toLowerCase().includes(query) ||
          (shipment.driverName || '').toLowerCase().includes(query);
        if (!matchesSearch) return;
      }

      const startCoords = getCityCoords(shipment.origin, index + 1);
      const endCoords = getCityCoords(shipment.destination, index + 5);

      // Determine colors based on status
      let routeColor = '#64748b'; // pending
      let statusLabel = 'ממתין לשינוע';
      let statusColorClass = 'text-slate-400 bg-slate-900/80';
      
      if (shipment.status === 'in_transit') {
        routeColor = '#ff7f00'; // busy active orange
        statusLabel = 'בדרך ליעד';
        statusColorClass = 'text-[#ff7f00] bg-orange-500/10 border-orange-500/20';
      } else if (shipment.status === 'delivered') {
        routeColor = '#10b981'; // green
        statusLabel = 'נמסר בהצלחה';
        statusColorClass = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      } else if (shipment.status === 'delayed') {
        routeColor = '#ef4444'; // red
        statusLabel = 'בעיכוב';
        statusColorClass = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      }

      // Draw Route Polyline on map
      const lineOptions = {
        color: routeColor,
        weight: shipment.status === 'in_transit' ? 4 : 2,
        opacity: shipment.status === 'in_transit' ? 0.9 : 0.6,
        dashArray: shipment.status === 'pending' ? '4, 4' : null
      };

      const polyline = L.polyline([startCoords, endCoords], lineOptions).addTo(routesGroup);

      // Bind basic info tooltip to the route line
      polyline.bindTooltip(
        `<div class="text-right" dir="rtl">
          <strong class="text-[#ff7f00]">${shipment.trackingNumber}</strong><br/>
          <span>${shipment.origin} ➔ ${shipment.destination}</span>
         </div>`, 
        { sticky: true }
      );

      // Add Origin Marker (Custom HTML style icon)
      const originIcon = L.divIcon({
        className: 'custom-origin-marker',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-5 h-5 bg-sky-500/20 rounded-full"></div>
            <div class="w-3.5 h-3.5 bg-sky-500 border border-white rounded-full flex items-center justify-center shadow-md">
              <div class="w-1 h-1 bg-white rounded-full"></div>
            </div>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const originMarker = L.marker(startCoords, { icon: originIcon }).addTo(markersGroup);
      originMarker.bindPopup(
        `<div class="text-right font-sans p-1" dir="rtl">
          <strong class="text-slate-800 text-xs block">נקודת מוצא: ${shipment.origin}</strong>
          <span class="text-[10px] text-slate-500 block mt-0.5">לקוח: ${shipment.customerName}</span>
          <span class="text-[10px] text-slate-500 block">מספר מעקב: ${shipment.trackingNumber}</span>
         </div>`
      );

      // Add Destination Marker (checkered/pin)
      const destIcon = L.divIcon({
        className: 'custom-dest-marker',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-5 h-5 bg-emerald-500/20 rounded-full"></div>
            <div class="w-3.5 h-3.5 bg-emerald-500 border border-white rounded-md flex items-center justify-center shadow-md rotate-45">
              <div class="w-1 h-1 bg-white rounded-full -rotate-45"></div>
            </div>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const destMarker = L.marker(endCoords, { icon: destIcon }).addTo(markersGroup);
      destMarker.bindPopup(
        `<div class="text-right font-sans p-1" dir="rtl">
          <strong class="text-slate-800 text-xs block">יעד מסירה: ${shipment.destination}</strong>
          <span class="text-[10px] text-slate-500 block mt-0.5">לקוח: ${shipment.customerName}</span>
          <span class="text-[10px] text-slate-500 block">סוג מטען: ${shipment.cargoType}</span>
         </div>`
      );

      // 2. Plot sliding TRUCK marker if IN TRANSIT
      if (shipment.status === 'in_transit') {
        // Find assigned driver to get simulated progress, default to 50%
        const assignedDriver = drivers.find(d => d.id === shipment.driverId);
        const progress = assignedDriver?.progress ?? 45;

        const truckCoords = getInterpolatedCoords(startCoords, endCoords, progress);

        // Breathtaking custom rotating/pulsing Truck SVG Marker
        const truckIcon = L.divIcon({
          className: 'custom-truck-animated-marker',
          html: `
            <div class="relative flex items-center justify-center">
              <div class="absolute w-8 h-8 bg-orange-500/30 rounded-full animate-ping"></div>
              <div class="relative w-6 h-6 bg-[#ff7f00] border-2 border-white rounded-full flex items-center justify-center shadow-lg transition-transform duration-500">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="w-3.5 h-3.5 text-white">
                  <rect x="1" y="3" width="15" height="13" rx="2" ry="2" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
              </div>
              <div class="absolute -bottom-6 bg-slate-950/95 text-white font-mono text-[8px] font-black px-1.5 py-0.5 rounded border border-orange-500/40 whitespace-nowrap">
                ${progress}%
              </div>
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        const truckMarker = L.marker(truckCoords, { icon: truckIcon }).addTo(markersGroup);

        // Build premium detailed Hebrew layout for the interactive popup
        const customPopupHTML = `
          <div class="text-right font-sans p-2 select-none w-52 text-slate-100" dir="rtl">
            <div class="flex items-center justify-between pb-1.5 border-b border-slate-700/50 mb-2">
              <span class="text-[10px] bg-orange-500/20 text-[#ff7f00] px-1.5 py-0.5 rounded font-mono font-bold">${shipment.trackingNumber}</span>
              <span class="text-[9px] text-emerald-400 font-bold flex items-center gap-1">● GPS משדר</span>
            </div>
            
            <div class="space-y-1 text-xs text-slate-800">
              <p class="font-black text-xs text-slate-900">${shipment.customerName}</p>
              <p class="text-[10px] text-slate-500">נתיב: <strong class="text-slate-700">${shipment.origin}</strong> ← <strong class="text-slate-700">${shipment.destination}</strong></p>
              <p class="text-[10px] text-slate-500">מוביל: <strong class="text-slate-700">${shipment.driverName || 'אבי מזרחי'}</strong></p>
              <p class="text-[10px] text-slate-500">מטען: <strong class="text-slate-700">${shipment.cargoType} (${shipment.weight} טון)</strong></p>
              
              <div class="w-full bg-slate-200 rounded-full h-1 my-1.5">
                <div class="bg-[#ff7f00] h-1 rounded-full" style="width: ${progress}%"></div>
              </div>
              
              <div class="flex gap-1 mt-2.5">
                <a href="/portal?trk=${shipment.trackingNumber}" target="_blank" class="flex-1 text-center bg-[#ff7f00] hover:bg-[#e06f00] text-white font-bold text-[9px] py-1 rounded transition-colors no-underline block">
                  פתח מעקב לקוח ➔
                </a>
              </div>
            </div>
          </div>
        `;

        truckMarker.bindPopup(customPopupHTML);

        // Auto trigger clicking on this shipment if selected in the list
        if (selectedShipment?.id === shipment.id) {
          mapInstanceRef.current.setView(truckCoords, 10);
          truckMarker.openPopup();
        }
      }
    });

    // 3. Plot Stationary Drivers
    drivers.forEach((driver) => {
      // Avoid rendering if on duty because on duty is already animated along route
      if (driver.status === 'on_duty') return;

      // Filter if search active
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        if (!driver.name.toLowerCase().includes(query) && !driver.currentCity.toLowerCase().includes(query)) return;
      }

      // Check if driver has lat/lng, otherwise map currentCity
      let driverCoords: [number, number] = [driver.lat, driver.lng];
      if (!driverCoords[0] || !driverCoords[1]) {
        driverCoords = getCityCoords(driver.currentCity);
      }

      let driverColor = '#38bdf8'; // available - light blue
      let driverStatusLabel = 'פנוי / ממתין';
      if (driver.status === 'resting') {
        driverColor = '#fbbf24'; // yellow
        driverStatusLabel = 'בהפסקת רענון';
      } else if (driver.status === 'offline') {
        driverColor = '#64748b'; // gray
        driverStatusLabel = 'לא מחובר';
      }

      const driverIcon = L.divIcon({
        className: 'custom-driver-dot',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-6 h-6 bg-sky-500/10 rounded-full"></div>
            <div class="w-4 h-4 rounded-full border-2 border-white flex items-center justify-center shadow-md" style="background-color: ${driverColor}">
              <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
            </div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const driverMarker = L.marker(driverCoords, { icon: driverIcon }).addTo(markersGroup);
      driverMarker.bindPopup(
        `<div class="text-right font-sans p-1.5 text-slate-800" dir="rtl">
          <strong class="text-sm text-slate-900 block">${driver.name}</strong>
          <span class="text-[10px] text-slate-500 block mt-0.5">משאית: ${driver.vehicleNumber}</span>
          <span class="text-[10px] text-slate-500 block">עיר נוכחית: ${driver.currentCity}</span>
          <div class="mt-1.5 inline-block text-[9px] px-1.5 py-0.5 rounded font-bold" style="background-color: ${driverColor}20; color: ${driverColor}">
            ${driverStatusLabel}
          </div>
         </div>`
      );
    });

    // Auto zoom to fit active routes if there are elements plotted
    if (markersGroup.getLayers().length > 0 && !selectedShipment) {
      mapInstanceRef.current.fitBounds(markersGroup.getBounds(), { padding: [40, 40] });
    }

  }, [shipments, drivers, isMapLoaded, searchTerm, selectedShipment, mapStyle]);

  // Handle zooming directly to a shipment route
  const handleFocusShipment = (shipment: Shipment) => {
    setSelectedShipment(shipment);
    const startCoords = CITY_COORDS[shipment.origin] || DEFAULT_COORDS;
    const endCoords = CITY_COORDS[shipment.destination] || DEFAULT_COORDS;
    
    // Find assigned driver progress
    const assignedDriver = drivers.find(d => d.id === shipment.driverId);
    const progress = assignedDriver?.progress ?? 50;

    const currentCoords = shipment.status === 'in_transit' 
      ? getInterpolatedCoords(startCoords, endCoords, progress)
      : startCoords;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(currentCoords, 10);
    }
  };

  // Quick stats calculations for map dashboard panel
  const activeTransits = shipments.filter(s => s.status === 'in_transit').length;
  const delayedShipments = shipments.filter(s => s.status === 'delayed').length;
  const pendingOrders = shipments.filter(s => s.status === 'pending').length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#0e1e38] border border-slate-800 rounded-2xl p-5 shadow-2xl relative select-none">
      
      {/* LEFT HAND CONTROL PANEL: ROUTE MANAGEMENT DIRECTORY (COL 4) */}
      <div className="lg:col-span-4 flex flex-col gap-4 text-right" dir="rtl">
        
        {/* Quick Search & Map Style Toggles */}
        <div className="bg-[#061121] rounded-xl border border-slate-800 p-4 space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-850">
            <span className="text-xs font-black text-white flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#ff7f00] animate-spin-slow" />
              בקרת נתיבים ושינוע מטענים
            </span>
            <div className="flex bg-slate-900 rounded p-0.5 border border-slate-800">
              <button 
                onClick={() => setMapStyle('dark')} 
                className={`p-1 text-[10px] font-bold rounded ${mapStyle === 'dark' ? 'bg-[#ff7f00] text-[#0a192f]' : 'text-slate-400 hover:text-white'}`}
                title="תצוגת לילה קוסמית"
              >
                לילה
              </button>
              <button 
                onClick={() => setMapStyle('light')} 
                className={`p-1 text-[10px] font-bold rounded ${mapStyle === 'light' ? 'bg-[#ff7f00] text-[#0a192f]' : 'text-slate-400 hover:text-white'}`}
                title="תצוגה בהירה"
              >
                יום
              </button>
              <button 
                onClick={() => setMapStyle('street')} 
                className={`p-1 text-[10px] font-bold rounded ${mapStyle === 'street' ? 'bg-[#ff7f00] text-[#0a192f]' : 'text-slate-400 hover:text-white'}`}
                title="מפת רחובות OSM"
              >
                רחוב
              </button>
            </div>
          </div>

          {/* Real-time search */}
          <div className="flex items-center gap-2 bg-[#0a192f] border border-slate-850 rounded-lg px-2.5 py-1.5">
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <input 
              type="text" 
              placeholder="חיפוש לפי נהג, לקוח, יעד..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none text-[11px] text-slate-100 placeholder-slate-500 focus:outline-none w-full text-right"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="text-slate-500 hover:text-white">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Quick Metrics row */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-orange-500/10 border border-orange-500/20 p-2 rounded">
              <span className="text-[9px] text-orange-400 block font-bold">פעילים</span>
              <strong className="text-sm font-black text-orange-400 font-mono block mt-0.5">{activeTransits}</strong>
            </div>
            <div className="bg-rose-500/10 border border-rose-500/20 p-2 rounded">
              <span className="text-[9px] text-rose-400 block font-bold">בעיכוב</span>
              <strong className="text-sm font-black text-rose-400 font-mono block mt-0.5">{delayedShipments}</strong>
            </div>
            <div className="bg-slate-800/50 border border-slate-850 p-2 rounded">
              <span className="text-[9px] text-slate-400 block font-bold">ממתינים</span>
              <strong className="text-sm font-black text-slate-200 font-mono block mt-0.5">{pendingOrders}</strong>
            </div>
          </div>
        </div>

        {/* Dynamic Route Directory list */}
        <div className="bg-[#061121] rounded-xl border border-slate-800 p-4 flex-1 flex flex-col min-h-[300px]">
          <h3 className="font-bold text-xs text-slate-300 mb-2.5 pb-1.5 border-b border-slate-850">
            נתיבים ומשלוחים פעילים במפה ({shipments.length})
          </h3>

          <div className="space-y-2 overflow-y-auto max-h-[380px] pr-1 flex-1">
            {shipments.map((shipment) => {
              const isSelected = selectedShipment?.id === shipment.id;
              const driver = drivers.find(d => d.id === shipment.driverId);
              const progress = driver?.progress ?? 0;

              let badgeColor = 'bg-slate-900 border-slate-800 text-slate-400';
              let badgeText = 'ממתין';
              if (shipment.status === 'in_transit') {
                badgeColor = 'bg-orange-500/15 border-orange-500/20 text-[#ff7f00]';
                badgeText = 'בדרך';
              } else if (shipment.status === 'delivered') {
                badgeColor = 'bg-emerald-500/15 border-emerald-500/20 text-emerald-400';
                badgeText = 'נמסר';
              } else if (shipment.status === 'delayed') {
                badgeColor = 'bg-rose-500/15 border-rose-500/20 text-rose-400';
                badgeText = 'עיכוב';
              }

              return (
                <div 
                  key={shipment.id}
                  onClick={() => handleFocusShipment(shipment)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-slate-800/80 border-[#ff7f00] shadow-md shadow-[#ff7f00]/5' 
                      : 'bg-[#0a192f] border-slate-850 hover:border-slate-800 hover:bg-[#0e1e38]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-extrabold text-slate-400">{shipment.trackingNumber}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold ${badgeColor}`}>
                      {badgeText}
                    </span>
                  </div>

                  <div className="mt-1.5 flex items-center justify-between text-xs">
                    <strong className="text-white text-[11px] truncate max-w-[120px]">{shipment.customerName}</strong>
                    <span className="text-[#ff7f00] font-bold text-[10px] font-mono">
                      {shipment.origin} ➔ {shipment.destination}
                    </span>
                  </div>

                  {shipment.status === 'in_transit' && (
                    <div className="mt-2.5 pt-2 border-t border-slate-850/60">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1 font-mono">
                        <span>מוביל: <strong className="text-slate-300">{shipment.driverName || 'אבי מוביל'}</strong></span>
                        <span>{progress}% הושלמו</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-1">
                        <div 
                          className="bg-gradient-to-r from-orange-600 to-[#ff7f00] h-1 rounded-full transition-all duration-1000"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* RIGHT HAND GRAPHICAL REAL MAP GRID (COL 8) */}
      <div className="lg:col-span-8 flex flex-col justify-between bg-[#061121] rounded-xl border border-slate-800 relative overflow-hidden min-h-[500px]">
        
        {/* Real-time Map overlay HUD */}
        <div className="absolute top-4 right-4 left-4 z-[999] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pointer-events-none">
          <div className="bg-[#0e1e38]/95 backdrop-blur border border-slate-800 px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-3 pointer-events-auto">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff7f00] animate-ping shrink-0"></span>
            <div>
              <span className="font-bold text-xs text-white block">מעקב לווייני וגאוגרפי פעיל</span>
              <span className="text-[9px] text-slate-400 block font-mono">ערוץ שידור מסונכרן מול Firebase Realtime Database</span>
            </div>
          </div>

          <div className="bg-[#0e1e38]/95 backdrop-blur border border-slate-800 px-4 py-2 rounded-xl shadow-lg flex items-center gap-3 text-xs text-slate-300 pointer-events-auto font-bold self-end sm:self-auto">
            <span className="flex items-center gap-1">
              <Compass className="w-4 h-4 text-[#ff7f00] animate-spin" style={{ animationDuration: '8s' }} /> 
              זמן מסלול אופטימלי: 100%
            </span>
          </div>
        </div>

        {/* Map Leaflet Container */}
        <div className="w-full h-full min-h-[520px]" ref={mapContainerRef}></div>

        {/* Interactive legend HUD inside Map at bottom */}
        <div className="absolute bottom-4 left-4 right-4 z-[999] bg-[#0e1e38]/95 backdrop-blur border border-slate-800 p-3 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-bold text-slate-300 shadow-md">
          <div className="flex items-center gap-1.5 justify-center">
            <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
            <span>מוצא (מחסן לוגיסטי)</span>
          </div>
          <div className="flex items-center gap-1.5 justify-center">
            <span className="w-2 h-2 rounded-full bg-[#ff7f00] animate-pulse"></span>
            <span>משאית בתנועה</span>
          </div>
          <div className="flex items-center gap-1.5 justify-center">
            <span className="w-2 h-2 rounded-full bg-[#fbbf24] animate-pulse"></span>
            <span>בהפסקת רענון</span>
          </div>
          <div className="flex items-center gap-1.5 justify-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>יעד מסירה סופי</span>
          </div>
        </div>

      </div>

    </div>
  );
}
