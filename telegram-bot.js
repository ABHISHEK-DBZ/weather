const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const cron = require('node-cron');
require('dotenv').config();

// Configuration
const token = process.env.TELEGRAM_BOT_TOKEN || '8384920616:AAGxeh11pvVdUdHcMZidEHAGmcqqGdL9QqE';
const bot = new TelegramBot(token, { polling: true });

// ─── Bot Interaction (Listener) ─────────────────────────────────────────────

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const welcomeText = 
    `👋 *Namaste! Welcome to Kisan Weather Bot.*\n\n` +
    `I provide proactive alerts for heavy rain, frost (paala), and storms.\n\n` +
    `📍 *To start receiving alerts:* Please share your location using the button below.`;

  bot.sendMessage(chatId, welcomeText, {
    parse_mode: 'Markdown',
    reply_markup: {
      keyboard: [[{ text: '📍 Share Location', request_location: true }]],
      resize_keyboard: true,
      one_time_keyboard: true
    }
  });
});

bot.on('location', async (msg) => {
  const chatId = msg.chat.id;
  const { latitude, longitude } = msg.location;

  bot.sendMessage(chatId, "⌛ Registering your location... Please wait.");

  try {
    // Register via the backend API instead of direct Firestore to reuse server credentials
    const response = await axios.post(`http://localhost:${process.env.PORT || 3000}/api/register-farmer`, {
      chatId,
      latitude,
      longitude,
      city: "Shared Location"
    });

    if (response.data.success) {
      const successMsg = 
        `✅ *Success! You are registered.*\n\n` +
        `I will now monitor your area and send you alerts if heavy rain or frost is predicted.\n\n` +
        `Stay safe! 🌾`;
      
      bot.sendMessage(chatId, successMsg, { parse_mode: 'Markdown' });
    } else {
      throw new Error(response.data.error || 'API failed');
    }
  } catch (error) {
    console.error('Error registering farmer:', error.message);
    if (error.response) {
      console.error('API Response Error:', error.response.data);
    }
    bot.sendMessage(chatId, "❌ Sorry, registration failed. Please try again later.");
  }
});

// ─── Alert System (Scheduler) ────────────────────────────────────────────────

const checkWeatherAndAlert = async () => {
  console.log(`[${new Date().toISOString()}] Running weather alert check...`);
  
  try {
    // Fetch farmers via API instead of direct Firestore
    const response = await axios.get(`http://localhost:${process.env.PORT || 3000}/api/farmers-list`);
    const farmers = response.data.farmers;

    if (!farmers || farmers.length === 0) {
      console.log('No registered farmers found.');
      return;
    }

    for (const farmer of farmers) {
      const { chatId, latitude, longitude, city } = farmer;

      if (!chatId || latitude === undefined || longitude === undefined) continue;

      const weatherAlerts = await getAlertsFromOpenMeteo(latitude, longitude);
      
      if (weatherAlerts.length > 0) {
        const msg = `🌾 *Kisan Alert: ${city || 'Your Area'}*\n\n` + weatherAlerts.join('\n');
        await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
        console.log(`Sent alert to ${chatId} for ${city}`);
      }
    }
  } catch (error) {
    console.error('Error in alert system:', error.message);
  }
};

const getAlertsFromOpenMeteo = async (lat, lon) => {
  try {
    const url = 'https://api.open-meteo.com/v1/forecast';
    const params = {
      latitude: lat,
      longitude: lon,
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum',
      timezone: 'auto',
      forecast_days: 1
    };

    const response = await axios.get(url, { params });
    const daily = response.data.daily;
    const weatherCode = daily.weather_code[0];
    const minTemp = daily.temperature_2m_min[0];
    const precip = daily.precipitation_sum[0];

    const alerts = [];
    if (weatherCode >= 60) {
      if (precip > 10) {
        alerts.push('🌧️ Heavy Rain Alert! Today expect heavy precipitation.');
      } else {
        alerts.push('🌦️ Rain Alert! Carry an umbrella or protect your crops.');
      }
    }

    if (minTemp <= 2) {
      alerts.push('❄️ Frost Warning (Paala)! Temperature will drop near freezing. Protect sensitive crops.');
    }

    if (weatherCode >= 95) {
      alerts.push('⛈️ Thunderstorm Warning! Stay safe indoors.');
    }

    return alerts;
  } catch (error) {
    console.error(`Weather fetch error for ${lat},${lon}:`, error.message);
    return [];
  }
};

// Schedule: Every 4 hours (At minute 0 of every 4th hour)
cron.schedule('0 */4 * * *', () => {
  checkWeatherAndAlert();
});

// Run once on startup
checkWeatherAndAlert();

console.log('🚀 Telegram Bot Listener & Alert System started in Node.js');
