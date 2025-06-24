from flask import Blueprint, request, jsonify, make_response
from bson.objectid import ObjectId
from db import mongo
import datetime as dt
import bcrypt
import jwt
import os
from dotenv import load_dotenv

user_routes = Blueprint("user_routes", __name__)
users_collection = mongo.db["users"]
login_logs = mongo.db["login_logs"]
token_store = mongo.db["tokens"]

load_dotenv()  # Loads .env from the current directory or parent

SECRET_KEY = os.getenv("SECRET_KEY")
# print("Loaded secret key:", SECRET_KEY)


def generate_token(user_id, email, role):
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": dt.datetime.utcnow() + dt.timedelta(hours=2)
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    return token


# GET all users (for admin/testing)
@user_routes.route("/", methods=["GET"])
def get_users():
    users = []
    for user in users_collection.find():
        users.append({
            "_id": str(user["_id"]),
            "name": user.get("name", ""),
            "email": user.get("email", ""),
            "password": user.get("password", ""),
            "confirmPassword": user.get("confirmPassword", ""),
            "role": user.get("role", "user"),
            "token": user.get("token", "")
        })
    return jsonify(users)


# ✅ Signup: Does NOT set cookie
@user_routes.route("/", methods=["POST"])
def add_user():
    data = request.get_json()
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    confirm_password = data.get("confirmPassword")

    if not name or not email or not password or not confirm_password:
        return jsonify({"error": "Missing fields"}), 400

    if password != confirm_password:
        return jsonify({"error": "Passwords do not match"}), 400

    if users_collection.find_one({"email": email}):
        return jsonify({"error": "Email already exists"}), 409

    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(password.encode("utf-8"), salt)

    new_user = {
        "name": name,
        "email": email,
        "password": hashed_password.decode("utf-8"),
        "confirmPassword": hashed_password.decode("utf-8"),
        "role": "user"
    }

    result = users_collection.insert_one(new_user)

    # Generate and store token but DO NOT send to client
    token = generate_token(str(result.inserted_id), email, "user")
    users_collection.update_one({"_id": result.inserted_id}, {"$set": {"token": token}})
    token_store.insert_one({
        "user_id": str(result.inserted_id),
        "email": email,
        "token": token,
        "created_at": dt.datetime.utcnow()
    })

    return jsonify({
        "message": "User registered successfully. Please log in to continue.",
        "id": str(result.inserted_id)
    }), 201


# ✅ Login: Sets token in cookie
@user_routes.route("/login", methods=["POST"])
def login_user():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = users_collection.find_one({"email": email})
    if not user:
        login_logs.insert_one({
            "email": email,
            "status": "failed - user not found",
            "timestamp": dt.datetime.utcnow()
        })
        return jsonify({"error": "User not found"}), 404

    stored_hashed_pw = user["password"].encode("utf-8")
    if bcrypt.checkpw(password.encode("utf-8"), stored_hashed_pw):
        token = generate_token(str(user["_id"]), user["email"], user.get("role", "user"))

        login_logs.insert_one({
            "user_id": str(user["_id"]),
            "email": user["email"],
            "status": "Login successful",
            "timestamp": dt.datetime.utcnow(),
            "ip": request.remote_addr,
            "token": token
        })

        users_collection.update_one({"_id": user["_id"]}, {"$set": {"token": token}})

        token_store.insert_one({
            "user_id": str(user["_id"]),
            "email": user["email"],
            "token": token,
            "created_at": dt.datetime.utcnow()
        })

        response = jsonify({
            "message": "Login successful",
            "user": {
                "id": str(user["_id"]),
                "name": user["name"],
                "email": user["email"],
                "role": user.get("role", "user")
            }
        })
        response.set_cookie("token", token, httponly=True, secure=False, samesite="Lax")
        return response, 200
    else:
        login_logs.insert_one({
            "user_id": str(user["_id"]),
            "email": user["email"],
            "status": "failed - wrong password",
            "timestamp": dt.datetime.utcnow(),
            "ip": request.remote_addr
        })
        return jsonify({"error": "Invalid password"}), 401


# ✅ Logout
@user_routes.route("/logout", methods=["POST"])
def logout_user():
    token = request.cookies.get("token")
    if not token:
        return jsonify({"error": "No token found in cookies"}), 400

    try:
        decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_id = decoded.get("user_id")

        users_collection.update_one({"_id": ObjectId(user_id)}, {"$unset": {"token": ""}})
        token_store.delete_many({"token": token})

        response = jsonify({"message": "Logged out successfully"})
        response.delete_cookie("token")
        return response, 200

    except jwt.ExpiredSignatureError:
        return jsonify({"error": "Token expired"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"error": "Invalid token"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ✅ Auth Check
@user_routes.route("/auth-check", methods=["GET"])
def auth_check():
    token = request.cookies.get("token")
    if not token:
        return jsonify({"error": "Not authenticated"}), 401

    try:
        decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return jsonify({
            "message": "Authenticated",
            "role": decoded.get("role")
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 401
