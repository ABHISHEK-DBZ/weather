const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files with proper MIME types
app.use(express.static('public', {
  setHeaders: (res, path) => {
    if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// Weather service
class WeatherAgent {
  constructor() {
    this.geoApiUrl = 'https://geocoding-api.open-meteo.com/v1/search';
    this.weatherApiUrl = 'https://api.open-meteo.com/v1/forecast';
    this.airQualityUrl = 'https://air-quality-api.open-meteo.com/v1/air-quality';
  }

  // AI Weather Assistant
  async processWeatherQuery(query, city) {
    const weatherKeywords = {
      temperature: ['temperature', 'temp', 'hot', 'cold', 'warm', 'cool', 'degree'],
      rain: ['rain', 'raining', 'wet', 'precipitation', 'shower', 'drizzle'],
      wind: ['wind', 'windy', 'breeze', 'gust'],
      humidity: ['humidity', 'humid', 'moisture', 'dry'],
      forecast: ['tomorrow', 'week', 'forecast', 'future', 'next', 'upcoming'],
      clothing: ['wear', 'clothes', 'dress', 'outfit', 'jacket', 'umbrella'],
      activities: ['outdoor', 'picnic', 'travel', 'sport', 'exercise', 'walk'],
      comparison: ['compare', 'vs', 'difference', 'better', 'warmer', 'colder']
    };

    // Check if query is weather-related
    const isWeatherQuery = Object.values(weatherKeywords).some(keywords =>
      keywords.some(keyword => query.toLowerCase().includes(keyword))
    );

    if (!isWeatherQuery && !city) {
      return {
        success: false,
        error: "I'm a weather assistant! Please ask me about weather, temperature, rain, or weather-related activities. 🌤️"
      };
    }

    // Get weather data
    const weatherData = await this.getCurrentWeather(city);
    if (!weatherData.success) {
      return weatherData;
    }

    // Generate AI response based on query type
    return this.generateIntelligentResponse(query, weatherData.data, weatherKeywords);
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

  async getCoordinates(city) {
    try {
      const axios = require('axios');
      const response = await axios.get(this.geoApiUrl, {
        params: {
          name: city,
          count: 1,
          language: 'en',
          format: 'json'
        }
      });
      
      if (response.data.results && response.data.results.length > 0) {
        const result = response.data.results[0];
        return {
          success: true,
          data: {
            latitude: result.latitude,
            longitude: result.longitude,
            name: result.name,
            country: result.country,
            admin1: result.admin1
          }
        };
      } else {
        return {
          success: false,
          error: 'City not found'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: 'Geocoding service error'
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
      
      const response = await axios.get(this.weatherApiUrl, {
        params: {
          latitude,
          longitude,
          current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,apparent_temperature',
          hourly: 'temperature_2m',
          timezone: 'auto'
        }
      });
      
      const current = response.data.current;
      const weatherCode = current.weather_code;
      const weatherInfo = this.getWeatherDescription(weatherCode);
      
      // Get more accurate temperature by averaging recent hourly data
      const hourlyTemps = response.data.hourly.temperature_2m.slice(-3); // Last 3 hours
      const avgTemp = hourlyTemps.reduce((sum, temp) => sum + temp, 0) / hourlyTemps.length;
      
      return {
        success: true,
        data: {
          city: name,
          country: country,
          temperature: Math.round(avgTemp), // More accurate temperature
          apparentTemperature: Math.round(current.apparent_temperature),
          description: weatherInfo.description,
          humidity: current.relative_humidity_2m,
          windSpeed: Math.round(current.wind_speed_10m * 10) / 10, // Round to 1 decimal
          icon: weatherInfo.icon
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Weather service error'
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
          daily: 'temperature_2m_max,weather_code',
          timezone: 'auto',
          forecast_days: 5
        }
      });
      
      const daily = response.data.daily;
      const forecast = daily.time.map((date, index) => {
        const weatherInfo = this.getWeatherDescription(daily.weather_code[index]);
        return {
          date: new Date(date).toLocaleDateString(),
          temperature: Math.round(daily.temperature_2m_max[index]),
          description: weatherInfo.description,
          icon: weatherInfo.icon
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
      return {
        success: false,
        error: 'Forecast service error'
      };
    }
  }

  getWeatherDescription(code) {
    const weatherCodes = {
      0: { description: 'Clear sky', icon: '01d' },
      1: { description: 'Mainly clear', icon: '01d' },
      2: { description: 'Partly cloudy', icon: '02d' },
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
    
    return weatherCodes[code] || { description: 'Unknown', icon: '01d' };
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
app.post('/api/weather-assistant', async (req, res) => {
  const { query, city } = req.body;
  
  if (!query) {
    return res.json({
      success: false,
      error: "Please ask me a weather-related question! 🌤️"
    });
  }

  const response = await weatherAgent.processWeatherQuery(query, city);
  res.json(response);
});

app.get('/api/weather/:city', async (req, res) => {
  const { city } = req.params;
  const weather = await weatherAgent.getCurrentWeather(city);
  
  if (weather.success) {
    weather.data.recommendation = weatherAgent.getWeatherRecommendation(
      weather.data.temperature,
      weather.data.description
    );
  }
  
  res.json(weather);
});

app.get('/api/forecast/:city', async (req, res) => {
  const forecast = await weatherAgent.getForecast(req.params.city);
  res.json(forecast);
});

app.listen(PORT, () => {
  console.log(`Weather Agent server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to use the weather agent`);
});