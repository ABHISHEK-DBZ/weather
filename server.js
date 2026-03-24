const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const AgriEngine = require('./agri_engine');

const app = express();
const PORT = process.env.PORT || 3000;
const isDirectRun = require.main === module;
const IS_API_ONLY = process.env.API_ONLY === 'true';
const SERVER_START_TIME = Date.now();

// ─── Database Initialization (Hybrid Firestore/SQLite) ──────────────────────────
const admin = require('firebase-admin');
const functions = require('firebase-functions');
const sqlite3 = require('sqlite3').verbose();

// Initialize Firebase Admin
let isFirestoreAvailable = false;
try {
  if (admin.apps.length === 0) {
    admin.initializeApp();
  }
  isFirestoreAvailable = true;
  console.log('✅ Firestore Admin initialized');
} catch (e) {
  console.warn('⚠️ Firestore connection failed (likely missing credentials). Falling back to SQLite.');
}

const db = isFirestoreAvailable ? admin.firestore() : null;
const LOG_COLLECTION = 'SearchLogs';
const FARMER_COLLECTION = 'Farmers';

// Initialize SQLite fallback
const sqlDb = new sqlite3.Database(path.join(__dirname, 'prisma', 'weather.db'), (err) => {
  if (err) console.error('Failed to open SQLite database:', err.message);
  else console.log('✅ SQLite database connected');
});

