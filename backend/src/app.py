from flask import Flask
from flask_cors import CORS
from db import mongo  # import mongo from db.py
import os
from dotenv import load_dotenv


load_dotenv() 
def create_app():
    app = Flask(__name__)
    app.config["MONGO_URI"] = os.getenv("MONGO_URI")
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY") 

    mongo.init_app(app)

    CORS(app, supports_credentials=True, origins=["http://localhost:3000"])

    from routes.user_routes import user_routes
    app.register_blueprint(user_routes, url_prefix="/users")

    from routes.send_mail import send_mail
    app.register_blueprint(send_mail, url_prefix="/users")
    
    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
