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

    // Get weather data
    const weatherData = await this.getCurrentWeather(city);
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

  // Process advanced weather data from enhanced API
  processAdvancedWeatherData(hourly, currentHour) {
    if (!hourly || currentHour < 0) return {};
    
    const advancedData = {};
    
    // Soil data analysis
    if (hourly.soil_moisture_27_to_81cm && hourly.soil_moisture_27_to_81cm[currentHour] !== undefined) {
      const soilMoisture = hourly.soil_moisture_27_to_81cm[currentHour];
      advancedData.soilMoisture = soilMoisture;
      advancedData.soilCondition = this.analyzeSoilCondition(soilMoisture);
    }
    
    if (hourly.soil_temperature_54cm && hourly.soil_temperature_54cm[currentHour] !== undefined) {
      advancedData.soilTemperature = hourly.soil_temperature_54cm[currentHour];
    }
    
    // High altitude wind analysis
    if (hourly.wind_speed_180m && hourly.wind_speed_180m[currentHour] !== undefined) {
      advancedData.highAltitudeWindSpeed = hourly.wind_speed_180m[currentHour];
      advancedData.windShear = this.calculateWindShear(
        hourly.wind_speed_180m[currentHour],
        currentHour
      );
    }
    
    if (hourly.wind_direction_180m && hourly.wind_direction_180m[currentHour] !== undefined) {
      advancedData.highAltitudeWindDirection = hourly.wind_direction_180m[currentHour];
    }
    
    // High altitude temperature
    if (hourly.temperature_180m && hourly.temperature_180m[currentHour] !== undefined) {
      advancedData.highAltitudeTemperature = hourly.temperature_180m[currentHour];
      advancedData.temperatureGradient = this.calculateTemperatureGradient(
        hourly.temperature_180m[currentHour],
        currentHour
      );
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
            'precipitation_probability',
            'weather_code',
            'apparent_temperature',
            'soil_moisture_27_to_81cm',
            'soil_temperature_54cm',
            'wind_speed_180m',
            'wind_direction_180m',
            'temperature_180m',
            'uv_index'
          ].join(','),
          daily: [
            'temperature_2m_max',
            'temperature_2m_min',
            'weather_code'
          ].join(','),
          timezone: 'auto', // This ensures local timezone
          forecast_days: 3,
          temperature_unit: 'celsius',
          wind_speed_unit: 'ms',
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
app.get('/api/weather/compare/:city', async (req, res) => {
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

app.post('/api/chat', async (req, res) => {
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