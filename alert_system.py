import time
import requests
import os
from datetime import datetime
from apscheduler.schedulers.blocking import BlockingScheduler
import firebase_admin
from firebase_admin import credentials, firestore

# Configuration
TELEGRAM_TOKEN = "8384920616:AAGxeh11pvVdUdHcMZidEHAGmcqqGdL9QqE"
# Note: Use environment variable in production
# os.environ.get("TELEGRAM_BOT_TOKEN")

# Initialize Firebase
# You need to have either GOOGLE_APPLICATION_CREDENTIALS set 
# or use a service account key file
if not firebase_admin._apps:
    cred = credentials.ApplicationDefault()
    firebase_admin.initialize_app(cred)

db = firestore.client()

def get_weather_alerts(lat, lon):
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": ["weather_code", "temperature_2m_max", "temperature_2m_min", "precipitation_sum"],
        "timezone": "auto",
        "forecast_days": 1
    }
    try:
        response = requests.get(url, params=params)
        data = response.json()
        daily = data.get("daily", {})
        
        weather_code = daily.get("weather_code", [0])[0]
        min_temp = daily.get("temperature_2m_min", [99])[0]
        precip = daily.get("precipitation_sum", [0])[0]
        
        alerts = []
        # Alert Logic
        if weather_code >= 60: # Rain codes start from 60
            if precip > 10:
                alerts.append("🌧️ Heavy Rain Alert! Today expect heavy precipitation.")
            else:
                alerts.append("🌦️ Rain Alert! Carry an umbrella or protect your crops.")
        
        if min_temp <= 2:
            alerts.append("❄️ Frost Warning (Paala)! Temperature will drop near freezing. Protect sensitive crops.")
        
        if weather_code >= 95:
            alerts.append("⛈️ Thunderstorm Warning! Stay safe indoors.")
            
        return alerts
    except Exception as e:
        print(f"Error fetching weather: {e}")
        return []

def send_telegram_message(chat_id, text):
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "Markdown"
    }
    try:
        requests.post(url, json=payload)
    except Exception as e:
        print(f"Error sending message to {chat_id}: {e}")

def check_and_alert():
    print(f"[{datetime.now()}] Starting alert check...")
    farmers_ref = db.collection("Farmers")
    farmers = farmers_ref.stream()
    
    for farmer in farmers:
        data = farmer.to_dict()
        chat_id = data.get("chatId")
        lat = data.get("latitude")
        lon = data.get("longitude")
        city = data.get("city", "your area")
        
        if not chat_id or lat is None or lon is None:
            continue
            
        alerts = get_weather_alerts(lat, lon)
        if alerts:
            msg = f"🌾 *Kisan Alert: {city}*\n\n" + "\n".join(alerts)
            send_telegram_message(chat_id, msg)
            print(f"Sent alert to {chat_id} for {city}")
        else:
            print(f"No alerts for {city}")

if __name__ == "__main__":
    scheduler = BlockingScheduler()
    # Schedule every 4 hours as requested
    scheduler.add_job(check_and_alert, 'interval', hours=4, next_run_time=datetime.now())
    
    print("Weather Alert System Started. Checking every 4 hours...")
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        pass
