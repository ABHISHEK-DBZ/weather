import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement,
  PointElement, LineElement, Filler
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Link } from 'react-router-dom';
import { Activity, Globe, Download, RefreshCw, BarChart3, PieChart, Users, Zap } from 'lucide-react';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, 
  ArcElement, PointElement, LineElement, Filler
);

// ─── Design Tokens ───────────────────────────────────────────────────────────
const THEME = {
  bg: '#020617',
  card: 'rgba(15, 23, 42, 0.6)',
  border: 'rgba(255, 255, 255, 0.08)',
  accent: '#38bdf8', // Sky 400
  secondary: '#818cf8', // Indigo 400
  success: '#34d399', // Emerald 400
  text: '#f8fafc',
  textSecondary: '#94a3b8',
  fontHeading: '"Outfit", sans-serif',
  fontBody: '"Inter", sans-serif',
};

// ─── Custom Styles ───────────────────────────────────────────────────────────
const styles = {
  container: {
    minHeight: '100vh',
    background: THEME.bg,
    color: THEME.text,
    fontFamily: THEME.fontBody,
    position: 'relative',
    overflow: 'hidden',
    padding: '2rem 1rem',
  },
  grain: {
    position: 'fixed',
    inset: 0,
    opacity: 0.03,
    pointerEvents: 'none',
    zIndex: 1,
    background: 'url("https://grainy-gradients.vercel.app/noise.svg")',
  },
  glow: {
    position: 'fixed',
    width: '40vw',
    height: '40vw',
    borderRadius: '50%',
    background: `radial-gradient(circle, ${THEME.accent}11 0%, transparent 70%)`,
    top: '-10%',
    right: '-10%',
    zIndex: 0,
    filter: 'blur(80px)',
  },
  header: {
    maxWidth: '1200px',
    margin: '0 auto 3rem auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1.5rem',
    position: 'relative',
    zIndex: 10,
  },
  titleArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  title: {
    fontFamily: THEME.fontHeading,
    fontSize: '2.5rem',
    fontWeight: 900,
    letterSpacing: '-0.04em',
    marginBottom: '0.25rem',
    background: `linear-gradient(to right, ${THEME.text}, ${THEME.text}88)`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subTitle: {
    fontSize: '0.875rem',
    color: THEME.textSecondary,
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  statusBadge: (online) => ({
    padding: '4px 10px',
    borderRadius: '100px',
    fontSize: '10px',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    background: online ? `${THEME.success}15` : '#ef444415',
    color: online ? THEME.success : '#ef4444',
    border: `1px solid ${online ? THEME.success : '#ef4444'}30`,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: `0 0 15px ${online ? THEME.success : '#ef4444'}10`,
  }),
  buttonGroup: {
    display: 'flex',
    gap: '0.75rem',
  },
  actionBtn: (variant) => ({
    padding: '0.75rem 1.25rem',
    borderRadius: '14px',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
    border: '1px solid',
    borderColor: variant === 'primary' ? 'transparent' : THEME.border,
    background: variant === 'primary' ? `linear-gradient(135deg, ${THEME.accent}, ${THEME.secondary})` : THEME.card,
    color: '#white',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    backdropFilter: 'blur(10px)',
    boxShadow: variant === 'primary' ? `0 10px 20px -10px ${THEME.accent}88` : 'none',
  }),
  grid: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(12, 1fr)',
    gap: '1.5rem',
    position: 'relative',
    zIndex: 10,
  },
  statCard: {
    gridColumn: 'span 3',
    background: THEME.card,
    borderRadius: '24px',
    border: `1px solid ${THEME.border}`,
    padding: '1.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    position: 'relative',
    overflow: 'hidden',
    backdropFilter: 'blur(20px)',
  },
  cardAccent: (color) => ({
    position: 'absolute',
    top: 0, right: 0,
    width: '100px',
    height: '100px',
    background: `radial-gradient(circle at top right, ${color}15, transparent 70%)`,
    pointerEvents: 'none',
  }),
  statIcon: (color) => ({
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    background: `${color}10`,
    color: color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }),
  statValue: {
    fontSize: '2.25rem',
    fontFamily: THEME.fontHeading,
    fontWeight: 800,
    letterSpacing: '-0.02em',
  },
  statLabel: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: THEME.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  mainChartArea: {
    gridColumn: 'span 8',
    background: THEME.card,
    borderRadius: '32px',
    border: `1px solid ${THEME.border}`,
    padding: '2rem',
    backdropFilter: 'blur(20px)',
    minHeight: '400px',
  },
  sideChartArea: {
    gridColumn: 'span 4',
    background: THEME.card,
    borderRadius: '32px',
    border: `1px solid ${THEME.border}`,
    padding: '2rem',
    backdropFilter: 'blur(20px)',
    display: 'flex',
    flexDirection: 'column',
  },
  chartHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '2rem',
  },
  chartTitle: {
    fontFamily: THEME.fontHeading,
    fontSize: '1.25rem',
    fontWeight: 700,
  },
  chartLabel: {
    fontSize: '0.75rem',
    color: THEME.textSecondary,
    fontWeight: 500,
  },
};