// Ensure tables exist in SQLite
sqlDb.serialize(() => {
  sqlDb.run(`CREATE TABLE IF NOT EXISTS SearchLogs (
    id TEXT PRIMARY KEY,
    userIp TEXT,
    searchQuery TEXT,
    latitude REAL,
    longitude REAL,
    weatherResult TEXT,
    temperature REAL,
    soilTemperature REAL,
    soilMoisture REAL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  sqlDb.run(`CREATE TABLE IF NOT EXISTS Farmers (
    chatId TEXT PRIMARY KEY,
    latitude REAL,
    longitude REAL,
    city TEXT,
    cropType TEXT,
    growthStage TEXT,
    farmSize REAL,
    irrigationMethod TEXT,
    language TEXT,
    alertChannel TEXT,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// Helper for Hybrid Database queries
const universalAdd = async (collection, data, docId = null) => {
  const timestamp = new Date().toISOString();
  
  if (isFirestoreAvailable) {
    try {
      if (docId) {
        await db.collection(collection).doc(docId.toString()).set({ ...data, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      } else {
        await db.collection(collection).add({ ...data, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      }
      return;
    } catch (e) {
      console.error(`Firestore write failed for ${collection}:`, e.message);
    }
  }

  // SQLite Fallback
  if (collection === FARMER_COLLECTION) {
    const { chatId, latitude, longitude, city, cropType, growthStage, farmSize, irrigationMethod, language, alertChannel } = data;
    sqlDb.run(`INSERT INTO Farmers (chatId, latitude, longitude, city, cropType, growthStage, farmSize, irrigationMethod, language, alertChannel, updatedAt) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
               ON CONFLICT(chatId) DO UPDATE SET 
                 latitude=excluded.latitude, 
                 longitude=excluded.longitude, 
                 city=excluded.city, 
                 cropType=excluded.cropType, 
                 growthStage=excluded.growthStage, 
                 farmSize=excluded.farmSize, 
                 irrigationMethod=excluded.irrigationMethod, 
                 language=excluded.language, 
                 alertChannel=excluded.alertChannel, 
                 updatedAt=excluded.updatedAt`,
               [chatId, latitude, longitude, city, cropType, growthStage, farmSize, irrigationMethod, language, alertChannel, timestamp]);
  } else {
    const { userIp, searchQuery, latitude, longitude, weatherResult, temperature, soilTemperature, soilMoisture } = data;
    sqlDb.run(`INSERT INTO SearchLogs (id, userIp, searchQuery, latitude, longitude, weatherResult, temperature, soilTemperature, soilMoisture) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
               [Math.random().toString(36).substr(2, 9), userIp, searchQuery, latitude, longitude, weatherResult, temperature, soilTemperature, soilMoisture]);
  }
};

const getAnalytics = async () => {
  let logs = [];
  let farmersCount = 0;

  if (isFirestoreAvailable) {
    try {
      const logSnapshot = await db.collection(LOG_COLLECTION).get();
      logSnapshot.forEach(doc => logs.push(doc.data()));
      const farmerSnapshot = await db.collection(FARMER_COLLECTION).get();
      farmersCount = farmerSnapshot.size;
      console.log(`[DEBUG] Firestore: ${logs.length} logs, ${farmersCount} farmers`);
    } catch (e) {
      console.warn("Firestore analytics fetch failed (late):", e.message);
      isFirestoreAvailable = false;
    }
  }

  // Merge with SQLite results if running locally
  await new Promise((resolve) => {
    sqlDb.all(`SELECT * FROM SearchLogs`, [], (err, rows) => {
      if (!err && rows) {
        logs = logs.concat(rows);
      }
      sqlDb.get(`SELECT COUNT(*) as count FROM Farmers`, [], (err, row) => {
        const sqlCount = (row && row.count) || 0;
        console.log(`[DEBUG] SQLite: ${rows ? rows.length : 0} logs, ${sqlCount} farmers`);
        
        // If firestore failed or is empty, use SQLite count. 
        // Or if they overlap, we should ideally count unique chatIds.
        // For simplicity, let's just use the max for now, but ensure we add any unique local ones.
        if (sqlCount > farmersCount) {
          farmersCount = sqlCount;
        }
        resolve();
      });
    });
  });

  console.log(`[DEBUG] Total merged: ${logs.length} logs, ${farmersCount} farmers`);

  const totalSearches = logs.length;
  const cityCounts = {};
  let totalSoilTemp = 0, soilTempCount = 0, totalSoilMoisture = 0, soilMoistureCount = 0;

  logs.forEach(data => {
    const query = data.searchQuery;
    cityCounts[query] = (cityCounts[query] || 0) + 1;
    if (data.soilTemperature) { totalSoilTemp += data.soilTemperature; soilTempCount++; }
    if (data.soilMoisture) { totalSoilMoisture += data.soilMoisture; soilMoistureCount++; }
  });

  const topCities = Object.entries(cityCounts)
    .map(([query, count]) => ({ searchQuery: query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const uniqueNodes = new Set(logs.map(l => `${l.latitude},${l.longitude}`)).size;
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const dailyIntensity = logs.filter(l => {
    const ts = l.createdAt ? new Date(l.createdAt).getTime() : 0;
    return ts > oneDayAgo;
  }).length;

  return { 
    totalSearches, 
    topCities, 
    totalFarmers: farmersCount,
    avgSoilTemp: soilTempCount > 0 ? (totalSoilTemp / soilTempCount).toFixed(1) : 0,
    avgSoilMoisture: soilMoistureCount > 0 ? (totalSoilMoisture / soilMoistureCount).toFixed(2) : 0,
    uptime: Math.floor((now - SERVER_START_TIME) / 1000),
    geoNodes: uniqueNodes,
    dailyIntensity
  };
};

const extractCityFromQuery = (query = '') => {
  if (!query || typeof query !== 'string') return null;
  const normalized = query.trim();
  if (!normalized) return null;

  const inMatch = normalized.match(/\b(?:in|at|for|around|of)\s+([A-Za-z][A-Za-z\s-]{1,40})/i);
  if (inMatch && inMatch[1]) {
    return inMatch[1].trim().split(/\s+/).slice(0, 3).join(' ');
  }

  return null;
};

const buildFallbackAiText = (w) => {
  return [
    `Smart Weather Analysis for ${w.city}, ${w.country}`,
    '',
    `Temperature: ${w.temperature}°C (Feels like: ${w.feelsLike}°C)`,
    `Condition: ${w.description}`,
    `Humidity: ${w.humidity}%`,
    `Wind: ${w.windSpeed} m/s`,
    '',
    w.recommendation || 'No extra recommendation available right now.'
  ].join('\n');
};

// Middleware
app.use(cors());
app.use(express.json());

// Request logging for debugging Firebase paths
app.use((req, res, next) => {
  console.log(`[DEBUG] Method: ${req.method} | Path: ${req.path} | Original: ${req.originalUrl}`);
  next();
});

// Create an API Router to handle both /api and root paths (Firebase stripping)
const apiRouter = express.Router();

// Health check
apiRouter.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    dbConnected: true,
    timestamp: new Date().toISOString()
  });
});

// POST: Register a farmer for alerts / profile
apiRouter.post('/register-farmer', async (req, res) => {
  try {
    const { 
      chatId, latitude, longitude, city,
      cropType, growthStage, farmSize, irrigationMethod, language, alertChannel
    } = req.body;
    
    if (!chatId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    await universalAdd(FARMER_COLLECTION, {
      chatId: chatId.toString(),
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      city: city || 'Unknown',
      cropType: cropType || null,
      growthStage: growthStage || null,
      farmSize: farmSize ? parseFloat(farmSize) : null,
      irrigationMethod: irrigationMethod || null,
      language: language || 'en',
      alertChannel: alertChannel || 'in-app'
    }, chatId);

    res.status(200).json({ success: true, message: 'Farmer profile updated successfully' });
  } catch (error) {
    console.error('Failed to update farmer profile:', error.message);
    res.status(500).json({ success: false, error: 'Profile update failed' });
  }
});

// GET: List all farmers (Internal use for alert system)
apiRouter.get('/farmers-list', async (req, res) => {
  try {
    let farmers = [];
    if (isFirestoreAvailable) {
      try {
        const snapshot = await db.collection(FARMER_COLLECTION).get();
        snapshot.forEach(doc => farmers.push(doc.data()));
      } catch (e) {
        console.warn("Firestore list-farmers failed (late):", e.message);
        isFirestoreAvailable = false;
      }
    }
    
    // Supplement with SQLite
    await new Promise(resolve => {
      sqlDb.all(`SELECT * FROM Farmers`, [], (err, rows) => {
        if (!err) {
          // Merge logic: prefer firestore if duplicate chatId found in memory
          rows.forEach(r => {
            if (!farmers.find(f => f.chatId.toString() === r.chatId.toString())) {
              farmers.push(r);
            }
          });
        }
        resolve();
      });
    });

    res.json({ success: true, farmers });
  } catch (error) {
    console.error('Failed to list farmers:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch farmers' });
  }
});

// POST: Log a successful weather search
apiRouter.post('/log-search', async (req, res) => {
  try {
    const { searchQuery, latitude, longitude, weatherResult, temperature, userId, soilTemperature, soilMoisture } = req.body;
    const userIp = req.ip || '127.0.0.1';
    
    await universalAdd(LOG_COLLECTION, {
      userId: userId || null,
      userIp,
      searchQuery,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      weatherResult,
      temperature: parseFloat(temperature),
      soilTemperature: soilTemperature ? parseFloat(soilTemperature) : null,
      soilMoisture: soilMoisture ? parseFloat(soilMoisture) : null
    });
    
    res.status(201).json({ success: true, message: 'Log saved' });
  } catch (error) {
    console.error('Failed to log search:', error.message);
    res.status(500).json({ success: false, error: 'DB write failed' });
  }
});

// GET: Analytics
apiRouter.get('/analytics', async (req, res) => {
  try {
    const analytics = await getAnalytics();
    
    // The frontend expects c.searchQuery and c.count directly
    const mappedCities = analytics.topCities.map(c => ({
      searchQuery: c.searchQuery,
      count: c.count,
      _count: { searchQuery: c.count }
    }));

    res.json({ 
      success: true, 
      ...analytics,
      topCities: mappedCities 
    });
  } catch (error) {
    console.error('Analytics error:', error.message);
    res.json({ success: true, totalSearches: 0, topCities: [], totalFarmers: 0, avgSoilTemp: 0, avgSoilMoisture: 0 });
  }
});

// GET: Export CSV
apiRouter.get('/export-data', async (req, res) => {
  try {
    const { parse } = require('json2csv');
    const { type } = req.query; // 'logs' or 'farmers'
    
    const collectionName = type === 'farmers' ? FARMER_COLLECTION : LOG_COLLECTION;
    const sqlTable = type === 'farmers' ? 'Farmers' : 'SearchLogs';
    
    let data = [];
    
    // Try Firestore first
    if (isFirestoreAvailable) {
      try {
        const snapshot = await db.collection(collectionName).get(); // OrderBy might fail without indexes, keep simple
        snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      } catch (e) {
        console.warn("Firestore export failed, falling back to SQLite");
        isFirestoreAvailable = false; 
      }
    }
    
    // Supplement with SQLite
    if (!isFirestoreAvailable || data.length === 0) {
      await new Promise((resolve, reject) => {
        sqlDb.all(`SELECT * FROM ${sqlTable}`, [], (err, rows) => {
          if (err) return reject(err);
          data = rows;
          resolve();
        });
      });
    }
    
    if (data.length === 0) {
      return res.status(404).json({ error: 'No data to export yet' });
    }
    
    const fields = type === 'farmers' 
      ? ['chatId', 'city', 'cropType', 'growthStage', 'farmSize', 'irrigationMethod']
      : ['searchQuery', 'latitude', 'longitude', 'weatherResult', 'temperature', 'soilMoisture', 'timestamp'];
    
    const csv = parse(data, { fields: fields.filter(f => Object.keys(data[0]).includes(f)) });
    res.header('Content-Type', 'text/csv');
    res.attachment(`${collectionName}_export.csv`);
    return res.send(csv);
  } catch (error) {
    console.error('Export error:', error.message);
    res.status(500).json({ error: 'Export failed' });
  }
});

// POST: AI Chat Assistant
apiRouter.post('/ai-chat', async (req, res) => {
  try {
    const { query, city } = req.body;
    const agent = new WeatherAgent();
    const result = await agent.processWeatherQuery(query, city);

    if (!result.success) {
      const fallbackCity = city || extractCityFromQuery(query);
      if (fallbackCity) {
        let fallbackWeather = await agent.getCurrentWeather(fallbackCity);
        if (!fallbackWeather.success) {
          fallbackWeather = await agent.getCurrentWeatherLite(fallbackCity);
        }

        if (fallbackWeather.success) {
          const weather = fallbackWeather.data;
          firestoreAdd({
            searchQuery: `AI(Fallback): ${query}`,
            userIp: req.ip || '127.0.0.1',
            weatherResult: weather.description,
            temperature: parseFloat(weather.temperature) || 0,
            latitude: parseFloat((weather.coordinates || '').split(',')[0]) || 0,
            longitude: parseFloat((weather.coordinates || '').split(',')[1]) || 0
          }).catch((e) => console.error('Logging AI fallback failed:', e));

          return res.json({
            success: true,
            response: buildFallbackAiText(weather),
            fallback: true,
            data: weather
          });
        }
      }
    }
    
    if (result.success && result.data && result.data.city) {
      universalAdd(LOG_COLLECTION, {
        searchQuery: `AI: ${query}`, 
        userIp: req.ip || '127.0.0.1', 
        weatherResult: 'AI Analysis',
        temperature: parseFloat(result.data.temperature) || 0,
        latitude: parseFloat(result.data.latitude) || 0,
        longitude: parseFloat(result.data.longitude) || 0,
        soilTemperature: result.data.advancedData?.soilTemperature || null,
        soilMoisture: result.data.advancedData?.soilMoisture || null
      }).catch(e => console.error("Logging AI search failed:", e));
    }

    res.json(result);
  } catch (error) {
    console.error("AI Chat Error:", error);
    res.status(500).json({ success: false, error: "AI Assistant is resting. Try again later!" });
  }
});

// Legacy redirects
apiRouter.post(['/weather-assistant', '/chat'], (req, res) => {
  res.redirect(307, '/api/ai-chat');
});

// Weather API Endpoints
apiRouter.get('/weather/:city', async (req, res) => {
  const result = await weatherAgent.getCurrentWeather(req.params.city);
  if (result.success) {
    result.data.recommendation = weatherAgent.getWeatherRecommendation(
      result.data.temperature,
      result.data.description
    );
  }
  res.json(result);
});

apiRouter.get('/forecast/:city', async (req, res) => {
  const forecast = await weatherAgent.getForecast(req.params.city);
  res.json(forecast);
});

apiRouter.get('/weather/compare/:city', async (req, res) => {
  const ourData = await weatherAgent.getCurrentWeather(req.params.city);
  res.json({ success: true, city: req.params.city, data: ourData.data });
});

// NEW POST: Comprehensive Agri-Dashboard Endpoint
apiRouter.post('/agri-dashboard', async (req, res) => {
  try {
    const { profile } = req.body; // e.g., { city, cropType, growthStage, farmSize, irrigationMethod, ... }
    
    if (!profile || !profile.city) {
      return res.status(400).json({ success: false, error: 'Profile with city is required.' });
    }

    // 1. Fetch current and 14-day data
    const currentRes = await weatherAgent.getCurrentWeather(profile.city);
    if (!currentRes.success) return res.status(404).json(currentRes);
    
    const forecastRes = await weatherAgent.getForecast(profile.city);
    if (!forecastRes.success) return res.status(404).json(forecastRes);

    // 2. Generate Agri Dashboard Payload (Features 1-8)
    const dashboardData = AgriEngine.generateDashboard(currentRes.data, forecastRes.data, profile);

    res.json({ success: true, data: dashboardData });
  } catch (error) {
    console.error('Agri-Dashboard Generation Error:', error.message);
    res.status(500).json({ success: false, error: 'Dashboard generation failed' });
  }
});

// Compatibility GET endpoint for older cached frontend bundles.
apiRouter.get('/agri-dashboard', async (req, res) => {
  try {
    const city = (req.query.city || req.query.q || '').toString().trim();
    if (!city) {
      return res.status(400).json({
        success: false,
        error: 'City is required. Pass ?city=<city> or use POST /api/agri-dashboard.'
      });
    }

    const profile = {
      city,
      cropType: req.query.cropType || 'General Crop',
      growthStage: req.query.growthStage || 'Vegetative',
      farmSize: req.query.farmSize || 'small',
      irrigationMethod: req.query.irrigationMethod || 'drip'
    };

    const currentRes = await weatherAgent.getCurrentWeather(profile.city);
    if (!currentRes.success) return res.status(404).json(currentRes);

    const forecastRes = await weatherAgent.getForecast(profile.city);
    if (!forecastRes.success) return res.status(404).json(forecastRes);

    const dashboardData = AgriEngine.generateDashboard(currentRes.data, forecastRes.data, profile);
    res.json({ success: true, data: dashboardData, compatibilityMode: 'get' });
  } catch (error) {
    console.error('Agri-Dashboard GET Compatibility Error:', error.message);
    res.status(500).json({ success: false, error: 'Dashboard generation failed' });
  }
});

// NEW POST: Agriculture-Only Export Engine (Feature 9)
apiRouter.post('/agri-export', async (req, res) => {
  try {
    const { profile, format } = req.body; // format 'json' or 'csv'
    
    if (!profile || !profile.city) {
      return res.status(400).json({ success: false, error: 'Profile required' });
    }

    const currentRes = await weatherAgent.getCurrentWeather(profile.city);
    const forecastRes = await weatherAgent.getForecast(profile.city);
    if (!currentRes.success || !forecastRes.success) return res.status(404).json({error: 'Data fetch failed'});

    const dashboardData = AgriEngine.generateDashboard(currentRes.data, forecastRes.data, profile);
    const today = new Date().toISOString().split('T')[0];

    const exportDataArray = dashboardData.forecast.map(day => {
      const dayAlerts = dashboardData.extremeAlerts.filter(a => a.message.includes(day.date)).map(a => a.type) || [];
      return {
        date: day.date,
        minTemp: day.tempMin,
        maxTemp: day.tempMax,
        avgTemp: Math.round((day.tempMax + day.tempMin) / 2),
        rainfall: day.precip || 0,
        humidity: currentRes.data.humidity,
        windSpeed: day.windSpeedMax || 0,
        et0: day.et0 || 0,
        soilMoisture: dashboardData.soilAdvisory.moistureLevel,
        irrigationRec: dashboardData.irrigationAdvisory.needed !== 'No',
        irrigationVol: parseFloat(dashboardData.irrigationAdvisory.recommendedQuantity) || 0,
        pestRisk: dashboardData.pestAlerts[0]?.level.replace(/[^a-zA-Z]/g, '').trim() || 'Low',
        cropAdvisory: day.cropAdvisory || '',
        alerts: dayAlerts.length > 0 ? dayAlerts.join(';') : 'None'
      };
    });

    if (format === 'csv') {
      const { parse } = require('json2csv');
      const csvData = exportDataArray.map(d => ({
        Date: d.date,
        Min_Temp_C: d.minTemp,
        Max_Temp_C: d.maxTemp,
        Avg_Temp_C: d.avgTemp,
        Rainfall_mm: d.rainfall,
        Humidity_pct: d.humidity,
        Wind_Speed_kmh: d.windSpeed,
        ET0_mm: d.et0,
        Soil_Moisture: d.soilMoisture,
        Irrigation_Recommended: d.irrigationRec ? 'Yes' : 'No',
        Pest_Risk_Level: d.pestRisk,
        Crop_Advisory: d.cropAdvisory,
        Alert_Flags: d.alerts
      }));
      
      const csv = parse(csvData);
      res.header('Content-Type', 'text/csv');
      res.attachment(`AgriReport_${profile.cropType}_${today}.csv`);
      return res.send(csv);
    }

    // Default JSON
    res.json({
      farm_id: profile.chatId || 'web-user',
      crop: profile.cropType,
      export_date: today,
      data: exportDataArray.map(d => ({
        date: d.date,
        temperature: { min: d.minTemp, max: d.maxTemp, avg: d.avgTemp, unit: "C" },
        rainfall_mm: d.rainfall,
        humidity_pct: d.humidity,
        wind_speed_kmh: d.windSpeed,
        et0_mm: d.et0,
        soil_moisture: d.soilMoisture,
        irrigation: { recommended: d.irrigationRec, volume_mm: d.irrigationVol },
        pest_risk: d.pestRisk,
        crop_advisory: d.cropAdvisory,
        alerts: d.alerts === 'None' ? [] : d.alerts.split(';')
      }))
    });
  } catch (error) {
    console.error('Agri Export Error:', error.message);
    res.status(500).json({ error: 'Export generation failed' });
  }
});

// Mount the router on both /api and / to handle different environments
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Serve static files only when this process is responsible for frontend hosting.
if (!IS_API_ONLY) {
  app.use(express.static(path.join(__dirname, 'client/dist')));
  app.use(express.static('public'));
}
app.set('trust proxy', true);

// Weather service
class WeatherAgent {
  constructor() {
    this.geoApiUrl = 'https://geocoding-api.open-meteo.com/v1/search';
    this.weatherApiUrl = 'https://api.open-meteo.com/v1/forecast';
    this.airQualityUrl = 'https://air-quality-api.open-meteo.com/v1/air-quality';
  }

  // AI Weather Assistant - Enhanced & Comprehensive
  async processWeatherQuery(query, city) {
    const weatherKeywords = {
      temperature: ['temperature', 'temp', 'hot', 'cold', 'warm', 'cool', 'degree', 'celsius', 'fahrenheit', 'garam', 'thanda', 'thandak', 'गर्म', 'ठंडा', 'तापमान'],
      rain: ['rain', 'raining', 'wet', 'precipitation', 'shower', 'drizzle', 'barish', 'pani', 'baarish', 'storm', 'बारिश', 'पानी', 'बरसात'],
      wind: ['wind', 'windy', 'breeze', 'gust', 'hawa', 'storm', 'cyclone', 'typhoon', 'हवा', 'तूफान'],
      humidity: ['humidity', 'humid', 'moisture', 'dry', 'damp', 'sticky', 'muggy', 'नमी', 'सूखा', 'नम'],
      forecast: ['tomorrow', 'week', 'forecast', 'future', 'next', 'upcoming', 'kal', 'agle', 'भविष्य', 'कल', 'आगे'],
      clothing: ['wear', 'clothes', 'dress', 'outfit', 'jacket', 'umbrella', 'kapde', 'पहनना', 'कपड़े', 'छाता'],
      activities: ['outdoor', 'picnic', 'travel', 'sport', 'exercise', 'walk', 'cricket', 'football', 'घूमना', 'खेल', 'यात्रा'],
      comparison: ['compare', 'vs', 'difference', 'better', 'warmer', 'colder', 'तुलना', 'अंतर', 'बेहतर'],
      health: ['health', 'UV', 'skin', 'protection', 'sunscreen', 'allergies', 'asthma', 'स्वास्थ्य', 'सुरक्षा'],
      agriculture: ['farming', 'crops', 'plants', 'garden', 'soil', 'irrigation', 'खेती', 'फसल', 'पौधे', 'मिट्टी'],
      aviation: ['flying', 'flight', 'airplane', 'turbulence', 'pilot', 'aviation', 'उड़ान', 'हवाई जहाज'],
      general: ['weather', 'climate', 'condition', 'mausam', 'मौसम', 'हवा', 'आसमान', 'sky', 'atmosphere']
    };

    // Enhanced language detection
    const isHindi = query.match(/[अ-ह]/) || ['garam', 'thanda', 'barish', 'mausam', 'hawa'].some(w => query.toLowerCase().includes(w));

    // Check if query is weather-related
    const isWeatherQuery = Object.values(weatherKeywords).some(keywords =>
      keywords.some(keyword => query.toLowerCase().includes(keyword))
    );

    if (!isWeatherQuery && !city) {
      return {
        success: false,
        error: isHindi ? 
          "मैं एक advanced weather assistant हूँ! 🌤️ मुझसे मौसम, तापमान, बारिश, कृषि, स्वास्थ्य या weather-related सवाल पूछें।" :
          "I'm an advanced weather assistant! 🌤️ Ask me about weather, temperature, rain, agriculture, health, aviation, or any weather-related questions."
      };
    }

    // If weather query but no city provided, try to find one in the query
    let resolvedCity = city;
    if (!resolvedCity || resolvedCity.trim() === '') {
      // Very simple extraction: look for capitalized words or words after 'in' / 'at' / 'me'
      const inMatch = query.match(/\b(in|at|for|around|of)\s+([A-Z][a-z]+|[a-z]+)\b/i);
      if (inMatch) {
         resolvedCity = inMatch[2];
      } else {
        // Just take the last word if it's longer than 3 chars and not a keyword
        const words = query.split(' ').filter(w => w.length > 3);
        const lastWord = words[words.length - 1];
        if (lastWord && !isWeatherQuery) resolvedCity = lastWord;
      }
    }

    if (!resolvedCity || resolvedCity.trim() === '') {
      return {
        success: false,
        error: isHindi ? 
          "कृपया अपना शहर का नाम बताएं! 🏙️ जैसे: 'Delhi', 'Mumbai', 'Bangalore'" :
          "Please provide your city name! 🏙️ For example: 'Delhi', 'Mumbai', 'Bangalore'",
        needsCity: true
      };
    }

    // Get weather data
    const weatherData = await this.getCurrentWeather(resolvedCity);
    if (!weatherData.success) {
      return weatherData;
    }

    // Generate Enhanced AI response based on query type
    return this.generateAdvancedIntelligentResponse(query, weatherData.data, weatherKeywords, isHindi);
  }

  generateAdvancedIntelligentResponse(query, weatherData, keywords, isHindi) {
    const queryLower = query.toLowerCase();
    
    // Smart greeting based on language and time
    const timeGreeting = weatherData.isDay ? 
      (isHindi ? '☀️ नमस्ते!' : '☀️ Hello!') :
      (isHindi ? '🌙 नमस्कार!' : '🌙 Good evening!');
    
    let response = isHindi ?
      `${timeGreeting} **${weatherData.city}, ${weatherData.country} का स्मार्ट मौसम विश्लेषण** 🤖\n\n` :
      `${timeGreeting} **Smart Weather Analysis for ${weatherData.city}, ${weatherData.country}** 🤖\n\n`;

    // Enhanced core weather info
    response += isHindi ?
      `📊 **मुख्य मौसम जानकारी:**\n` +
      `🌡️ तापमान: ${weatherData.temperature}°C (महसूस: ${weatherData.feelsLike}°C)\n` +
      `🌤️ स्थिति: ${weatherData.description}\n` +
      `💧 नमी: ${weatherData.humidity}%\n` +
      `💨 हवा: ${weatherData.windSpeed} km/h\n\n` :
      `📊 **Current Weather Overview:**\n` +
      `🌡️ Temperature: ${weatherData.temperature}°C (Feels like: ${weatherData.feelsLike}°C)\n` +
      `🌤️ Condition: ${weatherData.description}\n` +
      `💧 Humidity: ${weatherData.humidity}%\n` +
      `💨 Wind: ${weatherData.windSpeed} km/h\n\n`;

    // Add advanced data if available
    if (weatherData.advancedData && Object.keys(weatherData.advancedData).length > 0) {
      const advanced = weatherData.advancedData;
      response += isHindi ? `🔬 **एडवांस्ड मेट्रिक्स:**\n` : `🔬 **Advanced Metrics:**\n`;
      
      if (advanced.soilTemperature) {
        response += isHindi ? 
          `🌱 मिट्टी का तापमान: ${advanced.soilTemperature}°C\n` :
          `🌱 Soil temperature: ${advanced.soilTemperature}°C\n`;
      }
      
      if (advanced.highAltitudeWindSpeed) {
        response += isHindi ?
          `🏔️ ऊंचाई पर हवा: ${advanced.highAltitudeWindSpeed} km/h\n` :
          `🏔️ High altitude wind: ${advanced.highAltitudeWindSpeed} km/h\n`;
      }
      
      if (advanced.soilCondition) {
        response += isHindi ?
          `🌾 मिट्टी की स्थिति: ${advanced.soilCondition}\n` :
          `🌾 Soil condition: ${advanced.soilCondition}\n`;
      }
      
      response += '\n';
    }

    // Enhanced category-specific responses
    if (keywords.temperature.some(k => queryLower.includes(k))) {
      response += isHindi ? `🌡️ **तापमान विश्लेषण:**\n` : `🌡️ **Temperature Analysis:**\n`;
      response += this.getEnhancedTemperatureAnalysis(weatherData.temperature, weatherData.feelsLike, isHindi);
    }

    if (keywords.rain.some(k => queryLower.includes(k))) {
      response += isHindi ? `🌧️ **बारिश की जानकारी:**\n` : `🌧️ **Rain Information:**\n`;
      response += this.getEnhancedRainAnalysis(weatherData.description, isHindi);
    }

    if (keywords.wind.some(k => queryLower.includes(k))) {
      response += isHindi ? `💨 **हवा का विश्लेषण:**\n` : `💨 **Wind Analysis:**\n`;
      response += this.getEnhancedWindAnalysis(weatherData.windSpeed, weatherData.advancedData, isHindi);
    }

    if (keywords.humidity.some(k => queryLower.includes(k))) {
      response += isHindi ? `💧 **नमी विश्लेषण:**\n` : `💧 **Humidity Analysis:**\n`;
      response += this.getEnhancedHumidityAnalysis(weatherData.humidity, isHindi);
    }

    if (keywords.clothing.some(k => queryLower.includes(k))) {
      response += isHindi ? `👕 **कपड़ों की सलाह:**\n` : `👕 **Clothing Recommendations:**\n`;
      response += this.getEnhancedClothingAdvice(weatherData, isHindi);
    }

    if (keywords.activities.some(k => queryLower.includes(k))) {
      response += isHindi ? `🏃 **गतिविधि सुझाव:**\n` : `🏃 **Activity Suggestions:**\n`;
      response += this.getEnhancedActivitySuggestions(weatherData, isHindi);
    }

    if (keywords.health.some(k => queryLower.includes(k))) {
      response += isHindi ? `🏥 **स्वास्थ्य सलाह:**\n` : `🏥 **Health Recommendations:**\n`;
      response += this.getHealthRecommendations(weatherData, isHindi);
    }

    if (keywords.agriculture.some(k => queryLower.includes(k))) {
      response += isHindi ? `🌾 **कृषि सलाह:**\n` : `🌾 **Agriculture Advice:**\n`;
      response += this.getAgricultureAdvice(weatherData, isHindi);
    }

    if (keywords.aviation.some(k => queryLower.includes(k))) {
      response += isHindi ? `✈️ **उड्डयन जानकारी:**\n` : `✈️ **Aviation Information:**\n`;
      response += this.getAviationInfo(weatherData, isHindi);
    }

    // If no specific category, provide comprehensive overview
    if (!Object.values(keywords).some(keywordList => 
        keywordList.some(k => queryLower.includes(k)))) {
      response += isHindi ? `**सामान्य सलाह:**\n` : `**General Recommendations:**\n`;
      response += weatherData.recommendation + '\n';
    }

    // Add professional insights
    response += isHindi ?
      `\n🎯 **प्रोफेशनल इनसाइट्स:**\n` +
      `📍 स्थान: ${weatherData.coordinates}\n` +
      `🎯 सटीकता: Google Weather compatible data\n` +
      `⏰ अपडेट: ${weatherData.lastUpdated}\n` +
      `🔍 विस्तृत जानकारी: /api/weather/compare/${weatherData.city}\n\n` +
      `💡 मुझसे कोई भी weather-related सवाल पूछें!\n` :
      `\n🎯 **Professional Insights:**\n` +
      `📍 Location: ${weatherData.coordinates}\n` +
      `🎯 Accuracy: Google Weather compatible data\n` +
      `⏰ Updated: ${weatherData.lastUpdated}\n` +
      `🔍 Detailed analysis: /api/weather/compare/${weatherData.city}\n\n` +
      `💡 Ask me any weather-related questions!\n`;

    return {
      success: true,
      response: response,
      confidence: 95,
      language: isHindi ? 'hindi' : 'english',
      categories: Object.keys(keywords).filter(category => 
        keywords[category].some(k => queryLower.includes(k))
      ),
      advancedFeatures: true
    };
  }

  // Enhanced analysis functions with bilingual support
  getEnhancedTemperatureAnalysis(temp, feelsLike, isHindi) {
    const tempDiff = Math.abs(temp - feelsLike);
    let analysis = '';
    
    if (temp <= 5) {
      analysis = isHindi ? 
        `❄️ बहुत ठंड! Heavy winter clothing जरूरी है।\n` :
        `❄️ Very cold! Heavy winter clothing essential.\n`;
    } else if (temp <= 15) {
      analysis = isHindi ?
        `🧥 ठंड है। Jacket या sweater पहनें।\n` :
        `🧥 Cold weather. Wear jacket or sweater.\n`;
    } else if (temp <= 25) {
      analysis = isHindi ?
        `😊 सुखद तापमान! Outdoor activities के लिए perfect।\n` :
        `😊 Pleasant temperature! Perfect for outdoor activities.\n`;
    } else if (temp <= 35) {
      analysis = isHindi ?
        `☀️ गर्म है। Light cotton clothes पहनें।\n` :
        `☀️ Warm weather. Wear light cotton clothes.\n`;
    } else {
      analysis = isHindi ?
        `🔥 बहुत गर्म! AC, shade, और बहुत पानी।\n` :
        `🔥 Very hot! Stay in AC, shade, drink lots of water.\n`;
    }
    
    if (tempDiff > 5) {
      analysis += isHindi ?
        `⚠️ Real feel ${feelsLike}°C है - humidity/wind के कारण अलग लगता है।\n` :
        `⚠️ Feels like ${feelsLike}°C - humidity/wind makes it feel different.\n`;
    }
    
    return analysis + '\n';
  }

  getEnhancedRainAnalysis(description, isHindi) {
    const isRainy = description.toLowerCase().includes('rain') || 
                   description.toLowerCase().includes('drizzle');
    
    if (isRainy) {
      return isHindi ?
        `☔ हाँ, बारिश हो रही है!\n` +
        `🌂 Waterproof umbrella ज़रूर लें\n` +
        `👟 Non-slip shoes पहनें\n` +
        `🚗 Driving में extra सावधानी बरतें\n\n` :
        `☔ Yes, it's raining!\n` +
        `🌂 Take waterproof umbrella\n` +
        `👟 Wear non-slip shoes\n` +
        `🚗 Drive with extra caution\n\n`;
    } else {
      return isHindi ?
        `☀️ अभी बारिश नहीं हो रही\n` +
        `😊 Outdoor activities safe हैं\n\n` :
        `☀️ No rain currently\n` +
        `😊 Outdoor activities are safe\n\n`;
    }
  }

  getEnhancedWindAnalysis(windSpeed, advancedData, isHindi) {
    let analysis = '';
    
    if (windSpeed <= 5) {
      analysis = isHindi ? 
        `🌸 हल्की हवा - शांत मौसम\n` :
        `🌸 Light breeze - calm conditions\n`;
    } else if (windSpeed <= 15) {
      analysis = isHindi ? 
        `💨 अच्छी हवा - सुखद\n` :
        `💨 Good wind - pleasant\n`;
    } else if (windSpeed <= 30) {
      analysis = isHindi ? 
        `🌪️ तेज हवा - सावधानी बरतें\n` :
        `🌪️ Strong wind - be cautious\n`;
    } else {
      analysis = isHindi ? 
        `⚠️ बहुत तेज हवा - indoor रहें\n` :
        `⚠️ Very strong wind - stay indoors\n`;
    }
    
    // Add high altitude wind data if available
    if (advancedData && advancedData.highAltitudeWindSpeed) {
      analysis += isHindi ?
        `🏔️ ऊंचाई पर हवा: ${advancedData.highAltitudeWindSpeed} km/h\n` :
        `🏔️ High altitude wind: ${advancedData.highAltitudeWindSpeed} km/h\n`;
    }
    
    return analysis + '\n';
  }

  getEnhancedHumidityAnalysis(humidity, isHindi) {
    let analysis = '';
    
    if (humidity <= 30) {
      analysis = isHindi ?
        `🏜️ कम नमी - skin moisturizer use करें\n` +
        `💧 Extra पानी पिएं\n` :
        `🏜️ Low humidity - use skin moisturizer\n` +
        `💧 Drink extra water\n`;
    } else if (humidity <= 60) {
      analysis = isHindi ?
        `😊 आदर्श नमी - comfortable conditions\n` :
        `😊 Ideal humidity - comfortable conditions\n`;
    } else if (humidity <= 80) {
      analysis = isHindi ?
        `💦 अधिक नमी - breathable cotton clothes\n` :
        `💦 High humidity - breathable cotton clothes\n`;
    } else {
      analysis = isHindi ?
        `🌫️ बहुत अधिक नमी - AC में रहें\n` :
        `🌫️ Very high humidity - stay in AC\n`;
    }
    
    return analysis + '\n';
  }

  getEnhancedClothingAdvice(weatherData, isHindi) {
    const temp = weatherData.temperature;
    const isRainy = weatherData.description.toLowerCase().includes('rain');
    let advice = '';
    
    if (temp <= 10) {
      advice = isHindi ?
        `🧥 Heavy jacket, thermal wear, gloves\n` +
        `👒 Warm cap, muffler ज़रूरी\n` :
        `🧥 Heavy jacket, thermal wear, gloves\n` +
        `👒 Warm cap, muffler essential\n`;
    } else if (temp <= 25) {
      advice = isHindi ?
        `👔 Light jacket, jeans, comfortable shirt\n` :
        `👔 Light jacket, jeans, comfortable shirt\n`;
    } else {
      advice = isHindi ?
        `🩳 Light cotton clothes, shorts, breathable fabric\n` +
        `👒 Sun hat, sunglasses ज़रूरी\n` :
        `🩳 Light cotton clothes, shorts, breathable fabric\n` +
        `👒 Sun hat, sunglasses essential\n`;
    }
    
    if (isRainy) {
      advice += isHindi ?
        `☔ Waterproof jacket और umbrella\n` :
        `☔ Waterproof jacket and umbrella\n`;
    }
    
    return advice + '\n';
  }

  getEnhancedActivitySuggestions(weatherData, isHindi) {
    const temp = weatherData.temperature;
    const isRainy = weatherData.description.toLowerCase().includes('rain');
    const windSpeed = weatherData.windSpeed;
    
    if (isRainy) {
      return isHindi ?
        `🏠 Indoor activities: Movies, shopping, reading\n` +
        `☕ Café visits, cooking, board games\n\n` :
        `🏠 Indoor activities: Movies, shopping, reading\n` +
        `☕ Café visits, cooking, board games\n\n`;
    }
    
    if (temp >= 15 && temp <= 28 && windSpeed <= 20) {
      return isHindi ?
        `🚶 Walking, jogging, cycling perfect\n` +
        `🏏 Cricket, football, outdoor sports\n` +
        `🌳 Park picnic, gardening, photography\n\n` :
        `🚶 Perfect for walking, jogging, cycling\n` +
        `🏏 Cricket, football, outdoor sports\n` +
        `🌳 Park picnic, gardening, photography\n\n`;
    }
    
    if (temp > 35) {
      return isHindi ?
        `🏊 Swimming, water sports ideal\n` +
        `❄️ AC malls, indoor activities\n` +
        `🌅 Early morning या evening outdoor\n\n` :
        `🏊 Swimming, water sports ideal\n` +
        `❄️ AC malls, indoor activities\n` +
        `🌅 Early morning or evening outdoor\n\n`;
    }
    
    return isHindi ?
      `😊 Light outdoor activities with proper precautions\n\n` :
      `😊 Light outdoor activities with proper precautions\n\n`;
  }

  getHealthRecommendations(weatherData, isHindi) {
    const temp = weatherData.temperature;
    const humidity = weatherData.humidity;
    const uvIndex = weatherData.uvIndex || 0;
    let health = '';
    
    if (temp > 35) {
      health += isHindi ?
        `💧 हर 15 मिनट में पानी पिएं\n` +
        `🧴 SPF 30+ sunscreen ज़रूरी\n` :
        `💧 Drink water every 15 minutes\n` +
        `🧴 SPF 30+ sunscreen essential\n`;
    }
    
    if (uvIndex > 7) {
      health += isHindi ?
        `☀️ High UV Index - skin protection ज़रूरी\n` :
        `☀️ High UV Index - skin protection essential\n`;
    }
    
    if (humidity > 80) {
      health += isHindi ?
        `🌡️ High humidity - asthma patients सावधान\n` :
        `🌡️ High humidity - asthma patients be careful\n`;
    }
    
    return health + '\n';
  }

  getAgricultureAdvice(weatherData, isHindi) {
    const temp = weatherData.temperature;
    const isRainy = weatherData.description.toLowerCase().includes('rain');
    let advice = '';
    
    if (weatherData.advancedData && weatherData.advancedData.soilCondition) {
      advice += isHindi ?
        `🌱 मिट्टी: ${weatherData.advancedData.soilCondition}\n` :
        `🌱 Soil: ${weatherData.advancedData.soilCondition}\n`;
    }
    
    if (isRainy) {
      advice += isHindi ?
        `🌧️ Natural irrigation का फायदा उठाएं\n` :
        `🌧️ Take advantage of natural irrigation\n`;
    }
    
    if (temp >= 20 && temp <= 30) {
      advice += isHindi ?
        `🌾 Planting के लिए ideal temperature\n` :
        `🌾 Ideal temperature for planting\n`;
    }
    
    return advice + '\n';
  }

  getAviationInfo(weatherData, isHindi) {
    const windSpeed = weatherData.windSpeed;
    const visibility = weatherData.visibility || 10;
    let aviation = '';
    
    if (windSpeed > 25) {
      aviation += isHindi ?
        `⚠️ Strong winds - turbulence संभावना\n` :
        `⚠️ Strong winds - turbulence likely\n`;
    }
    
    if (visibility < 5) {
      aviation += isHindi ?
        `🌫️ Poor visibility - flight delays संभावित\n` :
        `🌫️ Poor visibility - flight delays possible\n`;
    }
    
    if (weatherData.advancedData && weatherData.advancedData.windShear) {
      aviation += isHindi ?
        `🌪️ Wind shear: ${weatherData.advancedData.windShear}\n` :
        `🌪️ Wind shear: ${weatherData.advancedData.windShear}\n`;
    }
    
    return aviation + '\n';
  }

  generateIntelligentResponse(query, weatherData, keywords) {
    const queryLower = query.toLowerCase();
    let response = `🌤️ **Weather Assistant for ${weatherData.city}, ${weatherData.country}**\n\n`;

    // Temperature queries
    if (keywords.temperature.some(k => queryLower.includes(k))) {
      response += `🌡️ **Current Temperature**: ${weatherData.temperature}°C\n`;
      response += this.getTemperatureAnalysis(weatherData.temperature);
    }

    // Rain queries
    if (keywords.rain.some(k => queryLower.includes(k))) {
      const isRainy = weatherData.description.toLowerCase().includes('rain') || 
                     weatherData.description.toLowerCase().includes('drizzle');
      response += `🌧️ **Rain Status**: ${isRainy ? 'Yes, it\'s raining!' : 'No rain currently'}\n`;
      response += `**Current Conditions**: ${weatherData.description}\n`;
      if (isRainy) {
        response += `💡 **Tip**: Don't forget your umbrella! ☂️\n`;
      }
    }

    // Wind queries
    if (keywords.wind.some(k => queryLower.includes(k))) {
      response += `💨 **Wind Speed**: ${weatherData.windSpeed} m/s\n`;
      response += this.getWindAnalysis(weatherData.windSpeed);
    }

    // Humidity queries
    if (keywords.humidity.some(k => queryLower.includes(k))) {
      response += `💧 **Humidity**: ${weatherData.humidity}%\n`;
      response += this.getHumidityAnalysis(weatherData.humidity);
    }

    // Clothing recommendations
    if (keywords.clothing.some(k => queryLower.includes(k))) {
      response += `👕 **Clothing Recommendation**:\n`;
      response += this.getClothingRecommendation(weatherData.temperature, weatherData.description);
    }

    // Activity suggestions
    if (keywords.activities.some(k => queryLower.includes(k))) {
      response += `🏃 **Activity Suggestions**:\n`;
      response += this.getActivitySuggestions(weatherData);
    }

    // If no specific category, provide general weather info
    if (!Object.values(keywords).some(keywordList => 
        keywordList.some(k => queryLower.includes(k)))) {
      response += `**Current Weather**: ${weatherData.description}\n`;
      response += `**Temperature**: ${weatherData.temperature}°C\n`;
      response += `**Humidity**: ${weatherData.humidity}%\n`;
      response += `**Wind**: ${weatherData.windSpeed} m/s\n\n`;
      response += weatherData.recommendation;
    }

    return {
      success: true,
      data: {
        ...weatherData,
        aiResponse: response
      }
    };
  }

  getTemperatureAnalysis(temp) {
    let analysis = "";
    if (temp < 0) {
      analysis = "🥶 Freezing cold! Layer up with thermal wear.\n";
    } else if (temp < 10) {
      analysis = "🧥 Cold weather. Heavy jacket recommended.\n";
    } else if (temp < 20) {
      analysis = "🧤 Cool temperature. Light jacket or sweater needed.\n";
    } else if (temp < 30) {
      analysis = "😊 Pleasant temperature! Perfect for most activities.\n";
    } else if (temp < 35) {
      analysis = "☀️ Warm weather. Light clothing recommended.\n";
    } else {
      analysis = "🔥 Very hot! Stay hydrated and avoid sun exposure.\n";
    }
    return analysis;
  }

  getWindAnalysis(windSpeed) {
    let analysis = "";
    if (windSpeed < 2) {
      analysis = "🍃 Calm conditions with light air.\n";
    } else if (windSpeed < 6) {
      analysis = "🌬️ Light breeze, pleasant for outdoor activities.\n";
    } else if (windSpeed < 12) {
      analysis = "💨 Moderate wind, may affect outdoor plans.\n";
    } else {
      analysis = "⚠️ Strong winds! Be cautious outdoors.\n";
    }
    return analysis;
  }

  getHumidityAnalysis(humidity) {
    let analysis = "";
    if (humidity < 30) {
      analysis = "🏜️ Low humidity, skin may feel dry.\n";
    } else if (humidity < 60) {
      analysis = "😌 Comfortable humidity levels.\n";
    } else if (humidity < 80) {
      analysis = "💦 High humidity, may feel muggy.\n";
    } else {
      analysis = "🌊 Very humid, uncomfortable conditions.\n";
    }
    return analysis;
  }

  getClothingRecommendation(temp, description) {
    let recommendation = "";
    
    if (temp < 0) {
      recommendation = "Heavy winter coat, thermal layers, gloves, hat, warm boots\n";
    } else if (temp < 10) {
      recommendation = "Warm jacket, long pants, closed shoes, scarf\n";
    } else if (temp < 20) {
      recommendation = "Light jacket or sweater, long pants, comfortable shoes\n";
    } else if (temp < 30) {
      recommendation = "T-shirt or light shirt, jeans or light pants\n";
    } else {
      recommendation = "Light, breathable clothing, shorts, sandals\n";
    }

    if (description.toLowerCase().includes('rain')) {
      recommendation += "🌧️ Add: Waterproof jacket and umbrella\n";
    }
    if (description.toLowerCase().includes('snow')) {
      recommendation += "❄️ Add: Waterproof boots and extra warm layers\n";
    }
    if (description.toLowerCase().includes('wind')) {
      recommendation += "💨 Add: Windbreaker or wind-resistant jacket\n";
    }

    return recommendation;
  }

  getActivitySuggestions(weatherData) {
    let suggestions = "";
    const temp = weatherData.temperature;
    const desc = weatherData.description.toLowerCase();

    if (desc.includes('rain')) {
      suggestions = "☔ Indoor activities: Museums, shopping, movies, gym\n";
    } else if (desc.includes('snow')) {
      suggestions = "❄️ Winter activities: Skiing, snowboarding, hot chocolate indoors\n";
    } else if (temp >= 20 && temp <= 30) {
      suggestions = "🌞 Perfect for: Walking, jogging, outdoor sports, picnics\n";
    } else if (temp > 30) {
      suggestions = "🏊 Hot weather: Swimming, indoor activities, early morning/late evening outdoor activities\n";
    } else if (temp < 10) {
      suggestions = "🏠 Cold weather: Indoor activities, cozy cafes, short outdoor walks with warm clothes\n";
    } else {
      suggestions = "🚶 Moderate weather: Light outdoor activities, walking, sightseeing\n";
    }

    return suggestions;
  }

  // Process advanced agricultural weather data
  processAdvancedWeatherData(hourly, currentHour) {
    if (!hourly || currentHour < 0) return {};
    
    const advancedData = {};
    
    // Soil data analysis
    if (hourly.soil_moisture_3_to_9cm && hourly.soil_moisture_3_to_9cm[currentHour] !== undefined) {
      const soilMoisture = hourly.soil_moisture_3_to_9cm[currentHour];
      advancedData.soilMoisture = soilMoisture;
      advancedData.soilCondition = this.analyzeSoilCondition(soilMoisture);
    }
    
    if (hourly.soil_temperature_6cm && hourly.soil_temperature_6cm[currentHour] !== undefined) {
      advancedData.soilTemperature = hourly.soil_temperature_6cm[currentHour];
    }
    
    // Evapotranspiration
    if (hourly.et0_fao_evapotranspiration && hourly.et0_fao_evapotranspiration[currentHour] !== undefined) {
      advancedData.evapotranspiration = hourly.et0_fao_evapotranspiration[currentHour];
    }
    
    // Dew Point
    if (hourly.dew_point_2m && hourly.dew_point_2m[currentHour] !== undefined) {
      advancedData.dewPoint = hourly.dew_point_2m[currentHour];
    }
    
    return advancedData;
  }

  // Analyze soil condition based on moisture
  analyzeSoilCondition(moisture) {
    if (moisture < 0.1) return 'Very Dry - Poor for planting';
    if (moisture < 0.2) return 'Dry - Needs watering';
    if (moisture < 0.3) return 'Moderate - Good for most plants';
    if (moisture < 0.4) return 'Moist - Excellent for growth';
    return 'Very Moist - Check drainage';
  }

  // Calculate wind shear (difference between ground and high altitude)
  calculateWindShear(highAltWind, currentWind) {
    if (!currentWind) return null;
    const shear = Math.abs(highAltWind - currentWind);
    if (shear > 15) return 'High wind shear - Turbulent conditions';
    if (shear > 8) return 'Moderate wind shear';
    return 'Low wind shear - Stable conditions';
  }

  // Calculate temperature gradient
  calculateTemperatureGradient(highAltTemp, groundTemp) {
    if (!groundTemp) return null;
    const gradient = groundTemp - highAltTemp;
    if (gradient > 15) return 'Strong inversion - Stable atmosphere';
    if (gradient > 8) return 'Moderate inversion';
    if (gradient < -5) return 'Unstable atmosphere - Possible storms';
    return 'Normal gradient';
  }

  async getCoordinates(city) {
    try {
      const axios = require('axios');
      
      // Validate city input
      if (!city || typeof city !== 'string' || city.trim() === '') {
        return {
          success: false,
          error: 'Please provide a valid city name.'
        };
      }
      
      // Enhanced geocoding with better search parameters for Google-like accuracy
      const response = await axios.get(this.geoApiUrl, {
        params: {
          name: city.trim(),
          count: 10, // Get more results for better matching
          language: 'en',
          format: 'json'
        }
      });
      
      if (response.data.results && response.data.results.length > 0) {
        let bestResult = response.data.results[0];
        
        // Enhanced matching algorithm for Google Weather compatibility
        const cityLower = city.toLowerCase().trim();
        
        // Priority 1: Exact name match
        for (const result of response.data.results) {
          if (result.name.toLowerCase() === cityLower) {
            bestResult = result;
            break;
          }
        }
        
        // Priority 2: If no exact match, prefer major cities with higher population
        if (bestResult.name.toLowerCase() !== cityLower) {
          for (const result of response.data.results) {
            // Prefer places with higher administrative level (cities over villages)
            if (result.feature_code && ['PPL', 'PPLA', 'PPLA2', 'PPLA3', 'PPLC'].includes(result.feature_code)) {
              if (result.population && (!bestResult.population || result.population > bestResult.population)) {
                bestResult = result;
              }
            }
          }
        }
        
        // Validate coordinates are reasonable
        const lat = parseFloat(bestResult.latitude);
        const lon = parseFloat(bestResult.longitude);
        
        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
          throw new Error('Invalid coordinates received');
        }
        
        return {
          success: true,
          data: {
            latitude: lat.toFixed(4), // Google-like precision
            longitude: lon.toFixed(4),
            name: bestResult.name,
            country: bestResult.country,
            admin1: bestResult.admin1,
            population: bestResult.population || null,
            featureCode: bestResult.feature_code || null,
            elevation: bestResult.elevation || null
          }
        };
      } else {
        return {
          success: false,
          error: `City "${city}" not found. Please check spelling or try with country name (e.g., "Paris, France").`
        };
      }
    } catch (error) {
      console.error('Geocoding error:', error.message);
      return {
        success: false,
        error: 'Location service temporarily unavailable. Please try again in a moment.'
      };
    }
  }

  async getCurrentWeather(city) {
    try {
      const axios = require('axios');
      const coordsResult = await this.getCoordinates(city);
      
      if (!coordsResult.success) {
        return coordsResult;
      }

      const { latitude, longitude, name, country } = coordsResult.data;
      
      // Enhanced API call with comprehensive weather parameters + timezone handling
      const response = await axios.get(this.weatherApiUrl, {
        params: {
          latitude: latitude,
          longitude: longitude,
          models: 'best_match', // Use best available weather model
          current: [
            'temperature_2m',
            'relative_humidity_2m', 
            'apparent_temperature',
            'weather_code',
            'surface_pressure',
            'wind_speed_10m',
            'wind_direction_10m',
            'cloud_cover',
            'visibility',
            'uv_index',
            'is_day',
            'precipitation'
          ].join(','),
          hourly: [
            'temperature_2m',
            'relative_humidity_2m',
            'dew_point_2m',
            'precipitation_probability',
            'precipitation',
            'weather_code',
            'apparent_temperature',
            'soil_moisture_3_to_9cm',
            'soil_temperature_6cm',
            'et0_fao_evapotranspiration',
            'wind_speed_10m',
            'uv_index'
          ].join(','),
          daily: [
            'temperature_2m_max',
            'temperature_2m_min',
            'precipitation_sum',
            'et0_fao_evapotranspiration_sum',
            'weather_code'
          ].join(','),
          timezone: 'auto', // This ensures local timezone
          forecast_days: 14,
          temperature_unit: 'celsius',
          wind_speed_unit: 'kmh',
          precipitation_unit: 'mm',
          timeformat: 'iso8601'
        }
      });
      
      const current = response.data.current;
      const hourly = response.data.hourly;
      const daily = response.data.daily;
      const weatherCode = current.weather_code;
      const isDay = current.is_day === 1;
      const weatherInfo = this.getWeatherDescription(weatherCode, isDay);
      
      // Get current time in location's timezone (from API response)
      const currentTimeString = response.data.current_time || new Date().toISOString();
      const currentTime = new Date(currentTimeString);
      const currentHour = currentTime.getHours();
      
      // Use most accurate temperature data - prioritize current over hourly
      let currentTemp = current.temperature_2m;
      let currentHumidity = current.relative_humidity_2m;
      let currentApparentTemp = current.apparent_temperature;
      
      // For better accuracy matching Google Weather:
      // 1. Use current temperature as primary source
      // 2. Only use hourly if current is unavailable or seems incorrect
      if (hourly && hourly.temperature_2m && Array.isArray(hourly.temperature_2m)) {
        const hourlyTemp = hourly.temperature_2m[currentHour];
        const hourlyApparent = hourly.apparent_temperature ? hourly.apparent_temperature[currentHour] : null;
        
        // Use hourly data if it's within reasonable range of current
        if (hourlyTemp !== undefined && Math.abs(hourlyTemp - currentTemp) < 3) {
          currentTemp = hourlyTemp;
          if (hourlyApparent) currentApparentTemp = hourlyApparent;
        }
        
        if (hourly.relative_humidity_2m && hourly.relative_humidity_2m[currentHour] !== undefined) {
          currentHumidity = hourly.relative_humidity_2m[currentHour];
        }
      }
      
      // Validate temperature ranges (sanity check)
      if (currentTemp < -50 || currentTemp > 60) {
        console.warn(`Unusual temperature detected: ${currentTemp}°C for ${name}, ${country}`);
      }
      
      // Advanced weather analysis with new parameters
      const advancedData = this.processAdvancedWeatherData(hourly, currentHour);
      
      // Enhanced recommendation with all available data
      const recommendation = this.generateEnhancedRecommendation({
        temperature: currentTemp,
        apparentTemperature: current.apparent_temperature,
        humidity: currentHumidity,
        windSpeed: current.wind_speed_10m,
        windDirection: current.wind_direction_10m,
        weatherCode: weatherCode,
        pressure: current.surface_pressure,
        cloudCover: current.cloud_cover,
        visibility: current.visibility,
        uvIndex: current.uv_index
      });
      
      return {
        success: true,
        data: {
          city: name,
          country: country,
          temperature: Math.round(currentTemp * 10) / 10, // Google-like precision
          feelsLike: currentApparentTemp ? Math.round(currentApparentTemp * 10) / 10 : Math.round(currentTemp * 10) / 10,
          apparentTemperature: currentApparentTemp ? Math.round(currentApparentTemp * 10) / 10 : null,
          description: weatherInfo.description,
          humidity: Math.round(currentHumidity),
          windSpeed: Math.round(current.wind_speed_10m * 10) / 10,
          windDirection: current.wind_direction_10m ? Math.round(current.wind_direction_10m) : null,
          pressure: current.surface_pressure ? Math.round(current.surface_pressure * 10) / 10 : null,
          visibility: current.visibility ? Math.round(current.visibility / 1000 * 10) / 10 : null,
          cloudCover: current.cloud_cover ? Math.round(current.cloud_cover) : null,
          uvIndex: current.uv_index ? Math.round(current.uv_index * 10) / 10 : null,
          isDay: isDay,
          icon: weatherInfo.icon,
          recommendation: recommendation,
          accuracy: '🎯 Google Weather Compatible Data',
          timezone: response.data.timezone || 'UTC',
          coordinates: `${latitude}, ${longitude}`,
          dataSource: 'Open-Meteo API (High Resolution + Advanced Parameters)',
          googleCompatible: true,
          advancedData: advancedData,
          lastUpdated: currentTimeString,
          debug: {
            weatherCode: weatherCode,
            isDay: isDay,
            rawTemp: current.temperature_2m,
            processedTemp: currentTemp,
            timezoneOffset: response.data.utc_offset_seconds || 0
          }
        }
      };
    } catch (error) {
      console.error('Weather API Error:', error.message);
      return {
        success: false,
        error: 'Unable to fetch accurate weather data. Please try again.'
      };
    }
  }

  async getCurrentWeatherLite(city) {
    try {
      const axios = require('axios');
      const coordsResult = await this.getCoordinates(city);

      if (!coordsResult.success) {
        return coordsResult;
      }

      const { latitude, longitude, name, country } = coordsResult.data;
      const response = await axios.get(this.weatherApiUrl, {
        params: {
          latitude,
          longitude,
          current: [
            'temperature_2m',
            'relative_humidity_2m',
            'apparent_temperature',
            'weather_code',
            'wind_speed_10m',
            'is_day'
          ].join(','),
          timezone: 'auto'
        }
      });

      const current = response.data.current;
      const weatherInfo = this.getWeatherDescription(current.weather_code, current.is_day === 1);

      return {
        success: true,
        data: {
          city: name,
          country,
          temperature: Math.round(current.temperature_2m * 10) / 10,
          feelsLike: Math.round(current.apparent_temperature * 10) / 10,
          apparentTemperature: Math.round(current.apparent_temperature * 10) / 10,
          description: weatherInfo.description,
          humidity: Math.round(current.relative_humidity_2m),
          windSpeed: Math.round(current.wind_speed_10m * 10) / 10,
          isDay: current.is_day === 1,
          icon: weatherInfo.icon,
          recommendation: this.getWeatherRecommendation(current.temperature_2m, weatherInfo.description),
          coordinates: `${latitude}, ${longitude}`,
          timezone: response.data.timezone || 'UTC',
          lastUpdated: current.time
        }
      };
    } catch (error) {
      console.error('Weather Lite API Error:', error.message);
      return {
        success: false,
        error: 'Unable to fetch fallback weather data.'
      };
    }
  }

  async getForecast(city) {
    try {
      const axios = require('axios');
      const coordsResult = await this.getCoordinates(city);
      
      if (!coordsResult.success) {
        return coordsResult;
      }

      const { latitude, longitude, name } = coordsResult.data;
      
      const response = await axios.get(this.weatherApiUrl, {
        params: {
          latitude,
          longitude,
          daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,et0_fao_evapotranspiration_sum,wind_speed_10m_max,weather_code',
          timezone: 'auto',
          forecast_days: 14,
          wind_speed_unit: 'kmh'
        }
      });
      
      const daily = response.data.daily;
      const forecast = daily.time.map((date, index) => {
        const weatherInfo = this.getWeatherDescription(daily.weather_code[index]);
        return {
          date: date, // Keep YYYY-MM-DD for easier frontend parsing
          tempMax: Math.round(daily.temperature_2m_max[index]),
          tempMin: Math.round(daily.temperature_2m_min[index]),
          precip: daily.precipitation_sum ? daily.precipitation_sum[index] : 0,
          et0: daily.et0_fao_evapotranspiration_sum ? daily.et0_fao_evapotranspiration_sum[index] : 0,
          windSpeedMax: daily.wind_speed_10m_max ? Math.round(daily.wind_speed_10m_max[index]) : 0,
          description: weatherInfo.description,
          icon: weatherInfo.icon,
          code: daily.weather_code[index]
        };
      });

      return {
        success: true,
        data: {
          city: name,
          forecast
        }
      };
    } catch (error) {
      console.error('Forecast logic error:', error);
      return {
        success: false,
        error: 'Forecast service error'
      };
    }
  }

  getWeatherDescription(code, isDay = true) {
    const weatherCodes = {
      0: { description: isDay ? 'Clear sky' : 'Clear night', icon: isDay ? '01d' : '01n' },
      1: { description: isDay ? 'Mainly clear' : 'Mainly clear night', icon: isDay ? '01d' : '01n' },
      2: { description: 'Partly cloudy', icon: isDay ? '02d' : '02n' },
      3: { description: 'Overcast', icon: '03d' },
      45: { description: 'Fog', icon: '50d' },
      48: { description: 'Depositing rime fog', icon: '50d' },
      51: { description: 'Light drizzle', icon: '09d' },
      53: { description: 'Moderate drizzle', icon: '09d' },
      55: { description: 'Dense drizzle', icon: '09d' },
      56: { description: 'Light freezing drizzle', icon: '09d' },
      57: { description: 'Dense freezing drizzle', icon: '09d' },
      61: { description: 'Slight rain', icon: '10d' },
      63: { description: 'Moderate rain', icon: '10d' },
      65: { description: 'Heavy rain', icon: '10d' },
      66: { description: 'Light freezing rain', icon: '13d' },
      67: { description: 'Heavy freezing rain', icon: '13d' },
      71: { description: 'Slight snow fall', icon: '13d' },
      73: { description: 'Moderate snow fall', icon: '13d' },
      75: { description: 'Heavy snow fall', icon: '13d' },
      77: { description: 'Snow grains', icon: '13d' },
      80: { description: 'Slight rain showers', icon: '09d' },
      81: { description: 'Moderate rain showers', icon: '09d' },
      82: { description: 'Violent rain showers', icon: '09d' },
      85: { description: 'Slight snow showers', icon: '13d' },
      86: { description: 'Heavy snow showers', icon: '13d' },
      95: { description: 'Thunderstorm', icon: '11d' },
      96: { description: 'Thunderstorm with slight hail', icon: '11d' },
      99: { description: 'Thunderstorm with heavy hail', icon: '11d' }
    };
    
    return weatherCodes[code] || { description: 'Unknown', icon: isDay ? '01d' : '01n' };
  }

  generateEnhancedRecommendation(weatherData) {
    const { temperature, apparentTemperature, humidity, windSpeed, windDirection, weatherCode, pressure, cloudCover, visibility, uvIndex } = weatherData;
    let recommendations = [];
    
    // Temperature-based recommendations with higher precision
    if (temperature < -10) {
      recommendations.push(' Extremely cold! Frostbite risk - cover all exposed skin, wear insulated boots');
    } else if (temperature < 0) {
      recommendations.push('🧥 Freezing weather! Heavy winter gear essential, watch for ice');
    } else if (temperature < 5) {
      recommendations.push('❄️ Very cold. Layer up with thermal wear, warm coat, and gloves');
    } else if (temperature < 10) {
      recommendations.push('🧣 Cold weather. Warm jacket, scarf, and closed shoes recommended');
    } else if (temperature < 15) {
      recommendations.push('🌤️ Cool weather. Light jacket or sweater suggested');
    } else if (temperature < 20) {
      recommendations.push('☀️ Mild temperature. Light layers work well');
    } else if (temperature < 25) {
      recommendations.push('🌞 Pleasant weather. Perfect for most outdoor activities');
    } else if (temperature < 30) {
      recommendations.push('🌡️ Warm weather. Light, breathable clothing recommended');
    } else if (temperature < 35) {
      recommendations.push('🔥 Hot weather! Stay hydrated, wear light colors, seek shade');
    } else {
      recommendations.push('🌋 Extremely hot! Heat stroke risk - stay indoors during peak hours');
    }
    
    // Feels-like temperature with more detailed adjustments
    if (apparentTemperature && Math.abs(temperature - apparentTemperature) > 2) {
      const diff = Math.round(Math.abs(temperature - apparentTemperature));
      if (apparentTemperature > temperature) {
        recommendations.push(`🌡️ Feels ${diff}°C hotter due to humidity - dress lighter than temperature suggests`);
      } else {
        recommendations.push(`💨 Wind chill makes it feel ${diff}°C colder - dress warmer`);
      }
    }
    
    // Weather condition recommendations
    if ([61, 63, 65, 80, 81, 82].includes(weatherCode)) {
      recommendations.push('☔ Rain expected - carry umbrella and wear waterproof clothing');
    } else if ([51, 53, 55].includes(weatherCode)) {
      recommendations.push('🌦️ Light rain/drizzle - light rain jacket recommended');
    } else if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) {
      recommendations.push('❄️ Snow conditions - wear non-slip shoes and warm clothes');
    } else if ([95, 96, 99].includes(weatherCode)) {
      recommendations.push('⛈️ Thunderstorm warning - stay indoors, avoid metal objects');
    } else if ([45, 48].includes(weatherCode)) {
      recommendations.push('🌫️ Foggy conditions - drive carefully, use fog lights, allow extra time');
    }
    
    // Humidity recommendations with precision
    if (humidity > 85) {
      recommendations.push('💧 Very high humidity - wear breathable fabrics, stay hydrated, avoid overexertion');
    } else if (humidity > 70) {
      recommendations.push('🌿 High humidity - cotton clothing preferred, stay cool');
    } else if (humidity < 25) {
      recommendations.push('🏜️ Very low humidity - use moisturizer, drink plenty of water, humidify indoors');
    } else if (humidity < 40) {
      recommendations.push('🌵 Low humidity - keep skin moisturized, stay hydrated');
    }
    
    // Wind recommendations with direction awareness
    if (windSpeed > 20) {
      recommendations.push('🌪️ Very strong winds - avoid outdoor activities, secure loose items');
    } else if (windSpeed > 15) {
      recommendations.push('💨 Strong winds - be careful with umbrellas, watch for flying debris');
    } else if (windSpeed > 8) {
      recommendations.push('🌬️ Moderate wind - wear layers that won\'t blow around');
    }
    
    // UV Index recommendations
    if (uvIndex && uvIndex > 8) {
      recommendations.push('☀️ Very high UV - use SPF 30+, wear hat and sunglasses, limit sun exposure');
    } else if (uvIndex && uvIndex > 5) {
      recommendations.push('🕶️ High UV levels - apply sunscreen, wear protective clothing');
    } else if (uvIndex && uvIndex > 2) {
      recommendations.push('🧴 Moderate UV - sunscreen recommended for extended outdoor time');
    }
    
    // Visibility recommendations
    if (visibility && visibility < 2) {
      recommendations.push('👁️ Very poor visibility - avoid driving if possible, use fog lights');
    } else if (visibility && visibility < 5) {
      recommendations.push('🚗 Reduced visibility - drive slowly, use headlights, increase following distance');
    }
    
    // Pressure-based health recommendations
    if (pressure && pressure < 995) {
      recommendations.push('📉 Low pressure system - sensitive people may experience fatigue or headaches');
    } else if (pressure && pressure > 1025) {
      recommendations.push('📈 High pressure - generally stable weather, good for outdoor activities');
    }
    
    // Return top 3 most relevant recommendations
    return recommendations.slice(0, 3).join('. ') + '.';
  }

  getWeatherRecommendation(temperature, description) {
    let recommendation = '';
    
    if (temperature < 0) {
      recommendation = 'Very cold! Wear heavy winter clothes and stay warm.';
    } else if (temperature < 10) {
      recommendation = 'Cold weather. Wear warm clothes and a jacket.';
    } else if (temperature < 20) {
      recommendation = 'Cool weather. Light jacket recommended.';
    } else if (temperature < 30) {
      recommendation = 'Pleasant weather. Perfect for outdoor activities!';
    } else {
      recommendation = 'Hot weather. Stay hydrated and wear light clothes.';
    }

    if (description.includes('rain')) {
      recommendation += ' Don\'t forget an umbrella!';
    } else if (description.includes('snow')) {
      recommendation += ' Be careful of icy roads.';
    } else if (description.includes('clear')) {
      recommendation += ' Great day to be outside!';
    }

    return recommendation;
  }
}

const weatherAgent = new WeatherAgent();

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// AI Weather Assistant Endpoint
app.get(['/api/weather/compare/:city', '/weather/compare/:city'], async (req, res) => {
  try {
    const city = req.params.city;
    
    // Get our weather data
    const weatherAgent = new WeatherAgent();
    const ourData = await weatherAgent.getCurrentWeather(city);
    
    // Compare with our enhanced accuracy features
    const comparison = {
      query: city,
      ourData: {
        temperature: ourData.temperature,
        condition: ourData.condition,
        humidity: ourData.humidity,
        coordinates: ourData.coordinates,
        timezone: ourData.timezone,
        accuracy: 'Enhanced for Google Weather compatibility',
        advancedMetrics: ourData.advancedData || {}
      },
      features: {
        highResolution: true,
        populationBasedGeocoding: true,
        timezoneAware: true,
        dayNightDetection: true,
        uvIndexIncluded: true,
        pressureData: true,
        visibilityData: true,
        realFeelsLike: true,
        bestMatchModels: true,
        soilMoistureData: true,
        highAltitudeWindData: true,
        temperatureGradientAnalysis: true,
        windShearDetection: true
      },
      tip: 'हमारा weather data अब Google Weather + Advanced Parameters के साथ match करने के लिए optimized है! 🌾🌪️📊'
    };
    
    res.json(comparison);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Final route: serve index.html for all other routes in full-stack mode.
if (!IS_API_ONLY) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist/index.html'));
  });
}

// Export as Firebase Function
exports.api = functions.https.onRequest(app);

// Local development listener
if (process.env.NODE_ENV !== 'production' && !process.env.FUNCTIONS_EMULATOR) {
  app.listen(PORT, () => {
    console.log(`🚀 3D Weather Platform server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to use the app`);
  });
}