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

def get_weather_alerts(lat, lon, crop, stage):
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": ["temperature_2m_max", "temperature_2m_min", "precipitation_sum", "et0_fao_evapotranspiration_sum"],
        "timezone": "auto",
        "forecast_days": 10
    }
    try:
        response = requests.get(url, params=params)
        data = response.json()
        daily = data.get("daily", {})
        
        temps_max = daily.get("temperature_2m_max", [])
        temps_min = daily.get("temperature_2m_min", [])
        precips = daily.get("precipitation_sum", [])
        dates = daily.get("time", [])
        
        alerts = []
        
        # Frost Alert
        for i in range(min(3, len(temps_min))):
            if temps_min[i] <= 2:
                alerts.append(f"⚠️ Frost Warning: Protect {crop} tonight. Cover young plants or use sprinkler frost protection. Expected low: {temps_min[i]}°C on {dates[i]}.")
                break
                
        # Heat Stress Alert
        high_temp_days = 0
        for i in range(min(3, len(temps_max))):
            if temps_max[i] >= 40:
                high_temp_days += 1
            else:
                high_temp_days = 0
            if high_temp_days >= 2:
                alerts.append(f"🌡️ Heat Stress Alert: {crop} at {stage} stage is at risk. Irrigate in early morning, apply mulch, avoid fertilizer application.")
                break
                
        # Heavy Rain Alert
        if len(precips) > 0 and precips[0] > 50:
            alerts.append(f"🌧️ Heavy Rain Warning: Risk of waterlogging and root rot for {crop}. Ensure field drainage is clear. Avoid spraying operations.")
            
        # Dry Spell Alert
        dry_days = 0
        for i in range(len(precips)):
            if precips[i] < 1:
                dry_days += 1
            else:
                dry_days = 0
                
            if dry_days >= 10:
                alerts.append(f"☀️ Dry Spell Alert: Soil moisture critically low. Prioritize irrigation for {crop} within next 48 hours.")
                break
            
        return list(set(alerts)) # unique alerts
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
        
        crop = data.get("cropType", "crops")
        stage = data.get("growthStage", "growing")
        
        if not chat_id or lat is None or lon is None:
            continue
            
        alerts = get_weather_alerts(lat, lon, crop, stage)
        if alerts:
            msg = f"🌾 *Agricultural Weather Alert: {city}*\n\n" + "\n\n".join(alerts)
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
