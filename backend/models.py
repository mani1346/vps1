# backend/app/models.py

from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from flask_security import UserMixin, RoleMixin

# Core database object
db = SQLAlchemy()

# --- User and Role Models (Flask-Security) ---

# Association table for the many-to-many relationship between Users and Roles
user_roles = db.Table('user_roles',
    db.Column('user_id', db.Integer(), db.ForeignKey('user.id')),
    db.Column('role_id', db.Integer(), db.ForeignKey('role.id'))
)

class User(db.Model, UserMixin):
    __tablename__ = 'user'
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(100), nullable=True)
    last_name = db.Column(db.String(100), nullable=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    vehicle_number = db.Column(db.String(20), unique=True, nullable=False) # New field added
    password = db.Column(db.String(255), nullable=False)
    active = db.Column(db.Boolean(), default=True)
    
    # Required by Flask-Security
    fs_uniquifier = db.Column(db.String(255), unique=True, nullable=False)

    # Relationships
    roles = db.relationship('Role', secondary=user_roles, backref=db.backref('users', lazy='dynamic'))
    parking_history = db.relationship('ParkingHistory', backref='user', lazy=True)

class Role(db.Model, RoleMixin):
    __tablename__ = 'role'
    id = db.Column(db.Integer(), primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)
    description = db.Column(db.String(255))


# --- Parking Specific Models ---

class ParkingLot(db.Model):
    __tablename__ = 'parking_lot'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), unique=True, nullable=False)
    address = db.Column(db.String(255), nullable=False)
    capacity = db.Column(db.Integer, nullable=False)
    created_by_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    price = db.Column(db.Numeric(10, 2), nullable=False, default=100.0)
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    # Relationship: A lot has many spots
    spots = db.relationship('ParkingSpot', backref='lot', lazy=True, cascade="all, delete-orphan")

class ParkingSpot(db.Model):
    __tablename__ = 'parking_spot'
    id = db.Column(db.Integer, primary_key=True)
    spot_number = db.Column(db.String(20), nullable=False)
    is_occupied = db.Column(db.Boolean, default=False, nullable=False)
    
    # Foreign Key to link to a ParkingLot
    lot_id = db.Column(db.Integer, db.ForeignKey('parking_lot.id'), nullable=False)

    # Relationship: A spot can have many reservation histories
    reservations = db.relationship('ParkingHistory', backref='spot', lazy=True)

class ParkingHistory(db.Model):
    __tablename__ = 'parking_history'
    id = db.Column(db.Integer, primary_key=True)
    start_time = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    end_time = db.Column(db.DateTime, nullable=True) # Can be null if currently parked
    total_cost = db.Column(db.Numeric(10, 2)) # For storing currency values
    status = db.Column(db.String(50), default='reserved') # e.g., 'reserved', 'completed', 'active'
    
    # Foreign Keys
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    spot_id = db.Column(db.Integer, db.ForeignKey('parking_spot.id'), nullable=False)