// ─── Responsive Queries (Internal) ───────────────────────────────────────────
const mediaStyles = `
  @media (max-width: 1024px) {
    .grid-col-12 { grid-template-columns: repeat(2, 1fr) !important; }
    .span-3 { grid-column: span 1 !important; }
    .span-8, .span-4 { grid-column: span 2 !important; }
  }
  @media (max-width: 640px) {
    .grid-col-12 { grid-template-columns: 1fr !important; }
    .span-3, .span-8, .span-4 { grid-column: span 1 !important; }
    .header-mobile { flex-direction: column; align-items: flex-start !important; }
  }
`;

// ─── Animation Components ──────────────────────────────────────────────────
const AnimatedNumber = ({ value }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = parseInt(value);
    if (isNaN(end)) { setDisplay(value); return; }
    const duration = 1500;
    const step = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setDisplay(Math.floor(progress * end));
      if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
  }, [value]);
  return <span>{display}</span>;
};

const Card = ({ icon: Icon, label, value, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    style={styles.statCard}
    className="span-3"
    whileHover={{ y: -5, borderColor: `${color}44`, boxShadow: `0 20px 40px -20px ${color}33` }}
  >
    <div style={styles.cardAccent(color)} />
    <div style={styles.statIcon(color)}>
      <Icon size={20} />
    </div>
    <div>
      <div style={styles.statValue}><AnimatedNumber value={value} /></div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  </motion.div>
);

// ─── Main Component ──────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const r = await fetch('/api/analytics');
      const d = await r.json();
      if (d.success) {
        setStats(d);
        setBackendStatus('online');
        setError(null);
      } else {
        setBackendStatus('online');
        setError('Database layer initialized but empty.');
      }
    } catch (err) {
      setBackendStatus('offline');
      setError('Communication with Backend failed.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Inject responsive styles
    const styleTag = document.createElement("style");
    styleTag.innerHTML = mediaStyles;
    document.head.appendChild(styleTag);
    return () => document.head.removeChild(styleTag);
  }, []);

  const barData = useMemo(() => {
    if (!stats || !stats.topCities) return null;
    return {
      labels: stats.topCities.map(c => c.searchQuery.replace('AI: ', '🤖 ')),
      datasets: [{
        label: 'Searches',
        data: stats.topCities.map(c => c._count.searchQuery),
        backgroundColor: (ctx) => {
          const chart = ctx.chart;
          const { ctx: canvasCtx, chartArea } = chart;
          if (!chartArea) return null;
          const gradient = canvasCtx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, `${THEME.accent}05`);
          gradient.addColorStop(1, THEME.accent);
          return gradient;
        },
        borderRadius: 8,
        borderSkipped: false,
        hoverBackgroundColor: THEME.secondary,
      }],
    };
  }, [stats]);

  const doughnutData = useMemo(() => {
    if (!stats || !stats.topCities) return null;
    return {
      labels: stats.topCities.map(c => c.searchQuery.replace('AI: ', '')),
      datasets: [{
        data: stats.topCities.map(c => c._count.searchQuery),
        backgroundColor: [THEME.accent, THEME.secondary, THEME.success, '#facc15', '#f87171'],
        borderWidth: 0,
        hoverOffset: 15,
      }],
    };
  }, [stats]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: THEME.card,
        titleFont: { family: THEME.fontHeading, size: 14, weight: 'bold' },
        bodyFont: { family: THEME.fontBody, size: 13 },
        padding: 16,
        cornerRadius: 16,
        borderColor: THEME.border,
        borderWidth: 1,
        displayColors: false,
      },
    },
    scales: {
      y: { 
        grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false },
        ticks: { color: THEME.textSecondary, font: { family: THEME.fontBody, size: 11 } }
      },
      x: { 
        grid: { display: false },
        ticks: { color: THEME.textSecondary, font: { family: THEME.fontBody, size: 11 } }
      },
    },
  };

  if (loading) return (
    <div style={styles.container} className="flex items-center justify-center">
      <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }}>
        <Globe size={64} color={THEME.accent} />
      </motion.div>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.grain} />
      <div style={styles.glow} />

      <header style={styles.header} className="header-mobile">
        <div style={styles.titleArea}>
          <div style={styles.subTitle}>
            <Activity size={14} color={THEME.accent} />
            LIVE SYSTEM TELEMETRY
          </div>
          <h1 style={styles.title}>Weather Nexus</h1>
          <div style={styles.statusBadge(backendStatus === 'online')}>
            <span className={`w-2 h-2 rounded-full ${backendStatus === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
            {backendStatus} System
          </div>
        </div>

        <div style={styles.buttonGroup}>
          <motion.button 
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={fetchData} style={styles.actionBtn('secondary')}
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => window.location.href = '/api/export-data'}
            style={styles.actionBtn('primary')}
            disabled={!stats || stats.totalSearches === 0}
          >
            <Download size={18} />
            Export CSV
          </motion.button>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} style={styles.actionBtn('secondary')}>
              <Globe size={18} />
              Globe
            </motion.button>
          </Link>
        </div>
      </header>

      <main style={styles.grid} className="grid-col-12">
        <Card icon={Zap} label="Pulse Inquiries" value={stats?.totalSearches || 0} color={THEME.accent} delay={0.1} />
        <Card icon={Globe} label="Geo Nodes" value={stats?.topCities?.length || 0} color={THEME.secondary} delay={0.2} />
        <Card icon={Users} label="Daily Intensity" value={stats?._avgIntensity || 12} color={THEME.success} delay={0.3} />
        <Card icon={Activity} label="Uptime" value="100%" color="#facc15" delay={0.4} />

        <motion.section 
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          style={styles.mainChartArea} className="span-8"
        >
          <div style={styles.chartHeader}>
            <div>
              <h3 style={styles.chartTitle}>Query Heatmap</h3>
              <p style={styles.chartLabel}>Volume distribution across active geo-nodes</p>
            </div>
            <BarChart3 size={20} color={THEME.textSecondary} />
          </div>
          <div style={{ height: '300px' }}>
            {barData ? <Bar data={barData} options={chartOptions} /> : <div className="text-white/20">Awaiting Search Data...</div>}
          </div>
        </motion.section>

        <motion.section 
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          style={styles.sideChartArea} className="span-4"
        >
          <div style={styles.chartHeader}>
            <div>
              <h3 style={styles.chartTitle}>Node Share</h3>
              <p style={styles.chartLabel}>Percentage of total traffic</p>
            </div>
            <PieChart size={20} color={THEME.textSecondary} />
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            {doughnutData ? <Doughnut data={doughnutData} options={{ ...chartOptions, cutout: '75%' }} /> : <div className="text-white/20">No Share Data</div>}
          </div>
        </motion.section>

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-12 p-4 rounded-2xl bg-red-400/10 border border-red-400/20 text-red-400 text-sm font-medium">
            🚩 Notice: {error}
          </motion.div>
        )}
      </main>

      <footer style={{ maxWidth: '1200px', margin: '3rem auto 0 auto', textAlign: 'center', opacity: 0.3, fontSize: '11px', letterSpacing: '0.1em' }}>
        WEATHER NEXUS v2.1 // POWERED BY OPEN-METEO // {new Date().getFullYear()} ©
      </footer>
    </div>
  );
}
