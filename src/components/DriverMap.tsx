import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Compass, Truck, Users, Activity, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { Driver } from '../types';

interface DriverMapProps {
  drivers: Driver[];
  onSelectDriver: (driver: Driver) => void;
  selectedDriver: Driver | null;
}

// Cities for coordinate reference & rendering
const ISRAEL_CITIES = [
  { name: 'קריית שמונה', x: 75, y: 12, region: 'צפון' },
  { name: 'טבריה', x: 70, y: 25, region: 'צפון' },
  { name: 'חיפה', x: 42, y: 24, region: 'צפון' },
  { name: 'תל אביב', x: 34, y: 48, region: 'מרכז' },
  { name: 'ירושלים', x: 50, y: 62, region: 'ירושלים' },
  { name: 'אשדוד', x: 28, y: 58, region: 'דרום' },
  { name: 'באר שבע', x: 38, y: 80, region: 'דרום' },
  { name: 'אילת', x: 45, y: 190, region: 'דרום' },
];

export default function DriverMap({ drivers, onSelectDriver, selectedDriver }: DriverMapProps) {
  const [animationTick, setAnimationTick] = useState(0);

  // Animate active trucks moving slightly to simulate GPS tracking
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimationTick((prev) => (prev + 1) % 100);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const getDriverCoordsOnMap = (driver: Driver) => {
    // Find matching city to position on our custom vector map scale
    const originCity = ISRAEL_CITIES.find(c => c.name === driver.currentCity) || ISRAEL_CITIES[3];
    let destCity = ISRAEL_CITIES.find(c => c.name === driver.destinationCity);
    
    if (!destCity || driver.status !== 'on_duty' || !driver.progress) {
      return { x: originCity.x, y: originCity.y };
    }

    const progressFraction = driver.progress / 100;
    
    // Add small wave to make it feel alive
    const wave = Math.sin((animationTick / 100) * Math.PI * 2) * 1.5;

    return {
      x: originCity.x + (destCity.x - originCity.x) * progressFraction + wave,
      y: originCity.y + (destCity.y - originCity.y) * progressFraction + wave,
    };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-[#0e1e38] border border-slate-800 rounded-2xl p-6 shadow-2xl overflow-hidden relative" id="driver-dispatch-system">
      
      {/* Visual Map Canvas Container */}
      <div className="lg:col-span-2 bg-[#061121] rounded-xl border border-slate-800 p-4 relative flex flex-col justify-between overflow-hidden min-h-[480px]">
        {/* Map Header */}
        <div className="flex items-center justify-between z-10 bg-[#0e1e38]/90 backdrop-blur border border-slate-800 px-4 py-2 rounded-lg shadow-md">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff7f00] animate-ping"></span>
            <span className="font-semibold text-sm text-slate-200">מרכז בקרה ולוויין ארצי</span>
          </div>
          <div className="text-xs text-slate-400 font-mono flex items-center gap-3">
            <span className="flex items-center gap-1"><Compass className="w-3.5 h-3.5 text-[#ff7f00] animate-spin" style={{ animationDuration: '6s' }} /> GPS: פעיל</span>
            <span className="hidden sm:inline">דיוק: ~2.4 מטר</span>
          </div>
        </div>

        {/* Animated Custom Map SVG Grid */}
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <svg viewBox="0 0 100 210" className="h-full max-h-[450px] text-slate-800 select-none opacity-90 transition-all duration-700">
            {/* Grid overlay for high-tech aesthetic */}
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#102a45" strokeWidth="0.15" />
              </pattern>
            </defs>
            <rect width="100" height="210" fill="url(#grid)" rx="8" />

            {/* Custom stylized map outline representing Israel's central routes */}
            <path
              d="M 45,8 C 42,12 38,18 36,24 C 34,28 32,38 31,48 C 29,54 27,62 27,70 C 27,82 32,95 34,110 C 36,120 38,140 40,160 C 41,175 43,185 45,200 L 46,200 L 44,180 L 42,160 L 40,140 L 38,115 L 36,95 L 34,80 L 33,65 L 35,50 L 37,35 L 42,20 L 46,12 Z"
              fill="#0d233e"
              stroke="#1b3c66"
              strokeWidth="0.8"
              className="transition-all duration-300"
            />

            {/* Routes and Connective Paths */}
            {drivers.filter(d => d.status === 'on_duty' && d.destinationCity).map((driver) => {
              const start = ISRAEL_CITIES.find(c => c.name === driver.currentCity);
              const end = ISRAEL_CITIES.find(c => c.name === driver.destinationCity);
              if (!start || !end) return null;
              return (
                <g key={`route-${driver.id}`}>
                  {/* Route path line */}
                  <line
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    stroke="#ff7f00"
                    strokeWidth="0.6"
                    strokeDasharray="2,2"
                    opacity="0.6"
                  />
                  {/* Pulsing route endpoint */}
                  <circle cx={end.x} cy={end.y} r="1.5" fill="#ff7f00" opacity="0.8" />
                </g>
              );
            })}

            {/* City labels */}
            {ISRAEL_CITIES.map((city, idx) => (
              <g key={`city-${idx}`}>
                <circle cx={city.x} cy={city.y} r="1" fill="#475569" />
                <text
                  x={city.x + 3}
                  y={city.y + 1}
                  fill="#94a3b8"
                  fontSize="4.5"
                  fontWeight="bold"
                  textAnchor="start"
                  className="font-sans pointer-events-none"
                >
                  {city.name}
                </text>
              </g>
            ))}

            {/* Render Drivers Pin */}
            {drivers.map((driver) => {
              const coords = getDriverCoordsOnMap(driver);
              const isSelected = selectedDriver?.id === driver.id;
              
              // Colors based on status
              let pinColor = '#38bdf8'; // available - light blue
              if (driver.status === 'on_duty') pinColor = '#ff7f00'; // busy - orange
              if (driver.status === 'resting') pinColor = '#fbbf24'; // resting - yellow
              if (driver.status === 'offline') pinColor = '#64748b'; // offline - gray

              return (
                <g
                  key={`pin-${driver.id}`}
                  onClick={() => onSelectDriver(driver)}
                  className="cursor-pointer group"
                >
                  {/* Pulse circle for on-duty moving trucks */}
                  {driver.status === 'on_duty' && (
                    <circle
                      cx={coords.x}
                      cy={coords.y}
                      r="4.5"
                      fill="none"
                      stroke={pinColor}
                      strokeWidth="0.4"
                      className="animate-ping"
                      style={{ transformOrigin: `${coords.x}px ${coords.y}px`, animationDuration: '3s' }}
                    />
                  )}

                  {/* Selected Highlight Halo */}
                  {isSelected && (
                    <circle
                      cx={coords.x}
                      cy={coords.y}
                      r="6"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="0.6"
                    />
                  )}

                  {/* Core driver pin marker */}
                  <circle
                    cx={coords.x}
                    cy={coords.y}
                    r={isSelected ? "3" : "2.2"}
                    fill={pinColor}
                    stroke="#061121"
                    strokeWidth="0.4"
                    className="transition-all duration-300 group-hover:scale-125"
                    style={{ transformOrigin: `${coords.x}px ${coords.y}px` }}
                  />

                  {/* Truck Miniature Overlay */}
                  <g transform={`translate(${coords.x - 3}, ${coords.y - 7.5}) scale(0.02)`}>
                    <path
                      d="M100 200 H300 V350 H100 Z"
                      fill={pinColor}
                      opacity={isSelected ? "1" : "0.7"}
                    />
                  </g>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="z-10 bg-[#0e1e38]/90 backdrop-blur border border-slate-800 p-3 rounded-lg text-xs grid grid-cols-2 sm:grid-cols-4 gap-2 mt-auto">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]"></span>
            <span className="text-slate-300">פנוי (ממתין לקריאה)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff7f00]"></span>
            <span className="text-slate-300">בנסיעה פעילה</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#fbbf24]"></span>
            <span className="text-slate-300">בהפסקת רענון</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#64748b]"></span>
            <span className="text-slate-300">לא מחובר</span>
          </div>
        </div>
      </div>

      {/* Driver List & Selected Info Drawer */}
      <div className="flex flex-col gap-4">
        <div className="bg-[#061121] rounded-xl border border-slate-800 p-4 flex-1 overflow-y-auto max-h-[320px] lg:max-h-none">
          <h3 className="font-bold text-slate-200 text-sm mb-3 flex items-center gap-2 pb-2 border-b border-slate-800">
            <Users className="w-4 h-4 text-[#ff7f00]" />
            סטטוס נהגים בפריסה ארצית ({drivers.length})
          </h3>

          <div className="space-y-2">
            {drivers.map((driver) => {
              const isSelected = selectedDriver?.id === driver.id;
              
              let statusText = 'פנוי';
              let statusClass = 'bg-sky-500/10 text-sky-400 border-sky-500/20';
              if (driver.status === 'on_duty') {
                statusText = 'במשימה';
                statusClass = 'bg-orange-500/10 text-orange-400 border-orange-500/20';
              } else if (driver.status === 'resting') {
                statusText = 'בהפסקה';
                statusClass = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
              } else if (driver.status === 'offline') {
                statusText = 'לא פעיל';
                statusClass = 'bg-slate-500/10 text-slate-400 border-slate-500/20';
              }

              return (
                <div
                  key={driver.id}
                  onClick={() => onSelectDriver(driver)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800/80 border-[#ff7f00] shadow-md shadow-[#ff7f00]/5'
                      : 'bg-[#0a192f] border-slate-800 hover:border-slate-700 hover:bg-[#0e1e38]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-xs text-slate-200 block">{driver.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">{driver.vehicleNumber} | רישיון {driver.licenseType}</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusClass}`}>
                      {statusText}
                    </span>
                  </div>

                  {driver.status === 'on_duty' && driver.destinationCity && (
                    <div className="mt-2 pt-2 border-t border-slate-800/50">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span>{driver.currentCity} ← {driver.destinationCity}</span>
                        <span>{driver.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-1">
                        <div
                          className="bg-gradient-to-r from-orange-600 to-[#ff7f00] h-1 rounded-full transition-all duration-1000"
                          style={{ width: `${driver.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Driver Inspection Widget */}
        <div className="bg-[#061121] rounded-xl border border-slate-800 p-4">
          {selectedDriver ? (
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-slate-200 text-sm">{selectedDriver.name}</h4>
                  <p className="text-xs text-[#ff7f00] font-mono mt-0.5">{selectedDriver.vehicleNumber}</p>
                </div>
                <Truck className="w-5 h-5 text-[#ff7f00]" />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="bg-[#0e1e38] p-2 rounded border border-slate-800/80">
                  <span className="text-slate-400 block text-[10px]">מיקום אחרון</span>
                  <span className="font-semibold text-slate-200 block truncate">{selectedDriver.currentCity}</span>
                </div>
                <div className="bg-[#0e1e38] p-2 rounded border border-slate-800/80">
                  <span className="text-slate-400 block text-[10px]">סוג רישיון משאית</span>
                  <span className="font-semibold text-slate-200 block">Class {selectedDriver.licenseType}</span>
                </div>
              </div>

              {selectedDriver.status === 'on_duty' && selectedDriver.destinationCity && (
                <div className="bg-orange-500/5 border border-orange-500/10 rounded p-2 text-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1 text-[10px]"><Activity className="w-3.5 h-3.5 text-[#ff7f00] animate-pulse" /> משימה פעילה</span>
                    <span className="font-semibold">{selectedDriver.progress}% הושלמו</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    משלוח הובלה בנתיב מ{selectedDriver.currentCity} לכיוון {selectedDriver.destinationCity}.
                  </p>
                </div>
              )}

              <div className="pt-1 flex gap-2">
                <a
                  href={`tel:${selectedDriver.phone}`}
                  className="flex-1 text-center bg-[#0e1e38] hover:bg-[#ff7f00]/10 border border-slate-800 hover:border-[#ff7f00] text-slate-200 font-semibold text-xs py-2 rounded-lg transition-colors"
                >
                  צור קשר טלפוני
                </a>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              <Navigation className="w-6 h-6 text-slate-600 animate-pulse" />
              <span>בחר נהג מהרשימה או מהמפה לקבלת מידע לוויני בזמן אמת וניהול משימות</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
