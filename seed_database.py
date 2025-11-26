from app import app  # Import the app you created in app.py
from backend.models import db, User, Role
from flask_security import SQLAlchemyUserDatastore, hash_password
import uuid

# Get the datastore from the app
userdatastore: SQLAlchemyUserDatastore = app.security.datastore

# Run all code inside the app context
with app.app_context():
    print("Seeding database...")
    
    # NOTE: We DO NOT run db.create_all() here.
    # 'flask db upgrade' handles that.

    # Create roles if they don't exist
    userdatastore.find_or_create_role(name='admin', description='Administrator of the parking system')
    userdatastore.find_or_create_role(name='user', description='Standard user for booking spots')

    # Create a default admin user if one doesn't exist
    if not userdatastore.find_user(email='admin@study.iitm.ac.in'):
        userdatastore.create_user(
            email='admin@study.iitm.ac.in',
            password=hash_password('pass'),
            vehicle_number='ADMIN01',
            first_name='Admin',
            last_name='User',
            roles=['admin'],
            fs_uniquifier=str(uuid.uuid4()) # Added missing fs_uniquifier
        )
        print("Created admin user.")

    # Create a default test user if one doesn't exist
    if not userdatastore.find_user(email='user01@study.iitm.ac.in'):
        userdatastore.create_user(
            email='user01@study.iitm.ac.in',
            password=hash_password('pass'),
            vehicle_number='USER01',
            first_name='Test',
            last_name='User01',
            roles=['user'],
            fs_uniquifier=str(uuid.uuid4()) # Added missing fs_uniquifier
        )
        print("Created test user.")

    # Save the changes to the database
    db.session.commit()
    print("Database seeding complete.")