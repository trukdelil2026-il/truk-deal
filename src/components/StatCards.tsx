import React from 'react';
import { Users, Truck, Route, Calendar, ArrowUpRight, TrendingUp, DollarSign, Hourglass } from 'lucide-react';
import { Lead, Shipment, Driver } from '../types';

interface StatCardsProps {
  leads: Lead[];
  shipments: Shipment[];
  drivers: Driver[];
}

export default function StatCards({ leads, shipments, drivers }: StatCardsProps) {
  // Compute key stats
  const totalLeadsCount = leads.length;
  const activeShipmentsCount = shipments.filter(s => s.status === 'in_transit' || s.status === 'pending').length;
  const deliveredShipmentsCount = shipments.filter(s => s.status === 'delivered').length;
  const availableDriversCount = drivers.filter(d => d.status === 'available').length;
  const activeDriversCount = drivers.filter(d => d.status === 'on_duty').length;
  
  // Simulated total business value ($ / ₪)
  const estimatedRevenue = deliveredShipmentsCount * 2800 + activeShipmentsCount * 1850;

  // Custom data for the beautiful SVG chart
  // Group leads by status for visual representation
  const leadStatuses = {
    new: leads.filter(l => l.status === 'new').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    negotiation: leads.filter(l => l.status === 'negotiation').length,
    closed_won: leads.filter(l => l.status === 'closed_won').length,
    closed_lost: leads.filter(l => l.status === 'closed_lost').length,
  };

  const chartPoints = [
    { label: 'ראשון', value: 12 },
    { label: 'שני', value: 24 },
    { label: 'שלישי', value: 19 },
    { label: 'רביעי', value: 35 },
    { label: 'חמישי', value: 48 },
    { label: 'שישי', value: totalLeadsCount || 42 },
  ];

  const maxChartValue = Math.max(...chartPoints.map(p => p.value), 40);
  const chartHeight = 120;
  const chartWidth = 500;

  // Convert points to SVG polyline coordinates
  const polylinePoints = chartPoints.map((p, idx) => {
    const x = (idx / (chartPoints.length - 1)) * (chartWidth - 40) + 20;
    const y = chartHeight - ((p.value / maxChartValue) * (chartHeight - 30)) - 10;
    return `${x},${y}`;
  }).join(' ');

  // Fill area under line
  const fillPoints = `${polylinePoints} ${chartWidth - 20},${chartHeight - 5} 20,${chartHeight - 5}`;

  return (
    <div className="space-y-6" id="stats-overview-dashboard">
      {/* Metrics Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Leads */}
        <div className="bg-white/5 border-r-4 border-[#ff7f00] p-5 shadow-md relative overflow-hidden transition-all hover:bg-white/10">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">פניות ולידים חדשים</span>
              <span className="text-3.5xl font-black text-white block font-mono">{totalLeadsCount}</span>
            </div>
            <div className="bg-[#ff7f00]/10 p-2 rounded">
              <Users className="w-5 h-5 text-[#ff7f00]" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>מדד צמיחה חיובי השבוע</span>
          </div>
        </div>

        {/* Card 2: Shipments */}
        <div className="bg-white/5 border-r-4 border-sky-500 p-5 shadow-md relative overflow-hidden transition-all hover:bg-white/10">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">משלוחים פעילים במעבר</span>
              <span className="text-3.5xl font-black text-white block font-mono">{activeShipmentsCount}</span>
            </div>
            <div className="bg-[#38bdf8]/10 p-2 rounded">
              <Truck className="w-5 h-5 text-sky-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
            <span className="font-semibold">בדרך ליעד בזמן אמת</span>
          </div>
        </div>

        {/* Card 3: Driver Capacity */}
        <div className="bg-white/5 border-r-4 border-emerald-500 p-5 shadow-md relative overflow-hidden transition-all hover:bg-white/10">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">נהגים זמינים בצי</span>
              <span className="text-3.5xl font-black text-white block font-mono">
                {availableDriversCount}
                <span className="text-xs text-slate-400 font-normal mr-1.5">מתוך {drivers.length}</span>
              </span>
            </div>
            <div className="bg-emerald-500/10 p-2 rounded">
              <Route className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 text-[11px] text-slate-400 font-semibold">
            <span className="text-emerald-400">{(availableDriversCount / (drivers.length || 1) * 100).toFixed(0)}%</span>
            <span>זמינות כללית בצי המשאיות</span>
          </div>
        </div>

        {/* Card 4: Estimated Value */}
        <div className="bg-white/5 border-r-4 border-amber-500 p-5 shadow-md relative overflow-hidden transition-all hover:bg-white/10">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">נפח פעילות כספי מוערך</span>
              <span className="text-3.5xl font-black text-white block font-mono">₪{estimatedRevenue.toLocaleString()}</span>
            </div>
            <div className="bg-amber-500/10 p-2 rounded">
              <DollarSign className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold">
            <Calendar className="w-3.5 h-3.5 text-[#ff7f00]" />
            <span>סך הכל בחודש הנוכחי</span>
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Line Chart: Leads Pipeline Progress */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 shadow-md lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-extrabold text-white text-sm">ניתוח פניות והזמנות שבועיות</h3>
              <p className="text-xs text-slate-400 mt-0.5">מעקב התקדמות ומדד זרימת הלידים למערכת</p>
            </div>
            <span className="text-xs font-mono font-bold text-[#ff7f00] bg-[#ff7f00]/10 border border-[#ff7f00]/20 px-2.5 py-1 rounded">
              מחובר בזמן אמת
            </span>
          </div>

          {/* SVG Vector Chart */}
          <div className="w-full overflow-x-auto">
            <div className="min-w-[420px] h-[150px] relative">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
                <defs>
                  {/* Glowing gradient for chart line */}
                  <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff7f00" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#ff7f00" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                <line x1="20" y1="10" x2={chartWidth - 20} y2="10" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="3,3" />
                <line x1="20" y1="55" x2={chartWidth - 20} y2="55" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="3,3" />
                <line x1="20" y1="100" x2={chartWidth - 20} y2="100" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="3,3" />

                {/* Filled Area */}
                <polygon points={fillPoints} fill="url(#chartGlow)" />

                {/* Chart Line */}
                <polyline
                  fill="none"
                  stroke="#ff7f00"
                  strokeWidth="2.5"
                  points={polylinePoints}
                />

                {/* Interactive Points / Circles */}
                {chartPoints.map((p, idx) => {
                  const x = (idx / (chartPoints.length - 1)) * (chartWidth - 40) + 20;
                  const y = chartHeight - ((p.value / maxChartValue) * (chartHeight - 30)) - 10;
                  return (
                    <g key={`node-${idx}`} className="group cursor-pointer">
                      <circle cx={x} cy={y} r="4.5" fill="#0c1a30" stroke="#ff7f00" strokeWidth="2" />
                      <circle cx={x} cy={y} r="8" fill="#ff7f00" opacity="0" className="hover:opacity-20 transition-opacity" />
                      {/* Tooltip on top */}
                      <text x={x} y={y - 10} fill="#ffffff" fontSize="8" textAnchor="middle" fontWeight="bold" className="hidden group-hover:block bg-black px-1.5 py-0.5 rounded">
                        {p.value}
                      </text>
                    </g>
                  );
                })}

                {/* Labels */}
                {chartPoints.map((p, idx) => {
                  const x = (idx / (chartPoints.length - 1)) * (chartWidth - 40) + 20;
                  return (
                    <text key={`lbl-${idx}`} x={x} y={chartHeight + 10} fill="#94a3b8" fontSize="8.5" textAnchor="middle" className="font-sans">
                      {p.label}
                    </text>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>

        {/* Lead Pipelines Breakdown Card */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 shadow-md flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-white text-sm mb-4">התפלגות סטטוסי לידים</h3>
            
            <div className="space-y-3">
              {/* Stat 1: New */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-bold flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-sky-400"></span>
                    פניות חדשות (New)
                  </span>
                  <span className="font-mono font-bold text-slate-300">{leadStatuses.new}</span>
                </div>
                <div className="w-full bg-[#061121] h-1.5 overflow-hidden">
                  <div className="bg-sky-400 h-1.5" style={{ width: `${(leadStatuses.new / (totalLeadsCount || 1)) * 100}%` }}></div>
                </div>
              </div>

              {/* Stat 2: In negotiation */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-bold flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-400"></span>
                    במשא ומתן (Negotiation)
                  </span>
                  <span className="font-mono font-bold text-slate-300">{leadStatuses.negotiation}</span>
                </div>
                <div className="w-full bg-[#061121] h-1.5 overflow-hidden">
                  <div className="bg-amber-400 h-1.5" style={{ width: `${(leadStatuses.negotiation / (totalLeadsCount || 1)) * 100}%` }}></div>
                </div>
              </div>

              {/* Stat 3: Won */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-bold flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400"></span>
                    סגור מוצלח (Won)
                  </span>
                  <span className="font-mono font-bold text-slate-300">{leadStatuses.closed_won}</span>
                </div>
                <div className="w-full bg-[#061121] h-1.5 overflow-hidden">
                  <div className="bg-emerald-400 h-1.5" style={{ width: `${(leadStatuses.closed_won / (totalLeadsCount || 1)) * 100}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 border-t border-white/10 pt-3 mt-4 text-center">
            אחוז המרת פניות מוצלחת: <span className="font-mono font-bold text-emerald-400">{((leadStatuses.closed_won / (totalLeadsCount || 1)) * 100).toFixed(0)}%</span>
          </div>
        </div>

      </div>
    </div>
  );
}
