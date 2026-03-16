import telebot
import requests
import os

# Configuration
TELEGRAM_TOKEN = "8384920616:AAGxeh11pvVdUdHcMZidEHAGmcqqGdL9QqE"
API_BASE_URL = "http://localhost:3000" # Local node server URL

bot = telebot.TeleBot(TELEGRAM_TOKEN)

@bot.message_handler(commands=['start', 'help'])
def send_welcome(message):
    welcome_text = (
        "👋 *Namaste! Welcome to Kisan Weather Bot.*\n\n"
        "I provide proactive alerts for heavy rain, frost (paala), and storms.\n\n"
        "📍 *To start receiving alerts:* Please share your location using the button below so I know which area to monitor for you."
    )
    
    # Create a keyboard with a location request button
    markup = telebot.types.ReplyKeyboardMarkup(one_time_keyboard=True, resize_keyboard=True)
    button = telebot.types.KeyboardButton("📍 Share Location", request_location=True)
    markup.add(button)
    
    bot.reply_to(message, welcome_text, parse_mode="Markdown", reply_markup=markup)

@bot.message_handler(content_types=['location'])
def handle_location(message):
    chat_id = message.chat.id
    lat = message.location.latitude
    lon = message.location.longitude
    
    # Notify user we are registering
    bot.send_message(chat_id, "⌛ Registering your location... Please wait.")
    
    # Register the farmer in our Node.js backend
    registration_data = {
        "chatId": str(chat_id),
        "latitude": lat,
        "longitude": lon,
        "city": "Shared Location"
    }
    
    try:
        response = requests.post(f"{API_BASE_URL}/api/register-farmer", json=registration_data)
        if response.status_code == 200:
            success_msg = (
                "✅ *Success! You are registered.*\n\n"
                "I will now monitor your area and send you alerts if heavy rain or frost is predicted.\n\n"
                "Stay safe! 🌾"
            )
            bot.send_message(chat_id, success_msg, parse_mode="Markdown")
        else:
            bot.send_message(chat_id, "❌ Sorry, I couldn't register your location. Please try again later.")
    except Exception as e:
        print(f"Error registering farmer: {e}")
        bot.send_message(chat_id, "❌ Connection error. Please ensure the weather server is running.")

if __name__ == "__main__":
    print("🤖 Kisan Bot Listener is running...")
    print("Listening for messages and location shares...")
    bot.infinity_polling()
