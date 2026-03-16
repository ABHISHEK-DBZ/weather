import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Thermometer, Droplets, Activity, Globe, RefreshCw } from 'lucide-react';
import { apiUrl } from '../utils/api';

const THEME = {
  glass: 'rgba(15, 23, 42, 0.45)',
  border: 'rgba(255, 255, 255, 0.1)',
  accent: '#38bdf8',
  success: '#34d399',
  warning: '#f87171',
  text: '#f8fafc',
  textDim: '#94a3b8',
};

const StatItem = ({ icon: Icon, label, value, color, unit }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 0' }}>
    <div style={{ 
      width: '32px', height: '32px', borderRadius: '8px', 
      background: `${color}15`, display: 'flex', alignItems: 'center', 
      justifyContent: 'center', color: color 
    }}>
      <Icon size={16} />
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: '9px', fontWeight: 700, color: THEME.textDim, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: '14px', fontWeight: 800, color: THEME.text }}>
        {value}<span style={{ fontSize: '10px', fontWeight: 500, marginLeft: '2px', opacity: 0.6 }}>{unit}</span>
      </div>
    </div>
  </div>
);

const formatUptime = (seconds) => {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
};

export default function AgriStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(apiUrl('/api/analytics'));
        const data = await res.json();
        if (data.success) setStats(data);
      } catch (err) {
        console.error('Failed to fetch agri stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', damping: 20, stiffness: 100, delay: 0.8 }}
      style={{
        position: 'absolute',
        top: '100px',
        left: '24px',
        width: '220px',
        padding: '18px',
        borderRadius: '24px',
        background: THEME.glass,
        backdropFilter: 'blur(24px)',
        border: `1px solid ${THEME.border}`,
        boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
        zIndex: 100,
        pointerEvents: 'auto',
      }}
    >
      <div style={{ 
        display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px',
        paddingBottom: '10px', borderBottom: `1px solid ${THEME.border}`
      }}>
        <Activity size={14} color={THEME.accent} />
        <span style={{ fontSize: '11px', fontWeight: 800, color: THEME.text, letterSpacing: '0.05em' }}>SYSTEM METRICS</span>
      </div>

      <StatItem icon={Zap} label="Inquiries" value={stats?.totalSearches || 0} unit="" color={THEME.accent} />
      <StatItem icon={Globe} label="Geo Nodes" value={stats?.geoNodes || 0} unit="" color="#818cf8" />
      <StatItem icon={Thermometer} label="Soil Temp" value={stats?.avgSoilTemp || 0} unit="°C" color={THEME.warning} />
      <StatItem icon={Droplets} label="Soil Moist." value={stats?.avgSoilMoisture || 0} unit="m³" color={THEME.success} />
      <StatItem icon={RefreshCw} label="Uptime" value={formatUptime(stats?.uptime || 0)} unit="" color="#a78bfa" />

      <div style={{ marginTop: '16px', fontSize: '9px', color: THEME.textDim, textAlign: 'center', fontStyle: 'italic', opacity: 0.5 }}>
        Real-time telemetry from active geo-nodes
      </div>
    </motion.div>
  );
}
