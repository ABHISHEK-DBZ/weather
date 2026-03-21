import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { apiUrl } from '../utils/api';
import ProfileForm from './ProfileForm';
import AgriDashboardUI from './AgriDashboardUI';

// ─── Weather helpers ─────────────────────────────────────────────────────────
const getWeatherIcon = (code, isDay) => {
  if (code === 0) return isDay ? '☀️' : '🌙';
  if (code <= 2)  return isDay ? '⛅' : '🌤️';
  if (code === 3)  return '☁️';
  if (code <= 49) return '🌫️';
  if (code <= 69) return '🌧️';
  if (code <= 79) return '❄️';
  if (code <= 82) return '🌧️';
  if (code <= 99) return '⛈️';
  return '🌡️';
};
const getWeatherLabel = (code) => {
  if (code === 0) return 'Clear Sky';
  if (code <= 2)  return 'Partly Cloudy';
  if (code === 3)  return 'Overcast';
  if (code <= 49) return 'Foggy';
  if (code <= 59) return 'Drizzle';
  if (code <= 69) return 'Rain';
  if (code <= 79) return 'Snow';
  if (code <= 82) return 'Rain Showers';
  if (code <= 86) return 'Snow Showers';
  if (code <= 99) return 'Thunderstorm';
  return 'Unknown';
};
const getAccentColor = (code) => {
  if (code === 0) return '#f59e0b';
  if (code <= 3)  return '#94a3b8';
  if (code <= 49) return '#6b7280';
  if (code <= 69) return '#60a5fa';
  if (code <= 82) return '#22d3ee';
  if (code <= 99) return '#a78bfa';
  return '#9ca3af';
};

