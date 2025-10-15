# Weather Agent 🌤️

A modern weather agent application that provides current weather information, forecasts, and personalized recommendations for any city worldwide.

## Features

- **Current Weather**: Get real-time weather information for any city
- **5-Day Forecast**: View upcoming weather predictions
- **Smart Recommendations**: Receive personalized suggestions based on weather conditions
- **Modern UI**: Clean, responsive design that works on all devices
- **Fast & Reliable**: Built with Node.js and Express for optimal performance

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run the Application**
   ```bash
   npm start
   ```

3. **Open in Browser**
   Navigate to `http://localhost:3000`

No API key required! This app uses the free Open-Meteo API.

## Development

For development with auto-reload:
```bash
npm run dev
```

## API Endpoints

- `GET /api/weather/:city` - Get current weather for a city
- `GET /api/forecast/:city` - Get 5-day forecast for a city

## Project Structure

```
weather-agent/
├── public/           # Frontend files
│   ├── index.html   # Main HTML page
│   ├── style.css    # Styling
│   └── script.js    # Frontend JavaScript
├── server.js        # Express server and weather logic
├── package.json     # Project dependencies
└── .env.example     # Environment variables template
```

## Technologies Used

- **Backend**: Node.js, Express.js
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **API**: Open-Meteo API (free, no API key required)
- **Styling**: Modern CSS with gradients and animations

## Features Overview

### Weather Information
- Current temperature, humidity, wind speed
- Weather description and icon
- City and country identification

### Smart Recommendations
The agent provides intelligent suggestions based on:
- Temperature ranges (clothing recommendations)
- Weather conditions (umbrella for rain, etc.)
- Safety tips for severe weather

### Responsive Design
- Mobile-first design approach
- Adaptive layout for all screen sizes
- Modern UI with smooth animations

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License - feel free to use this project for learning and development.