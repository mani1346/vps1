from flask import current_app as app, jsonify, render_template,  request,send_file
from flask_security import auth_required, verify_password, hash_password
from backend.models import db, User, Role # Added Role to imports
import uuid

from datetime import datetime
from backend.celery.tasks import add, create_csv
from celery.result import AsyncResult
import os 

# Get the datastore from the currently running app
datastore = app.security.datastore
cache = app.cache

@app.route('/')
def home():
    return render_template('index.html')

@app.get('/celery')
def celery():
    task = add.delay(10, 20)
    return {'task_id' : task.id}

@app.get('/get-csv/<id>')
def getCSV(id):
    result = AsyncResult(id)

    if result.ready():
        # Build absolute path to the generated file
        file_path = os.path.join(app.root_path, "backend", "celery", "user-downloads", result.result)
        
        if os.path.exists(file_path):
            return send_file(file_path, as_attachment=True)  # force download
        else:
            return {"message": "file not found"}, 404
    else:
        return {'message': 'task not ready'}, 405

    
@app.get('/create-csv')
def createCSV():
    task = create_csv.delay()
    return {'task_id' : task.id}, 200

@app.get('/cache')
@cache.cached(timeout = 5)
def cache():
    return {'time' : str(datetime.now())}

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"message": "Email and password are required"}), 400
    
    user = datastore.find_user(email=email)

    if not user:
        return jsonify({"message": "User not found"}), 404
    
    if verify_password(password, user.password):
        # On successful login, return a token and basic user info
        return jsonify({
            'token': user.get_auth_token(), 
            'email': user.email, 
            'role': user.roles[0].name, 
            'id': user.id
        })
    
    return jsonify({'message': 'Invalid password'}), 400

@app.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()

        # Get all required fields
        email = data.get('email')
        password = data.get('password')
        vehicle_number = data.get('vehicle_number')
        first_name = data.get('first_name')
        last_name = data.get('last_name')
        
        # Validate fields
        if not all([email, password, vehicle_number, first_name, last_name]):
            return jsonify({"message": "Missing required fields"}), 400
        
        # --- SAFE CHECKS INSIDE TRY BLOCK ---
        # 1. Check Role
        role = datastore.find_role("user")
        if not role:
            # Fallback if role doesn't exist (shouldn't happen if seeded)
            return jsonify({"message": "System error: 'user' role not found"}), 500

        # 2. Check Email Duplicate
        if datastore.find_user(email=email):
            return jsonify({"message": "User with this email already exists"}), 409
        
        # 3. Check Vehicle Duplicate
        if User.query.filter_by(vehicle_number=vehicle_number).first():
            return jsonify({"message": "User with this vehicle number already exists"}), 409
        
        # 4. Create User
        datastore.create_user(
            first_name=first_name,
            last_name=last_name,
            email=email,
            password=hash_password(password),
            vehicle_number=vehicle_number,
            roles=[role],
            active=True,
            fs_uniquifier=str(uuid.uuid4())
        )
        db.session.commit()
        return jsonify({"message": "User created successfully"}), 201

    except Exception as e:
        db.session.rollback()
        # Return the actual error message for debugging
        print("Register Error:", str(e)) 
        return jsonify({"message": "Error creating user", "error": str(e)}), 500

# You can keep this for testing authenticated endpoints
@app.get('/protected')
@auth_required('token')
def protected():
    return jsonify({"message": "This is a protected area."})
