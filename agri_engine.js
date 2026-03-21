class AgriEngine {
  
  // FEATURE 3 - Soil Condition Monitoring
  static getSoilAdvisory(currentMetrics, dailyForecast, profile) {
    const moisture = currentMetrics.soilMoisture || 0;
    const temp = currentMetrics.soilTemperature || 0;
    const rainForecast7Days = dailyForecast.reduce((sum, day) => sum + (day.precip || 0), 0);
    
    let moistureLevel = 'Optimal';
    if (moisture < 0.15) moistureLevel = 'Dry';
    if (moisture > 0.40) moistureLevel = 'Saturated';
    
    let waterloggingRisk = 'Low';
    if (moisture > 0.35 && rainForecast7Days > 20) waterloggingRisk = 'High';
    else if (moisture > 0.3) waterloggingRisk = 'Medium';
    
    let tillage = 'Good';
    if (moistureLevel === 'Saturated') tillage = 'Wait';
    if (moistureLevel === 'Dry' && temp > 35) tillage = 'Not recommended';
    
    let germination = 'Wait';
    if (temp >= 15 && temp <= 30 && moistureLevel !== 'Dry') germination = 'Good';
    
    const recommendations = [];
    if (waterloggingRisk === 'High') recommendations.push('Wait 2 days before irrigation — soil is near saturation.');
    else if (tillage === 'Good' && profile.growthStage === 'pre-sowing') recommendations.push('Soil is ready for sowing.');
    else if (moistureLevel === 'Dry') recommendations.push(`Soil moisture critically low for ${profile.cropType}.`);
    else recommendations.push('Soil conditions are currently stable for operations.');

    return {
      moistureLevel,
      temperature5cm: temp,
      temperature10cm: temp - 1, // rough estimate
      waterloggingRisk,
      tillageSuitability: tillage,
      germinationSuitability: germination,
      recommendation: recommendations[0]
    };
  }

  // FEATURE 4 - Irrigation Advisory
  static getIrrigationAdvisory(currentMetrics, dailyForecast, profile, soilAdvisory) {
    const et0 = currentMetrics.evapotranspiration || 4; // default
    const rain24h = (dailyForecast[0]?.precip || 0) + (dailyForecast[1]?.precip || 0);
    const method = profile.irrigationMethod || 'rainfed';
    
    let needed = 'No';
    let waterQuantity = 0;
    let timing = 'Avoid today';
    let reason = 'Sufficient moisture available.';
    
    if (rain24h > 10) {
      needed = 'No';
      reason = `Rainfall of ~${Math.round(rain24h)}mm expected in next 24-48h. Skip irrigation.`;
    } else if (method === 'rainfed') {
      needed = 'Optional';
      reason = 'Crop is rainfed. Apply supplementary irrigation only if severely stressed.';
    } else if (soilAdvisory.moistureLevel === 'Dry' || et0 > 3) {
      needed = 'Yes';
      waterQuantity = et0 * 1.5; // simple replenishment calculation
      timing = 'Early morning';
      reason = `ET0 (${et0}mm) exceeds moisture. Replenish immediately.`;
    } else {
      needed = 'Optional';
      timing = 'Evening';
      reason = 'Soil moisture is optimal, but light watering can reduce heat stress.';
    }
    
    // Calculate next irrigation date simple offset
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + (needed === 'Yes' ? 1 : 3));

    return {
      needed,
      recommendedQuantity: `${Math.round(waterQuantity * 10) / 10} mm/acre`,
      bestTime: timing,
      nextIrrigationDate: nextDate.toISOString().split('T')[0],
      reason
    };
  }

  // FEATURE 5 - Pest & Disease Risk
  static getPestDiseaseAlerts(currentMetrics, dailyForecast, profile) {
    const humidity = currentMetrics.humidity || 50;
    const temp = currentMetrics.temperature || 25;
    const dewPoint = currentMetrics.dewPoint || temp - 5;
    const hasRain = dailyForecast[0]?.precip > 5;
    
    const risks = [];
    
    // Rules
    if (humidity > 80) { // Should ideally be 3 consecutive days, but estimating from high current humidity
      risks.push({
        level: '🔴 High',
        pest: 'Fungal Blight / Mildew',
        trigger: 'Humidity > 80% creating fungal breeding ground',
        action: 'Apply preventive fungicide spray within 24h.'
      });
    }
    if (temp >= 20 && temp <= 30 && humidity > 75) {
      risks.push({
        level: '🟡 Medium',
        pest: 'Bacterial Infection',
        trigger: 'Warm and humid conditions favorable for bacteria',
        action: 'Ensure field drainage and avoid overhead irrigation.'
      });
    }
    if (temp > 35 && humidity < 40) {
      risks.push({
        level: '🟡 Medium',
        pest: 'Spider Mites / Aphids',
        trigger: 'Temperature > 35°C and dry conditions',
        action: 'Monitor field edges closely. Consider light foliage spray.'
      });
    }
    if (hasRain && temp > 25) {
      risks.push({
        level: '🟡 Medium',
        pest: 'Armyworm Activity Risk',
        trigger: 'Post-rain warm spell',
        action: 'Set pheromone traps. Inspect crop whorls for young larvae.'
      });
    }
    if (Math.abs(temp - dewPoint) < 2) {
      risks.push({
        level: '🔴 High',
        pest: 'Rust / Spore Germination',
        trigger: 'Dew point near air temperature at dawn',
        action: 'Avoid entering field while wet. Plan sulfur-based spray.'
      });
    }
    
    if (risks.length === 0) {
      risks.push({
        level: '🟢 Low',
        pest: 'General Pest Risk',
        trigger: 'Conditions unfavorable for major outbreaks',
        action: 'Continue standard scouting schedule.'
      });
    }
    
    return risks;
  }

  // FEATURE 6 - Frost, Heat & Extreme Weather
  static getExtremeAlerts(profile, dailyForecast) {
    const alerts = [];
    const crop = profile.cropType || 'Crop';
    const stage = profile.growthStage || 'growing';
    
    let highTempCount = 0;
    let dryDays = 0;
    
    for (let i = 0; i < Math.min(dailyForecast.length, 10); i++) {
      const day = dailyForecast[i];
      if (i < 3 && day.tempMin <= 2) {
        alerts.push({
          type: 'Frost Alert',
          icon: '❄️',
          message: `⚠️ Frost Warning: Protect ${crop} tonight. Cover young plants or use sprinkler bypass. Expected low: ${day.tempMin}°C on ${day.date}.`
        });
      }
      
      if (day.tempMax >= 40) highTempCount++;
      else highTempCount = 0;
      
      if (highTempCount >= 2) {
        alerts.push({
          type: 'Heat Stress Alert',
          icon: '🌡️',
          message: `Heat Stress Alert: ${crop} at ${stage} stage is at risk. Irrigate in early morning, apply mulch if possible.`
        });
        highTempCount = 0; // reset to avoid duplicates
      }
      
      if (i === 0 && day.precip > 50) {
        alerts.push({
          type: 'Heavy Rain Alert',
          icon: '🌧️',
          message: `Heavy Rain Warning: ${Math.round(day.precip)}mm expected. Risk of waterlogging. Ensure drainage is clear.`
        });
      }
      
      if (day.precip < 1) dryDays++;
      else dryDays = 0;
      
      if (dryDays >= 10 && i === 9) { // Trigger only once when identifying a dry stretch
        alerts.push({
          type: 'Dry Spell Alert',
          icon: '☀️',
          message: `Dry Spell Alert: No significant rain for 10+ days. Evapotranspiration is high. Prioritize irrigation for ${crop} within 48h.`
        });
      }
    }
    
    return alerts;
  }

  // FEATURE 7 - Seasonal Trend Analysis (Simulated based on short-term + typical deviations)
  static getSeasonalAnalysis(dailyForecast) {
    const rainSum = dailyForecast.reduce((sum, day) => sum + (day.precip || 0), 0);
    const rainDays = dailyForecast.filter(day => (day.precip || 0) > 1).length;
    
    const historicalRainAvg = 40; // mock mm baseline for 14 days
    const rainDev = rainSum - historicalRainAvg;
    const classification = rainDev < -20 ? 'Drought Risk' : (rainDev > 30 ? 'Flood Risk' : 'Near Normal');
    
    return {
      rainToDate: Math.round(rainSum),
      historicalAvg: historicalRainAvg,
      deviationClass: classification,
      rainyDays: rainDays,
      historicalRainyDays: 4,
      outlook: `This period is showing ${Math.abs(Math.round((rainDev / historicalRainAvg) * 100))}% ${rainDev > 0 ? 'more' : 'less'} rainfall than normal. Yields may be impacted if deviation continues.`
    };
  }

  // FEATURE 8 - Geo-Based Micro-Climate Zones
  static getMicroClimates(profile, currentMetrics) {
    const size = parseFloat(profile.farmSize) || 0;
    if (size <= 10) return null; // Only for > 10 acres
    
    const baseTemp = currentMetrics.temperature || 25;
    
    return [
      {
        zoneName: 'North Field (Elevated)',
        tempVariation: `${Math.round((baseTemp - 1.2)*10)/10}°C (-1.2°C)`,
        moistureEstimate: 'Well Drained',
        advisory: 'Wind exposed. Good drainage but dries out faster. Needs 10% more irrigation.'
      },
      {
        zoneName: 'Low-lying South Patch',
        tempVariation: `${Math.round((baseTemp + 0.5)*10)/10}°C (+0.5°C)`,
        moistureEstimate: 'High Retention',
        advisory: 'Low-lying south patch at high waterlogging risk — monitor drainage closely after rain.'
      },
      {
        zoneName: 'Tree-Line East',
        tempVariation: `${Math.round((baseTemp - 0.8)*10)/10}°C (-0.8°C)`,
        moistureEstimate: 'Optimal',
        advisory: 'Shaded during mornings. Lower ET0, adjust scheduled irrigation volume down by 5%.'
      }
    ];
  }

  // Main aggregator for the dashboard
  static generateDashboard(currentWeather, forecastData, profile) {
    const currentMetrics = {
      temperature: currentWeather.temperature,
      humidity: currentWeather.humidity,
      windSpeed: currentWeather.windSpeed,
      uvIndex: currentWeather.uvIndex,
      ...currentWeather.advancedData // Contains soilTemp, soilMoisture, et0, dewPoint
    };
    
    const dailyForecast = forecastData.forecast;

    const soilAdvisory = this.getSoilAdvisory(currentMetrics, dailyForecast, profile);
    const irrigationAdvisory = this.getIrrigationAdvisory(currentMetrics, dailyForecast, profile, soilAdvisory);
    const pestAlerts = this.getPestDiseaseAlerts(currentMetrics, dailyForecast, profile);
    const extremeAlerts = this.getExtremeAlerts(profile, dailyForecast);
    const seasonal = this.getSeasonalAnalysis(dailyForecast);
    const microClimates = this.getMicroClimates(profile, currentMetrics);

    // Feature 2: 7-14 Day specific crop advisory map
    const forecastWithAdvisories = dailyForecast.map(day => {
      let fAdv = `Ideal day for ${profile.cropType} growth.`;
      if (day.precip > 5) fAdv = `Avoid spraying pesticides today — rain (~${Math.round(day.precip)}mm) likely to wash off chemicals.`;
      else if (day.tempMax > 38 && profile.growthStage === 'flowering') fAdv = 'High heat during flowering — pollen viability at risk. Provide light evening irrigation.';
      else if (day.windSpeedMax > 20) fAdv = 'High winds expected. Suspend aerial spraying and secure tall crops.';
      
      return {
        ...day,
        cropAdvisory: fAdv
      };
    });

    return {
      profile,
      timestamp: new Date().toISOString(),
      currentMetrics,
      forecast: forecastWithAdvisories,
      soilAdvisory,
      irrigationAdvisory,
      pestAlerts,
      extremeAlerts,
      seasonalAnalysis: seasonal,
      microClimates: microClimates || undefined
    };
  }
}

module.exports = AgriEngine;
