class WeatherApp {
    constructor() {
        this.initializeEventListeners();
        this.showWelcomeMessage();
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

        // Add input focus effects
        cityInput.addEventListener('focus', () => {
            cityInput.parentElement.style.transform = 'translateY(-2px)';
        });
        
        cityInput.addEventListener('blur', () => {
            cityInput.parentElement.style.transform = 'translateY(0)';
        });
    }

    showWelcomeMessage() {
        // Show a welcome animation on page load
        setTimeout(() => {
            const header = document.querySelector('.header');
            header.style.animation = 'fadeInUp 1s ease';
        }, 500);
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
                this.hideLoading();
                this.showError(weatherData.error);
                return;
            }

            // Get forecast
            const forecastResponse = await fetch(`/api/forecast/${encodeURIComponent(city)}`);
            const forecastData = await forecastResponse.json();

            this.hideLoading();
            this.displayWeather(weatherData.data);
            
            if (forecastData.success) {
                this.displayForecast(forecastData.data);
            }

        } catch (error) {
            this.hideLoading();
            this.showError('Failed to fetch weather data. Please try again.');
            console.error('Weather fetch error:', error);
        }
    }

    showLoading() {
        const overlay = document.getElementById('loadingOverlay');
        overlay.style.display = 'flex';
        
        // Hide after timeout as fallback
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 10000);
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        overlay.style.display = 'none';
    }

    showError(message) {
        const weatherDisplay = document.getElementById('weatherDisplay');
        weatherDisplay.innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                <h3>Oops! Something went wrong</h3>
                <p>${message}</p>
                <button onclick="location.reload()" style="background: white; color: #ff6b6b; border: none; padding: 10px 20px; border-radius: 25px; margin-top: 1rem; cursor: pointer;">
                    <i class="fas fa-redo"></i> Try Again
                </button>
            </div>
        `;
        weatherDisplay.style.display = 'block';
        document.getElementById('forecastSection').style.display = 'none';
    }

    displayWeather(data) {
        const weatherDisplay = document.getElementById('weatherDisplay');
        
        // Add apparent temperature if available
        const feelsLike = data.apparentTemperature ? 
            `<div class="feels-like">Feels like ${data.apparentTemperature}°C</div>` : '';
        
        weatherDisplay.innerHTML = `
            <div class="weather-card">
                <div class="weather-info">
                    <h2>${data.temperature}°C</h2>
                    ${feelsLike}
                    <div class="location">
                        <i class="fas fa-map-marker-alt"></i>
                        ${data.city}, ${data.country}
                    </div>
                    <div class="description">${this.capitalizeWords(data.description)}</div>
                </div>
                
                <div class="weather-icon">
                    <div class="icon-display">${this.getWeatherEmoji(data.icon)}</div>
                </div>
                
                <div class="weather-stats">
                    <div class="stat-item">
                        <i class="fas fa-thermometer-half"></i>
                        <span>Temperature</span>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-eye"></i>
                        <span>Clear View</span>
                    </div>
                </div>
            </div>
            
            <div class="weather-details">
                <div class="detail-item">
                    <div class="label">
                        <i class="fas fa-tint"></i> Humidity
                    </div>
                    <div class="value">${data.humidity}%</div>
                </div>
                <div class="detail-item">
                    <div class="label">
                        <i class="fas fa-wind"></i> Wind Speed
                    </div>
                    <div class="value">${data.windSpeed} m/s</div>
                </div>
                <div class="detail-item">
                    <div class="label">
                        <i class="fas fa-compass"></i> Condition
                    </div>
                    <div class="value">${this.getConditionText(data.description)}</div>
                </div>
                <div class="detail-item">
                    <div class="label">
                        <i class="fas fa-clock"></i> Updated
                    </div>
                    <div class="value">Now</div>
                </div>
            </div>
            
            <div class="recommendation">
                <i class="fas fa-lightbulb" style="font-size: 1.5rem; margin-bottom: 1rem; display: block;"></i>
                <strong>Smart Recommendation:</strong><br>
                ${data.recommendation}
            </div>
        `;
        
        weatherDisplay.style.display = 'block';
        
        // Scroll to weather display
        setTimeout(() => {
            weatherDisplay.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    }

    displayForecast(data) {
        const forecastSection = document.getElementById('forecastSection');
        const forecastGrid = document.getElementById('forecastGrid');
        
        forecastGrid.innerHTML = data.forecast.map((day, index) => `
            <div class="forecast-card" style="animation-delay: ${index * 0.1}s">
                <div class="date">
                    <i class="fas fa-calendar"></i>
                    ${day.date}
                </div>
                <div class="forecast-icon">${this.getWeatherEmoji(day.icon)}</div>
                <div class="temp">${day.temperature}°C</div>
                <div class="description">${this.capitalizeWords(day.description)}</div>
                <div class="forecast-details">
                    <small><i class="fas fa-arrow-up"></i> High: ${day.temperature}°C</small>
                </div>
            </div>
        `).join('');
        
        forecastSection.style.display = 'block';
        
        // Animate forecast cards
        const cards = forecastGrid.querySelectorAll('.forecast-card');
        cards.forEach((card, index) => {
            setTimeout(() => {
                card.style.animation = 'fadeInUp 0.6s ease forwards';
            }, index * 100);
        });
    }

    capitalizeWords(str) {
        return str.replace(/\w\S*/g, (txt) => 
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
    }

    getConditionText(description) {
        const desc = description.toLowerCase();
        if (desc.includes('clear')) return 'Clear';
        if (desc.includes('cloud')) return 'Cloudy';
        if (desc.includes('rain')) return 'Rainy';
        if (desc.includes('snow')) return 'Snowy';
        if (desc.includes('fog')) return 'Foggy';
        return 'Mixed';
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
            console.error('AI request error:', error);
        }
    }

    extractCityFromQuery(query) {
        // Enhanced city extraction
        const commonCities = [
            'mumbai', 'delhi', 'bangalore', 'chennai', 'kolkata', 'hyderabad',
            'pune', 'ahmedabad', 'surat', 'jaipur', 'lucknow', 'kanpur',
            'london', 'paris', 'tokyo', 'new york', 'los angeles', 'chicago',
            'toronto', 'sydney', 'melbourne', 'singapore', 'dubai', 'cairo',
            'moscow', 'berlin', 'madrid', 'rome', 'amsterdam', 'zurich'
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
        aiResponse.innerHTML = `
            <div class="loading-ai">
                <i class="fas fa-robot fa-spin" style="font-size: 2rem; margin-bottom: 1rem; color: #667eea;"></i>
                <p>AI is analyzing weather patterns...</p>
            </div>
        `;
        aiResponse.style.display = 'block';
    }

    showAIError(message) {
        const aiResponse = document.getElementById('aiResponse');
        aiResponse.innerHTML = `
            <div class="ai-error">
                <i class="fas fa-exclamation-triangle" style="font-size: 1.5rem; margin-bottom: 1rem;"></i>
                <p>${message}</p>
            </div>
        `;
        aiResponse.style.display = 'block';
    }

    displayAIResponse(response) {
        const aiResponse = document.getElementById('aiResponse');
        aiResponse.innerHTML = `
            <div class="chat-response">
                <div style="display: flex; align-items: center; margin-bottom: 1rem;">
                    <i class="fas fa-robot" style="font-size: 1.5rem; margin-right: 0.5rem;"></i>
                    <strong>AI Weather Assistant</strong>
                </div>
                ${response}
            </div>
        `;
        aiResponse.style.display = 'block';
        
        // Scroll to AI response
        setTimeout(() => {
            aiResponse.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
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
    
    // Add some interactive effects
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'translateY(-2px)';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'translateY(0)';
        });
    });
});