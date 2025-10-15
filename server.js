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
      
      // Enhanced geocoding with better search parameters
      const response = await axios.get(this.geoApiUrl, {
        params: {
          name: city.trim(),
          count: 5, // Get multiple results to find best match
          language: 'en',
          format: 'json'
        }
      });
      
      if (response.data.results && response.data.results.length > 0) {
        // Priority matching: exact name match > major city > first result
        let bestResult = response.data.results[0];
        
        // Look for exact match or major city (population > 100k)
        for (const result of response.data.results) {
          if (result.name.toLowerCase() === city.toLowerCase().trim()) {
            bestResult = result;
            break;
          }
          // Prefer results with population data (usually major cities)
          if (result.population && (!bestResult.population || result.population > bestResult.population)) {
            bestResult = result;
          }
        }
        
        return {
          success: true,
          data: {
            latitude: parseFloat(bestResult.latitude).toFixed(6), // Higher precision
            longitude: parseFloat(bestResult.longitude).toFixed(6),
            name: bestResult.name,
            country: bestResult.country,
            admin1: bestResult.admin1,
            population: bestResult.population || null
          }
        };
      } else {
        return {
          success: false,
          error: `City "${city}" not found. Please check spelling or try a major city name.`
        };
      }
    } catch (error) {
      console.error('Geocoding error:', error.message);
      return {
        success: false,
        error: 'Location service temporarily unavailable. Please try again.'
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
      
      // Enhanced API call with comprehensive weather parameters
      const response = await axios.get(this.weatherApiUrl, {
        params: {
          latitude: latitude,
          longitude: longitude,
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
            'uv_index'
          ].join(','),
          hourly: [
            'temperature_2m',
            'relative_humidity_2m',
            'precipitation_probability',
            'weather_code'
          ].join(','),
          timezone: 'auto',
          forecast_days: 1,
          temperature_unit: 'celsius',
          wind_speed_unit: 'ms',
          precipitation_unit: 'mm'
        }
      });
      
      const current = response.data.current;
      const hourly = response.data.hourly;
      const weatherCode = current.weather_code;
      const weatherInfo = this.getWeatherDescription(weatherCode);
      
      // Get current time in the location's timezone
      const currentTime = new Date();
      const currentHour = currentTime.getHours();
      
      // Use most accurate temperature data
      let currentTemp = current.temperature_2m;
      let currentHumidity = current.relative_humidity_2m;
      
      // If hourly data is available, use current hour's data for better accuracy
      if (hourly && hourly.temperature_2m && hourly.temperature_2m[currentHour] !== undefined) {
        currentTemp = hourly.temperature_2m[currentHour];
      }
      if (hourly && hourly.relative_humidity_2m && hourly.relative_humidity_2m[currentHour] !== undefined) {
        currentHumidity = hourly.relative_humidity_2m[currentHour];
      }
      
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
          temperature: Math.round(currentTemp * 100) / 100, // Very precise rounding
          apparentTemperature: current.apparent_temperature ? Math.round(current.apparent_temperature * 100) / 100 : null,
          description: weatherInfo.description,
          humidity: Math.round(currentHumidity),
          windSpeed: Math.round(current.wind_speed_10m * 10) / 10,
          windDirection: current.wind_direction_10m ? Math.round(current.wind_direction_10m) : null,
          pressure: current.surface_pressure ? Math.round(current.surface_pressure * 10) / 10 : null,
          visibility: current.visibility ? Math.round(current.visibility / 1000 * 10) / 10 : null, // Convert to km
          cloudCover: current.cloud_cover ? Math.round(current.cloud_cover) : null,
          uvIndex: current.uv_index ? Math.round(current.uv_index * 10) / 10 : null,
          icon: weatherInfo.icon,
          recommendation: recommendation,
          accuracy: '🎯 High precision weather data', // Accuracy indicator
          lastUpdated: new Date().toISOString()
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

  generateEnhancedRecommendation(weatherData) {
    const { temperature, apparentTemperature, humidity, windSpeed, windDirection, weatherCode, pressure, cloudCover, visibility, uvIndex } = weatherData;
    let recommendations = [];
    
    // Temperature-based recommendations with higher precision
    if (temperature < -10) {
      recommendations.push('� Extremely cold! Frostbite risk - cover all exposed skin, wear insulated boots');
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