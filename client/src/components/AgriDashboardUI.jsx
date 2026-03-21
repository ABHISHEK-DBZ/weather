import React from 'react';
import { motion } from 'framer-motion';
import { apiUrl } from '../utils/api';
import { Download, FileJson, AlertTriangle, Bug, Droplets, Sprout, TrendingUp, CalendarDays, Map } from 'lucide-react';

export default function AgriDashboardUI({ data, profile }) {
  if (!data) return null;

  const handleExport = async (format) => {
    try {
      const res = await fetch(apiUrl('/api/agri-export'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: { ...profile, city: data.currentMetrics.city || profile.city }, format })
      });
      if (format === 'csv') {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AgriReport_${profile.cropType}.csv`;
        a.click();
      } else {
        const json = await res.json();
        const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AgriReport_${profile.cropType}.json`;
        a.click();
      }
    } catch (e) {
      alert('Export failed');
    }
  };

  const Card = ({ children, className = "" }) => (
    <div className={`bg-slate-900/60 backdrop-blur-2xl border border-slate-700/50 rounded-3xl p-6 shadow-2xl transition-all duration-300 hover:bg-slate-800/60 hover:border-slate-600/50 ${className}`}>
      {children}
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, y: 30 }} 
      animate={{ opacity: 1, scale: 1, y: 0 }} 
      className="w-full text-slate-100 font-sans pointer-events-auto max-w-6xl mx-auto space-y-6"
    >
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
        <div>
          <h2 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400 flex items-center gap-3">
            <Sprout size={32} className="text-emerald-400" />
            Farm Weather Digest
          </h2>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="px-3 py-1 text-xs font-semibold bg-white/5 border border-white/10 rounded-full text-emerald-200 uppercase tracking-wider">🌾 {profile.cropType}</span>
            <span className="px-3 py-1 text-xs font-semibold bg-white/5 border border-white/10 rounded-full text-sky-200 uppercase tracking-wider">📈 {profile.growthStage} Stage</span>
            <span className="px-3 py-1 text-xs font-semibold bg-white/5 border border-white/10 rounded-full text-amber-200 uppercase tracking-wider">📏 {profile.farmSize} Acres</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => handleExport('csv')} className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-600 rounded-xl text-sm font-semibold transition-all">
            <Download size={16} className="text-emerald-400" /> CSV
          </button>
          <button onClick={() => handleExport('json')} className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-600 rounded-xl text-sm font-semibold transition-all">
            <FileJson size={16} className="text-sky-400" /> JSON
          </button>
        </div>
      </div>

      {/* Alerts Section (Extreme & Pest) */}
      {(data.extremeAlerts?.length > 0 || data.pestAlerts?.length > 0) && (
        <div className="space-y-3">
          {data.extremeAlerts?.map((alert, i) => (
            <motion.div initial={{opacity:0, x:-20}} animate={{opacity:1, x:0}} transition={{delay: i*0.1}} key={`alert-${i}`} className="flex items-start gap-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-200 shadow-lg shadow-red-500/5">
              <AlertTriangle className="text-red-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-red-300 text-sm uppercase tracking-wider block mb-1">{alert.type}</strong>
                <p className="text-sm opacity-90">{alert.message}</p>
              </div>
            </motion.div>
          ))}
          {data.pestAlerts?.filter(a => a.level.includes('High') || a.level.includes('Medium')).map((pest, i) => (
            <motion.div initial={{opacity:0, x:-20}} animate={{opacity:1, x:0}} transition={{delay: i*0.1}} key={`pest-${i}`} className="flex items-start gap-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 shadow-lg shadow-amber-500/5">
              <Bug className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-300 text-sm uppercase tracking-wider block mb-1">Pest Risk: {pest.level}</strong>
                <p className="text-sm opacity-90">{pest.pest} — <span className="text-amber-100">{pest.action}</span></p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Core Insight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150" />
          <h3 className="flex items-center gap-2 text-sky-400 font-bold uppercase tracking-wider text-sm mb-4">
            <Droplets size={18} /> Irrigation Advisory
          </h3>
          <div className="flex-1">
            <div className={`text-4xl font-black mb-2 ${data.irrigationAdvisory.needed === 'Yes' ? 'text-rose-400' : 'text-emerald-400'}`}>
              {data.irrigationAdvisory.needed === 'Yes' ? 'Irrigate Now' : 'No Irrigation'}
            </div>
            <div className="space-y-2 mt-4 text-sm text-slate-300">
              <div className="flex justify-between border-b border-slate-700/50 pb-2">
                <span className="opacity-70">Amount</span>
                <span className="font-semibold text-white">{data.irrigationAdvisory.recommendedQuantity}</span>
              </div>
              <div className="flex justify-between border-b border-slate-700/50 pb-2">
                <span className="opacity-70">Optimal Time</span>
                <span className="font-semibold text-white">{data.irrigationAdvisory.bestTime}</span>
              </div>
            </div>
          </div>
          <p className="mt-4 text-xs text-sky-200/60 leading-relaxed font-medium bg-sky-500/10 p-3 rounded-xl border border-sky-500/10">
            {data.irrigationAdvisory.reason}
          </p>
        </Card>

        <Card className="flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150" />
          <h3 className="flex items-center gap-2 text-amber-500 font-bold uppercase tracking-wider text-sm mb-4">
            <Sprout size={18} /> Soil Condition
          </h3>
          <div className="flex-1">
            <div className="text-3xl font-black mb-2 text-amber-100">
              {data.soilAdvisory.moistureLevel}
            </div>
            <div className="space-y-2 mt-4 text-sm text-slate-300">
              <div className="flex justify-between border-b border-slate-700/50 pb-2">
                <span className="opacity-70">Soil Temp (5cm)</span>
                <span className="font-semibold text-white">{data.soilAdvisory.temperature5cm}°C</span>
              </div>
              <div className="flex justify-between border-b border-slate-700/50 pb-2">
                <span className="opacity-70">Tillage Suitability</span>
                <span className="font-semibold text-white">{data.soilAdvisory.tillageSuitability}</span>
              </div>
            </div>
          </div>
          <p className="mt-4 text-xs text-amber-200/60 leading-relaxed font-medium bg-amber-500/10 p-3 rounded-xl border border-amber-500/10">
            {data.soilAdvisory.recommendation}
          </p>
        </Card>

        <Card className="flex flex-col relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150" />
           <h3 className="flex items-center gap-2 text-indigo-400 font-bold uppercase tracking-wider text-sm mb-4">
            <TrendingUp size={18} /> Seasonal Outlook
          </h3>
          <div className="flex-1">
            <div className={`text-2xl font-black mb-2 leading-tight ${data.seasonalAnalysis.deviationClass.includes('Risk') ? 'text-rose-400' : 'text-indigo-200'}`}>
              {data.seasonalAnalysis.deviationClass}
            </div>
            <div className="space-y-2 mt-4 text-sm text-slate-300">
              <div className="flex justify-between border-b border-slate-700/50 pb-2">
                <span className="opacity-70">Cumulative Rain</span>
                <span className="font-semibold text-white">{data.seasonalAnalysis.rainToDate} mm</span>
              </div>
              <div className="flex justify-between border-b border-slate-700/50 pb-2">
                <span className="opacity-70">Historical Avg</span>
                <span className="font-semibold text-slate-400">{data.seasonalAnalysis.historicalAvg} mm</span>
              </div>
            </div>
          </div>
          <p className="mt-4 text-xs text-indigo-200/60 leading-relaxed font-medium bg-indigo-500/10 p-3 rounded-xl border border-indigo-500/10">
            {data.seasonalAnalysis.outlook}
          </p>
        </Card>
      </div>

      {/* 14-Day Forecast Horizons */}
      <div className="mt-8 pt-6 border-t border-white/5">
        <h3 className="flex items-center gap-2 text-slate-300 font-bold uppercase tracking-wider text-sm mb-6 px-2">
          <CalendarDays size={18} /> 14-Day Agri-Forecast
        </h3>
        <div className="flex gap-4 overflow-x-auto pb-6 px-2 custom-scrollbar">
          {data.forecast.map((day, i) => (
            <motion.div 
              key={i} 
              initial={{opacity: 0, scale: 0.9}} animate={{opacity: 1, scale: 1}} transition={{delay: i * 0.05}}
              className="flex-shrink-0 w-44 bg-slate-800/40 backdrop-blur-md rounded-2xl p-4 border border-slate-700/50 hover:bg-slate-700/50 transition-colors flex flex-col relative overflow-hidden"
            >
              {/* Subtle background gradient based on ET0 */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-amber-500 opacity-50" style={{height: `${Math.min(day.et0 * 2, 8)}px`}} />
              
              <div className="text-center pb-3 border-b border-slate-700/50">
                <div className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-1">Day {i+1}</div>
                <div className="text-slate-100 font-bold text-sm">{day.date.split('-').slice(1).join('/')}</div>
              </div>
              
              <div className="flex flex-col items-center justify-center py-3 flex-1">
                <div className="text-3xl mb-1 filter drop-shadow-md">{day.icon}</div>
                <div className="text-lg font-black tracking-tight text-white">{day.tempMax}°<span className="text-slate-500 font-medium text-sm ml-1">/{day.tempMin}°</span></div>
                
                <div className="flex gap-3 mt-3 w-full px-2">
                   <div className="flex flex-col items-center flex-1 bg-slate-900/50 rounded-lg py-1 border border-white/5">
                      <span className="text-[10px] text-sky-400 font-semibold mb-0.5">RAIN</span>
                      <span className="text-xs text-white font-bold">{Math.round(day.precip)}<span className="text-[10px] text-slate-400 font-normal">mm</span></span>
                   </div>
                   <div className="flex flex-col items-center flex-1 bg-slate-900/50 rounded-lg py-1 border border-white/5">
                      <span className="text-[10px] text-amber-500 font-semibold mb-0.5">ET0</span>
                      <span className="text-xs text-white font-bold">{Math.round(day.et0*10)/10}</span>
                   </div>
                </div>
              </div>
              
              <div className="mt-2 text-[10px] leading-tight text-slate-300/80 bg-slate-900/50 p-2 rounded-xl text-center border border-white/5 h-16 line-clamp-3">
                {day.cropAdvisory}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Micro-Climates */}
      {data.microClimates && (
        <div className="mt-4 pt-6 border-t border-white/5">
          <h3 className="flex items-center gap-2 text-slate-300 font-bold uppercase tracking-wider text-sm mb-6 px-2">
            <Map size={18} /> Farm Micro-Climate Zones
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 px-2">
             {data.microClimates.map((zone, i) => (
                <div key={i} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 flex flex-col gap-2 hover:bg-slate-700/40 transition-colors">
                  <div className="font-bold text-slate-100 flex items-center justify-between">
                    {zone.zoneName}
                    <span className="text-xs bg-slate-900/80 text-sky-400 px-2 py-1 rounded-md">{zone.tempVariation}</span>
                  </div>
                  <div className="text-xs text-slate-400 leading-relaxed font-medium bg-slate-900/30 p-2 border border-slate-800 rounded-lg mt-auto">
                    {zone.advisory}
                  </div>
                </div>
             ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
