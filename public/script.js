class WeatherApp {
    constructor() {
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const searchBtn = document.getElementById('searchBtn');
        const cityInput = document.getElementById('cityInput');
        const askAiBtn = document.getElementById('askAiBtn');
        const aiQuery = document.getElementById('aiQuery');

        searchBtn.addEventListener('click', () => this.searchWeather());
        cityInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchWeather();
            }
        });

        askAiBtn.addEventListener('click', () => this.askWeatherAI());
        aiQuery.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.askWeatherAI();
            }
        });
    }

    async searchWeather() {
        const city = document.getElementById('cityInput').value.trim();
        
        if (!city) {
            this.showError('Please enter a city name');
            return;
        }

        this.showLoading();

        try {
            // Get current weather
            const weatherResponse = await fetch(`/api/weather/${encodeURIComponent(city)}`);
            const weatherData = await weatherResponse.json();

            if (!weatherData.success) {
                this.showError(weatherData.error);
                return;
            }

            // Get forecast
            const forecastResponse = await fetch(`/api/forecast/${encodeURIComponent(city)}`);
            const forecastData = await forecastResponse.json();

            this.displayWeather(weatherData.data);
            
            if (forecastData.success) {
                this.displayForecast(forecastData.data);
            }

        } catch (error) {
            this.showError('Failed to fetch weather data. Please try again.');
        }
    }

    showLoading() {
        const weatherDisplay = document.getElementById('weatherDisplay');
        weatherDisplay.innerHTML = '<div class="loading">🌀 Loading weather data...</div>';
        weatherDisplay.style.display = 'block';
        document.getElementById('forecastSection').style.display = 'none';
    }

    showError(message) {
        const weatherDisplay = document.getElementById('weatherDisplay');
        weatherDisplay.innerHTML = `<div class="error">❌ ${message}</div>`;
        weatherDisplay.style.display = 'block';
        document.getElementById('forecastSection').style.display = 'none';
    }

    displayWeather(data) {
        const weatherDisplay = document.getElementById('weatherDisplay');
        
        weatherDisplay.innerHTML = `
            <div class="weather-card">
                <div class="weather-info">
                    <h2>${Math.round(data.temperature)}°C</h2>
                    <div class="location">${data.city}, ${data.country}</div>
                    <div class="description">${this.capitalizeWords(data.description)}</div>
                </div>
                
                <div class="weather-icon">
                    <div class="icon-display">${this.getWeatherEmoji(data.icon)}</div>
                </div>
                
                <div class="weather-details">
                    <div class="detail-item">
                        <div class="label">Humidity</div>
                        <div class="value">${data.humidity}%</div>
                    </div>
                    <div class="detail-item">
                        <div class="label">Wind Speed</div>
                        <div class="value">${data.windSpeed} m/s</div>
                    </div>
                </div>
            </div>
            
            <div class="recommendation">
                💡 <strong>Recommendation:</strong> ${data.recommendation}
            </div>
        `;
        
        weatherDisplay.style.display = 'block';
    }

    displayForecast(data) {
        const forecastSection = document.getElementById('forecastSection');
        const forecastGrid = document.getElementById('forecastGrid');
        
        forecastGrid.innerHTML = data.forecast.map(day => `
            <div class="forecast-card">
                <div class="date">${day.date}</div>
                <div class="forecast-icon">${this.getWeatherEmoji(day.icon)}</div>
                <div class="temp">${Math.round(day.temperature)}°C</div>
                <div class="description">${this.capitalizeWords(day.description)}</div>
            </div>
        `).join('');
        
        forecastSection.style.display = 'block';
    }

    capitalizeWords(str) {
        return str.replace(/\w\S*/g, (txt) => 
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
    }

    async askWeatherAI() {
        const query = document.getElementById('aiQuery').value.trim();
        
        if (!query) {
            this.showAIError('Please ask me a weather question!');
            return;
        }

        this.showAILoading();

        try {
            // Extract city from query if mentioned
            const cityFromQuery = this.extractCityFromQuery(query);
            
            const response = await fetch('/api/weather-assistant', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: query,
                    city: cityFromQuery
                })
            });

            const data = await response.json();

            if (data.success) {
                this.displayAIResponse(data.data.aiResponse);
            } else {
                this.showAIError(data.error);
            }

        } catch (error) {
            this.showAIError('Failed to get AI response. Please try again.');
        }
    }

    extractCityFromQuery(query) {
        // Simple city extraction - can be enhanced
        const commonCities = [
            'mumbai', 'delhi', 'bangalore', 'chennai', 'kolkata', 'hyderabad',
            'pune', 'ahmedabad', 'surat', 'jaipur', 'lucknow', 'kanpur',
            'london', 'paris', 'tokyo', 'new york', 'los angeles', 'chicago',
            'toronto', 'sydney', 'melbourne', 'singapore', 'dubai', 'cairo'
        ];
        
        const queryLower = query.toLowerCase();
        for (let city of commonCities) {
            if (queryLower.includes(city)) {
                return city;
            }
        }
        
        // Try to extract city name after 'in' keyword
        const inMatch = queryLower.match(/in\s+([a-zA-Z\s]+?)(?:\s|$|[,.])/);
        if (inMatch) {
            return inMatch[1].trim();
        }
        
        return null;
    }

    showAILoading() {
        const aiResponse = document.getElementById('aiResponse');
        aiResponse.innerHTML = '<div class="loading-ai">🤖 AI thinking about weather...</div>';
        aiResponse.style.display = 'block';
    }

    showAIError(message) {
        const aiResponse = document.getElementById('aiResponse');
        aiResponse.innerHTML = `<div class="ai-error">${message}</div>`;
        aiResponse.style.display = 'block';
    }

    displayAIResponse(response) {
        const aiResponse = document.getElementById('aiResponse');
        aiResponse.innerHTML = `<div class="chat-response">${response}</div>`;
        aiResponse.style.display = 'block';
    }

    getWeatherEmoji(iconCode) {
        const iconMap = {
            '01d': '☀️',  // clear sky
            '02d': '⛅',  // partly cloudy
            '03d': '☁️',  // overcast
            '09d': '🌦️',  // drizzle/light rain
            '10d': '🌧️',  // rain
            '11d': '⛈️',  // thunderstorm
            '13d': '❄️',  // snow
            '50d': '🌫️'   // fog
        };
        return iconMap[iconCode] || '🌤️';
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new WeatherApp();
});