// ─── Free APIs (no key needed) ───────────────────────────────────────────────
async function geocodeCity(city) {
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
  );
  const data = await res.json();
  if (!data.results?.length) throw new Error(`"${city}" not found.`);
  const r = data.results[0];
  return { lat: r.latitude, lon: r.longitude, name: r.name, country: r.country };
}
async function fetchWeather(lat, lon) {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day,precipitation,soil_temperature_0cm,soil_moisture_0_1cm&timezone=auto`
  );
  const data = await res.json();
  const c = data.current;
  return {
    temp:      Math.round(c.temperature_2m),
    feelsLike: Math.round(c.apparent_temperature),
    humidity:  c.relative_humidity_2m,
    wind:      Math.round(c.wind_speed_10m),
    code:      c.weather_code,
    isDay:     c.is_day === 1,
    precip:    c.precipitation,
    soilTemp:  c.soil_temperature_0cm,
    soilMoisture: c.soil_moisture_0_1cm,
  };
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const S = {
  overlay: {
    position: 'absolute', inset: 0,
    pointerEvents: 'none',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    overflowY: 'auto',
    paddingBottom: 40,
  },
  searchWrap: {
    pointerEvents: 'auto',
    marginTop: 28,
    width: '100%',
    maxWidth: 520,
    padding: '0 16px',
    flexShrink: 0,
  },
  modeToggle: {
    display: 'flex',
    background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(10px)',
    borderRadius: 30,
    padding: 4,
    marginBottom: 12,
    border: '1px solid rgba(255,255,255,0.1)',
  },
  modeBtn: (active) => ({
    padding: '6px 16px',
    borderRadius: 24,
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    border: 'none',
    color: active ? 'white' : 'rgba(255,255,255,0.5)',
    background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
    transition: 'all 0.2s',
  }),
  form: { position: 'relative', display: 'flex', alignItems: 'center' },
  glow: (accent) => ({
    position: 'absolute', inset: -2,
    borderRadius: 20,
    background: `linear-gradient(135deg, ${accent}88, ${accent}44)`,
    filter: 'blur(8px)',
    opacity: 0.7,
    pointerEvents: 'none',
  }),
  inputWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    background: 'rgba(0,0,0,0.65)',
    backdropFilter: 'blur(24px)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 18,
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    overflow: 'hidden',
  },
  globe: { fontSize: 22, padding: '0 12px 0 18px', userSelect: 'none' },
  input: {
    flex: 1,
    padding: '15px 8px',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'white',
    fontSize: 15,
    fontFamily: 'Inter, sans-serif',
  },
  btn: (accent) => ({
    margin: 6,
    padding: '10px 22px',
    borderRadius: 13,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 14,
    color: 'white',
    fontFamily: 'Inter, sans-serif',
    background: `linear-gradient(135deg, ${accent}, ${accent}bb)`,
    transition: 'opacity 0.2s, transform 0.1s',
    whiteSpace: 'nowrap',
  }),
  loadingTag: {
    position: 'absolute', right: 110, top: '50%', transform: 'translateY(-50%)',
    fontSize: 11, color: '#6366f1', fontWeight: 700, pointerEvents: 'none',
    textTransform: 'uppercase', tracking: '1px'
  },
  error: {
    marginTop: 8, color: '#f87171',
    fontSize: 13, textAlign: 'center',
    fontFamily: 'Inter, sans-serif',
  },
  card: (accent) => ({
    pointerEvents: 'auto',
    marginTop: 12,
    width: '100%',
    maxWidth: 520,
    padding: '0 16px',
  }),
  cardInner: (accent) => ({
    position: 'relative',
    borderRadius: 28,
    overflow: 'hidden',
    background: `linear-gradient(165deg, rgba(15, 23, 42, 0.8), rgba(2, 6, 23, 0.95))`,
    backdropFilter: 'blur(32px)',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: `0 30px 100px rgba(0,0,0,0.7), 0 0 50px ${accent}15`,
    padding: '28px',
  }),
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  cityName: { fontWeight: 900, fontSize: 24, color: 'white', fontFamily: 'Inter, sans-serif' },
  country:  { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 2, fontFamily: 'Inter, sans-serif' },
  emoji:    { fontSize: 52, lineHeight: 1, userSelect: 'none' },
  tempRow:  { display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 18 },
  tempBig: (accent) => ({
    fontSize: 76, fontWeight: 900, color: 'white', lineHeight: 1,
    fontFamily: 'Inter, sans-serif',
    textShadow: `0 0 40px ${accent}66`,
  }),
  condition: { color: 'rgba(255,255,255,0.85)', fontWeight: 700, fontSize: 18, fontFamily: 'Inter, sans-serif' },
  feelsLike: { color: 'rgba(255,255,255,0.38)', fontSize: 13, fontFamily: 'Inter, sans-serif', marginTop: 2 },
  statsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 },
  statBox: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: '12px 8px',
    textAlign: 'center',
  },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statVal:  { color: 'white', fontWeight: 700, fontSize: 15, fontFamily: 'Inter, sans-serif' },
  statLbl:  { color: 'rgba(255,255,255,0.35)', fontSize: 11, fontFamily: 'Inter, sans-serif', marginTop: 2 },
  coords: {
    marginTop: 14, color: 'rgba(255,255,255,0.2)',
    fontSize: 11, textAlign: 'right',
    fontFamily: 'monospace',
  },
  aiContainer: {
    pointerEvents: 'auto',
    marginTop: 12,
    width: '100%',
    maxWidth: 520,
    padding: '0 16px',
    marginBottom: 40,
  },
  aiInner: {
    background: 'rgba(15, 23, 42, 0.85)',
    backdropFilter: 'blur(32px)',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    borderRadius: 24,
    padding: 24,
    color: 'white',
    fontFamily: 'Inter, sans-serif',
    fontSize: 15,
    lineHeight: 1.7,
    boxShadow: '0 30px 60px rgba(0,0,0,0.6), 0 0 20px rgba(99, 102, 241, 0.1)',
  },
  aiHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    paddingBottom: 12,
  },
  aiAvatar: {
    width: 36, height: 36, borderRadius: 12,
    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 20,
  },
  aiTitle: { fontWeight: 800, fontSize: 16, tracking: '-0.02em', color: '#eef2ff' },
  aiContent: {
    whiteSpace: 'pre-wrap',
    opacity: 0.95,
  },
  navWrap: {
    pointerEvents: 'auto',
    position: 'fixed',
    top: 24, right: 24,
    display: 'flex',
    gap: 10,
    zIndex: 1000,
  },
  alertBanner: {
    pointerEvents: 'auto',
    position: 'fixed',
    top: 20,
    width: 'calc(100% - 40px)',
    maxWidth: 600,
    background: 'rgba(220, 38, 38, 0.2)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(220, 38, 38, 0.5)',
    borderRadius: 16,
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    boxShadow: '0 15px 35px rgba(0,0,0,0.3)',
    zIndex: 1000,
  },
  alertIcon: { fontSize: 24 },
  alertText: { flex: 1, color: 'white', fontFamily: 'Inter, sans-serif' },
  alertTitle: { fontWeight: 800, fontSize: 16, marginBottom: 2 },
  alertDesc: { fontSize: 14, opacity: 0.8 },
  navBtn: {
    padding: '10px 20px',
    borderRadius: '12px',
    background: 'rgba(0,0,0,0.6)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: 'white',
    fontFamily: 'Inter, sans-serif',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
    backdropFilter: 'blur(12px)',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  forecastWrap: {
    marginTop: 20,
    paddingTop: 16,
    borderTop: '1px solid rgba(255,255,255,0.08)',
  },
  forecastTitle: {
    fontSize: 12,
    fontWeight: 800,
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: 12,
    textAlign: 'center'
  },
  forecastGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: 8
  },
  forecastItem: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    padding: '10px 4px',
    textAlign: 'center',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  forecastDay: { fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 4 },
  forecastIcon: { fontSize: 20, margin: '4px 0' },
  forecastTemp: { fontSize: 13, fontWeight: 800, color: 'white' },
  forecastDesc: { fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2, height: 24, overflow: 'hidden' },
};

// ─── Main Component ──────────────────────────────────────────────────────────
export default function SearchBar({ onSearchComplete }) {
  const [profile, setProfile] = useState(() => JSON.parse(localStorage.getItem('agriProfile')) || null);
  const [agriData, setAgriData] = useState(null);
  const [query,   setQuery]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [result,  setResult]  = useState(null);
  const [forecast, setForecast] = useState([]);
  const [aiResponse, setAiResponse] = useState(null);
  const [alert, setAlert] = useState(null);
  const [mode, setMode] = useState('weather'); // 'weather' or 'ai'

  const handleSaveProfile = async (data) => {
    localStorage.setItem('agriProfile', JSON.stringify(data));
    setProfile(data);
    setQuery(data.city); // Auto-fill the search with the profile city
    
    // Trigger the search directly bypassing DOM clicks
    execSearch(data.city, data);
  };

  useEffect(() => {
    if (result && !agriData) {
      if (result.code >= 95) {
        setAlert({
          title: 'Severe Thunderstorm Warning',
          desc: 'High electricity activity and heavy precipitation detected.'
        });
      } else if (result.wind > 40) {
        setAlert({
          title: 'High Wind Advisory',
          desc: `Wind speeds of ${result.wind} km/h may cause disruption.`
        });
      } else if (result.temp > 35) {
        setAlert({
          title: 'Extreme Heat Warning',
          desc: 'Temperature is above 35°C. Stay hydrated and avoid sun.'
        });
      } else {
        setAlert(null);
      }
    }
  }, [result]);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    await execSearch(query);
  };

  const execSearch = async (searchStr, currentProfile = profile) => {
    const q = (searchStr || '').trim();
    if (!q) return;
    setLoading(true);
    setError('');
    setResult(null);
    setAiResponse(null);

    try {
      if (mode === 'ai' || q.split(' ').length > 3) {
        const lastCity = result?.name || '';
        const aiRes = await fetch(apiUrl('/api/ai-chat'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q, city: lastCity }),
        });
        const aiData = await aiRes.json();
        if (aiData.success) {
          setAiResponse(aiData.response);
        } else {
          setError(aiData.error || 'AI Assistant is offline. Make sure backend is running.');
        }
      } else {
        const geo     = await geocodeCity(q);
        const weather = await fetchWeather(geo.lat, geo.lon);
        const combined = {
          lat: geo.lat, lon: geo.lon,
          name: geo.name, country: geo.country,
          temp: weather.temp, feelsLike: weather.feelsLike,
          humidity: weather.humidity, wind: weather.wind,
          code: weather.code, isDay: weather.isDay,
          precip: weather.precip,
          soilTemp: weather.soilTemp,
          soilMoisture: weather.soilMoisture,
          condition: getWeatherLabel(weather.code),
        };
        setResult(combined);
        onSearchComplete(combined);

        // Fetch comprehensive Agri-Dashboard data
        try {
          // Use currentProfile explicitly if available (for exact moment of saving)
          const activeProfile = currentProfile || JSON.parse(localStorage.getItem('agriProfile'));
          const agriRes = await fetch(apiUrl('/api/agri-dashboard'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profile: { ...activeProfile, city: geo.name } })
          });
          const fetchedAgriData = await agriRes.json();
          if (fetchedAgriData.success) {
            setAgriData(fetchedAgriData.data);
            if (fetchedAgriData.data.extremeAlerts && fetchedAgriData.data.extremeAlerts.length > 0) {
              setAlert({
                title: fetchedAgriData.data.extremeAlerts[0].type,
                desc: fetchedAgriData.data.extremeAlerts[0].message
              });
            } else {
              setAlert(null); // Clear previous alerts
            }
          } else {
            setError(fetchedAgriData.error || 'Failed to generate agricultural dashboard.');
          }
        } catch (err) {
          console.warn('Agri API failed', err);
        }

        fetch(apiUrl('/api/log-search'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            searchQuery: q, 
            latitude: geo.lat, 
            longitude: geo.lon,
            weatherResult: combined.condition, 
            temperature: combined.temp,
            soilTemperature: weather.soilTemp,
            soilMoisture: weather.soilMoisture
          }),
        }).catch(() => {});
      }
    } catch (err) {
      setError(err.message || 'Connection failed. Check if server is running on port 3000.');
    } finally {
      setLoading(false);
      setQuery('');
    }
  };

  const accent = result ? getAccentColor(result.code) : (mode === 'ai' ? '#6366f1' : '#3b82f6');

  return (
    <>
      <div style={S.navWrap}>
        <Link to="/"     style={S.navBtn}>🌍 Globe</Link>
        <Link to="/admin" style={S.navBtn}>📊 Admin</Link>
      </div>

      <AnimatePresence>
        {alert && (
          <motion.div 
            style={S.alertBanner}
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
          >
            <div style={S.alertIcon}>⚠️</div>
            <div style={S.alertText}>
              <div style={S.alertTitle}>{alert.title}</div>
              <div style={S.alertDesc}>{alert.desc}</div>
            </div>
            <button onClick={() => setAlert(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: 20 }}>✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={S.overlay}>
        {!profile ? (
          <motion.div style={{marginTop: 60, width: '100%', maxWidth: 520, padding: '0 16px', display:'flex', justifyContent:'center'}}>
            <ProfileForm onSave={handleSaveProfile} />
          </motion.div>
        ) : (
          <motion.div
            style={S.searchWrap}
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          >
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={S.modeToggle}>
                <button onClick={() => setMode('weather')} style={S.modeBtn(mode === 'weather')}>FARM DASHBOARD</button>
                <button onClick={() => setMode('ai')} style={S.modeBtn(mode === 'ai')}>AI AGENT 🤖</button>
              </div>
            </div>

            <form onSubmit={handleSearch} style={S.form}>
              <div style={S.glow(accent)} />
              <div style={S.inputWrap}>
                <span style={S.globe}>{mode === 'ai' ? '🤖' : '🌍'}</span>
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder={mode === 'ai' ? "Ask AI about weather..." : "Search farm location..."}
                  style={S.input}
                />
                {loading && <div style={S.loadingTag}>Analysing...</div>}
                <button id="search-form-btn" type="submit" disabled={loading} style={{ ...S.btn(accent), opacity: loading ? 0.6 : 1 }}>
                  {loading ? '...' : (mode === 'ai' ? 'Ask AI' : 'Search')}
                </button>
              </div>
            </form>

            {error && <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} style={S.error}>⚠ {error}</motion.p>}
          </motion.div>
        )}

        <AnimatePresence>
          {profile && agriData && (
             <motion.div style={{marginTop: 12, width: '100%', maxWidth: 1000, padding: '0 16px'}} initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}>
                <AgriDashboardUI data={agriData} profile={profile} />
             </motion.div>
          )}

          {profile && result && !agriData && !aiResponse && (
            <motion.div key={result.name} style={S.card(accent)} initial={{ opacity: 0, scale: 0.85, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.85, y: 20 }}>
              <div style={S.cardInner(accent)}>
                <div style={S.row}>
                  <div>
                    <div style={S.cityName}>{result.name}</div>
                    <div style={S.country}>{result.country}</div>
                  </div>
                  <span style={S.emoji}>{getWeatherIcon(result.code, result.isDay)}</span>
                </div>
                <div style={S.tempRow}>
                  <span style={S.tempBig(accent)}>{result.temp}°</span>
                  <div style={{ marginBottom: 8 }}>
                    <div style={S.condition}>{result.condition}</div>
                    <div style={S.feelsLike}>Feels like {result.feelsLike}°C</div>
                  </div>
                </div>
                <div style={S.statsGrid}>
                  {[
                    { icon: '💨', val: `${result.wind} km/h`, lbl: 'Wind' },
                    { icon: '🌡️', val: `${result.soilTemp}°C`, lbl: 'Soil Temp' },
                    { icon: '💧', val: `${result.soilMoisture} m³/m³`, lbl: 'Soil Moist.' }
                  ].map(s => (
                    <div key={s.lbl} style={S.statBox}>
                      <div style={S.statIcon}>{s.icon}</div>
                      <div style={S.statVal}>{s.val}</div>
                      <div style={S.statLbl}>{s.lbl}</div>
                    </div>
                  ))}
                </div>
                <div style={S.coords}>{result.lat.toFixed(2)}°N, {result.lon.toFixed(2)}°E · Open-Meteo</div>
              </div>
            </motion.div>
          )}

          {profile && aiResponse && (
            <motion.div style={S.aiContainer} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
              <div style={S.aiInner}>
                <div style={S.aiHeader}>
                  <div style={S.aiAvatar}>🤖</div>
                  <div style={S.aiTitle}>Agri Weather Assistant</div>
                </div>
                <div style={S.aiContent}>{aiResponse}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
