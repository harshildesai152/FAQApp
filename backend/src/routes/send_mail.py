from flask import Blueprint, request, jsonify
from db import mongo  # Assuming you have a db.py with mongo init
import datetime
from bson.objectid import ObjectId
from functools import wraps
import jwt
from textblob import TextBlob 
import os
from dotenv import load_dotenv

send_mail = Blueprint("send_mail", __name__)

email_logs = mongo.db["email_logs"]  # Collection to store sent messages
users_collection = mongo.db["users"]  # Collection to check existing users
personal_messages = mongo.db["personal_messages"] 

load_dotenv()  # Loads .env from the current directory or parent

SECRET_KEY = os.getenv("SECRET_KEY")


def is_manager_authenticated(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        token = request.cookies.get("token")
        if not token:
            return jsonify({"error": "Authentication required"}), 401
        try:
            decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            user = users_collection.find_one({"_id": ObjectId(decoded["user_id"])})
            if not user or user.get("role") != "manager":
                return jsonify({"error": "Manager role required"}), 403
        except Exception as e:
            return jsonify({"error": str(e)}), 401
        return func(*args, **kwargs)
    return wrapper



# mangerager route to send email, messages  
@send_mail.route("/send-email", methods=["POST"])
@is_manager_authenticated
def send_email():
    data = request.get_json()
    email = data.get("email")
    message = data.get("message")

    if not email or not message:
        return jsonify({"error": "Email and message fields are required"}), 400

    # Check if the email exists in users collection
    user = users_collection.find_one({"email": email})
    if not user:
        return jsonify({"error": "Email not found in users"}), 404

    try:
        # Sentiment analysis
        sentiment_score = TextBlob(message).sentiment.polarity
        if sentiment_score > 0.2:
            sentiment = "positive"
        elif sentiment_score < -0.2:
            sentiment = "negative"
        else:
            sentiment = "neutral"

        # Store the message and sentiment in DB
        email_logs.insert_one({
            "email": email,
            "message": message,
            "sentiment": sentiment,
            "timestamp": datetime.datetime.utcnow()
        })

        return jsonify({
            "message": "Email message stored successfully",
            "sentiment": sentiment
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# mangerager route to access email, messages   and also particular email
@send_mail.route("/getAllEmailMessage", methods=["GET"])
@is_manager_authenticated
def get_all_emails_and_messages():
    try:
        all_users = list(users_collection.find({"role": "user"}, {"email": 1, "_id": 0}))
        result = []
        for user in all_users:
            email = user.get("email")
            if not email:
                continue

            email_msgs = list(email_logs.find({"email": email}))
            personal_msgs = list(personal_messages.find({"user_email": email}))

            for msg in email_msgs:
                msg["_id"] = str(msg["_id"])
                msg["timestamp"] = msg["timestamp"].isoformat()

            for msg in personal_msgs:
                msg["_id"] = str(msg["_id"])
                msg["timestamp"] = msg["timestamp"].isoformat()

            result.append({
                "email": email,
                "email_messages": email_msgs,
                "personal_messages": personal_msgs
            })

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500



# mangerager route to update message
from textblob import TextBlob

@send_mail.route("/update-message/<id>", methods=["PUT"])
@is_manager_authenticated
def update_message(id):
    data = request.get_json()
    new_message = data.get("message")

    if not new_message:
        return jsonify({"error": "New message content is required"}), 400

    # ✅ Recalculate sentiment
    sentiment_score = TextBlob(new_message).sentiment.polarity
    if sentiment_score > 0.2:
        sentiment = "positive"
    elif sentiment_score < -0.2:
        sentiment = "negative"
    else:
        sentiment = "neutral"

    # ✅ Update both message and sentiment in DB
    result = email_logs.update_one(
        {"_id": ObjectId(id)},
        {"$set": {
            "message": new_message,
            "sentiment": sentiment
        }}
    )

    if result.matched_count == 0:
        return jsonify({"error": "Message not found"}), 404

    return jsonify({
        "message": "Message and sentiment updated successfully",
        "new_sentiment": sentiment
    }), 200


# mangerager route to delete message
@send_mail.route("/delete-message/<id>", methods=["DELETE"])
@is_manager_authenticated
def delete_message(id):
    result = email_logs.delete_one({"_id": ObjectId(id)})
    if result.deleted_count == 0:
        return jsonify({"error": "Message not found"}), 404

    return jsonify({"message": "Message deleted successfully"}), 200



# user : email message perticular user access
@send_mail.route("/get-my-received-messages", methods=["GET"])
def get_my_received_messages_from_token():
    token = request.cookies.get("token")
    if not token:
        return jsonify({"error": "Token missing"}), 401

    try:
        decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        email = decoded.get("email")
        if not email:
            return jsonify({"error": "Invalid token"}), 400

        user = users_collection.find_one({"email": email})
        if not user:
            return jsonify({"error": "Email not found in users"}), 404

        messages = list(email_logs.find({"email": email}))
        for msg in messages:
            msg["_id"] = str(msg["_id"])
            msg["timestamp"] = msg["timestamp"].isoformat()

        return jsonify({"messages": messages}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


