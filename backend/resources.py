from flask_restful import Api, Resource, fields, marshal_with, reqparse, marshal
from flask_security import auth_required, current_user, roles_required
from .models import db, User, ParkingLot, ParkingSpot, ParkingHistory,Role

from datetime import datetime
from sqlalchemy import func
from backend.celery.tasks import create_user_csv,create_csv
import os 
from sqlalchemy import or_
import math

from flask import send_from_directory, current_app,jsonify
from backend.extensions import cache
#cache = app.cache
# Initialize the API with a prefix
api = Api(prefix='/api')

# ==============================================================================
# MARSHAL FIELD DEFINITIONS
# ==============================================================================
# These dictionaries define the structure of your JSON responses.

# For a single parking spot's details
spot_fields = {
    'id': fields.Integer,
    'spot_number': fields.String,
    'is_occupied': fields.Boolean,
}

# For an admin viewing a parking lot, including all its spots
admin_lot_fields = {
    'id': fields.Integer,
    'name': fields.String,
    'address': fields.String,
    'capacity': fields.Integer,
    'price': fields.Float,
    'spots': fields.List(fields.Nested(spot_fields))
}

# For a user viewing their parking history
user_history_fields = {
    'id': fields.Integer,
    'start_time': fields.DateTime,
    'end_time': fields.DateTime,
    'total_cost': fields.Float,
    'status': fields.String,
    'spot_id': fields.Integer(attribute='spot.id'),
    'spot_number': fields.String(attribute='spot.spot_number'),
    'lot_name': fields.String(attribute='spot.lot.name'),
}

# For an admin viewing the list of all users
admin_user_fields = {
    'id': fields.Integer,
    'first_name': fields.String,
    'last_name': fields.String,
    'email': fields.String,
    'vehicle_number': fields.String,
    'active': fields.Boolean,
}

# For a user viewing their active reservations
active_reservation_fields = {
    'id': fields.Integer,
    'start_time': fields.DateTime,
    'spot_number': fields.String(attribute='spot.spot_number'),
    'lot_name': fields.String(attribute='spot.lot.name'),
}

public_lot_fields = {
    'id': fields.Integer,
    'name': fields.String,
}
# ==============================================================================
# ADMIN API RESOURCES
# ==============================================================================
class AdminSearchAPI(Resource):
    method_decorators = [roles_required('admin'), auth_required('token')]

    def get(self):
        parser = reqparse.RequestParser()
        parser.add_argument('search_by', type=str, location='args', required=True)
        parser.add_argument('search_string', type=str, location='args', required=True)
        args = parser.parse_args()

        search_by = args['search_by']
        search_string = args['search_string']
        search_term = f"%{search_string}%"
        
        results = {
            "users": [],
            "lots": [],
            "spots": []
        }

        if search_by == 'user_id':
            # Case-insensitive search for user ID (as string) or email
            users = User.query.filter(or_(User.id.like(search_term), User.email.ilike(search_term))).all()
            results['users'] = marshal(users, admin_user_fields)

        elif search_by == 'location':
            lots = ParkingLot.query.filter(or_(ParkingLot.name.ilike(search_term), ParkingLot.address.ilike(search_term))).all()
            results['lots'] = marshal(lots, admin_lot_fields)

        elif search_by == 'spot_id':
            spots = db.session.query(ParkingSpot).filter(ParkingSpot.spot_number.ilike(search_term)).all()
            spot_list = []
            for spot in spots:
                spot_list.append({
                    "id": spot.id,
                    "spot_number": spot.spot_number,
                    "is_occupied": spot.is_occupied,
                    "lot_name": spot.lot.name
                })
            results['spots'] = spot_list
            
        return results, 200

# --- Resource for All Parking Lots (GET, POST) ---
class AdminParkingLotListAPI(Resource):
    method_decorators = [roles_required('admin'), auth_required('token')]
    @cache.cached(timeout=60)
    @marshal_with(admin_lot_fields)
    def get(self):
        cache.clear()
        """Returns a list of all parking lots, with optional search filtering."""
        parser = reqparse.RequestParser()
        parser.add_argument('search_by', type=str, location='args', default=None)
        parser.add_argument('search_string', type=str, location='args', default=None)
        args = parser.parse_args()

        query = ParkingLot.query

        if args['search_string']:
            search_term = f"%{args['search_string']}%"
            if args['search_by'] == 'location':
                # Searches lot name or address
                query = query.filter(or_(ParkingLot.name.ilike(search_term), ParkingLot.address.ilike(search_term)))
            elif args['search_by'] == 'spot':
                # Searches for lots that have a spot with a matching number
                query = query.join(ParkingSpot).filter(ParkingSpot.spot_number.ilike(search_term))
        
        return query.all()

    @marshal_with(admin_lot_fields)
    def post(self):
        """Creates a new parking lot and its spots."""
        parser = reqparse.RequestParser()
        parser.add_argument('name', type=str, required=True, help="Name cannot be blank")
        parser.add_argument('address', type=str, required=True, help="Address cannot be blank")
        parser.add_argument('capacity', type=int, required=True, help="Capacity cannot be blank")
        parser.add_argument('price', type=float, required=True, help="Price cannot be blank")
        args = parser.parse_args()

        new_lot = ParkingLot(
            name=args['name'],
            address=args['address'],
            capacity=args['capacity'],
            price=args['price'],
            created_by_id=current_user.id
        )
        db.session.add(new_lot)
        db.session.flush() # Use flush to get the new_lot.id before committing

        for i in range(1, args['capacity'] + 1):
            spot = ParkingSpot(spot_number=f"S-{i}", lot_id=new_lot.id)
            db.session.add(spot)

        db.session.commit()
        cache.clear()
        return new_lot, 201

# --- Resource for a Single Parking Lot (GET, DELETE, PUT) ---
class AdminParkingLotAPI(Resource):
    method_decorators = [roles_required('admin'), auth_required('token')]

    @marshal_with(admin_lot_fields)
    def get(self, lot_id):
        """Returns details of a single parking lot."""
        return ParkingLot.query.get_or_404(lot_id)

    def delete(self, lot_id):
        cache.clear()
        """
        Deletes a parking lot only if it has no reservation history.
        This prevents database IntegrityErrors.
        """
        lot = ParkingLot.query.get_or_404(lot_id)
        
        # --- THIS IS THE "SAFE" CHECK ---
        # Check if any spots in this lot have *any* reservation history.
        history_count = db.session.query(ParkingHistory.id)\
                            .join(ParkingSpot, ParkingSpot.id == ParkingHistory.spot_id)\
                            .filter(ParkingSpot.lot_id == lot_id).count()

        if history_count > 0:
            # We can't delete the lot because it has reservation history.
            return {"message": "Cannot delete lot. It has existing reservation history linked to its spots."}, 409
        
        # If no history, it's safe to delete.
        db.session.delete(lot)
        db.session.commit()
        return {"message": "Parking lot deleted successfully"}, 200

    @marshal_with(admin_lot_fields)
    def put(self, lot_id):
        cache.clear()
        """
        Updates an existing parking lot.
        This logic is now robust and handles inconsistent data.
        """
        lot = ParkingLot.query.get_or_404(lot_id)

        parser = reqparse.RequestParser()
        parser.add_argument('name', type=str, required=True)
        parser.add_argument('address', type=str, required=True)
        parser.add_argument('capacity', type=int, required=True)
        parser.add_argument('price', type=float, required=True)
        args = parser.parse_args()
        
        new_capacity = args['capacity']

        # --- NEW ROBUST LOGIC ---
        # 1. Get the TRUE current state
        current_spots = ParkingSpot.query.filter_by(lot_id=lot.id).all()
        current_spot_count = len(current_spots)
        occupied_spots_count = len([s for s in current_spots if s.is_occupied])

        # 2. Check if the new capacity is valid
        if new_capacity < occupied_spots_count:
            return {"message": f"Cannot reduce capacity to {new_capacity}. There are already {occupied_spots_count} occupied spots."}, 409

        # 3. Update the lot's core details
        lot.name = args['name']
        lot.address = args['address']
        lot.price = args['price']
        lot.capacity = new_capacity # Set to the new, correct capacity

        # 4. Adjust spots based on the REAL counts
        if new_capacity > current_spot_count:
            # --- ADDING SPOTS ---
            spots_to_add = new_capacity - current_spot_count
            
            # Find the highest spot number to avoid conflicts
            max_spot_num = 0
            for s in current_spots:
                try:
                    # Assumes spot_number is like "S-1", "S-2", etc.
                    num = int(s.spot_number.split('-')[-1])
                    if num > max_spot_num:
                        max_spot_num = num
                except:
                    pass # Ignore spots with non-standard names
            
            # Add new spots starting from the next highest number
            for i in range(1, spots_to_add + 1):
                new_spot_num_int = max_spot_num + i
                spot = ParkingSpot(spot_number=f"S-{new_spot_num_int}", lot_id=lot.id)
                db.session.add(spot)

        elif new_capacity < current_spot_count:
            # --- REMOVING SPOTS ---
            spots_to_remove_count = current_spot_count - new_capacity
            
            # Find available spots to delete, starting from the highest ID (last added)
            extra_spots = ParkingSpot.query.filter(
                ParkingSpot.lot_id == lot.id,
                ParkingSpot.is_occupied == False
            ).order_by(ParkingSpot.id.desc()).limit(spots_to_remove_count).all()

            # Check if we have enough *available* spots to remove
            if len(extra_spots) < spots_to_remove_count:
                db.session.rollback()
                return {"message": f"Cannot reduce capacity. Tried to remove {spots_to_remove_count} spots, but only {len(extra_spots)} are available to delete."}, 409
            
            # Delete the spots
            for spot in extra_spots:
                db.session.delete(spot)
        
        # --- END OF NEW LOGIC ---

        db.session.commit()
        return lot, 200

# --- Resource for Admin Dashboard Summary ---
class AdminSummaryAPI(Resource):
    method_decorators = [roles_required('admin'), auth_required('token')]
    def get(self):
        """Returns summary stats for the admin dashboard."""
        total_users = User.query.filter(User.roles.any(name='user')).count() # Counts only users, not admins
        total_lots = ParkingLot.query.count()
        total_bookings = ParkingHistory.query.count()
        total_earnings = db.session.query(db.func.sum(ParkingHistory.total_cost)).scalar() or 0.0
        summary = {
            "summaryStats": [
                {"label": "Total Earnings", "value": f"₹{total_earnings:.2f}"}, # Placeholder
                {"label": "Registered Users", "value": total_users},
                {"label": "Active Lots", "value": total_lots},
                {"label": "Total Bookings", "value": total_bookings},
            ]
        }
        return summary, 200

# --- Resource for Admin to View All Users ---
class AdminUserListAPI(Resource):
    method_decorators = [roles_required('admin'), auth_required('token')]
    
    @marshal_with(admin_user_fields)
    def get(self):
        """Returns a list of all users."""
        return User.query.join(User.roles).filter(Role.name == 'user').all()

# --- Resource for Admin to View All History ---
# In backend/resources.py

# ... (all your other imports) ...

# --- Resource for Admin to View All History ---
class AdminHistoryListAPI(Resource):
    method_decorators = [roles_required('admin'), auth_required('token')]
    
    def get(self):
        """Returns parking history for all users, with lot status."""
        history = ParkingHistory.query.order_by(ParkingHistory.start_time.desc()).all()
        results = []
        for item in history:
            marshalled_item = marshal(item, user_history_fields)
            marshalled_item['user_email'] = item.user.email
            marshalled_item['vehicle_number'] = item.user.vehicle_number
            
            # --- THIS IS THE FIX ---
            # Manually check lot status to avoid errors on deleted lots
            if item.spot and item.spot.lot:
                marshalled_item['lot_is_active'] = item.spot.lot.is_active
                marshalled_item['lot_name'] = item.spot.lot.name # Ensure name is correct
            else:
                marshalled_item['lot_is_active'] = False
                marshalled_item['lot_name'] = marshalled_item.get('lot_name', "Unknown/Deleted")
            # --- END OF FIX ---

            results.append(marshalled_item)
        return results, 200

# ... (rest of your API file) ...

# ==============================================================================
# USER API RESOURCES
# ==============================================================================
# --- Resource for User to See Available Lots ---
class AvailableLotsAPI(Resource):
    method_decorators = [auth_required('token')]
    @cache.cached(timeout=60)
    def get(self):
        """Returns a list of lots with available spot counts."""
        lots = ParkingLot.query.all()
        response_data = []
        for lot in lots:
            available_count = ParkingSpot.query.filter_by(lot_id=lot.id, is_occupied=False).count()
            response_data.append({
                'id': lot.id,
                'name': lot.name,
                'address': lot.address,
                'price': float(lot.price),
                'available_spots': available_count
            })
        return response_data, 200

# --- Resource for User to Reserve a Spot ---
class ReserveSpotAPI(Resource):
    method_decorators = [auth_required('token')]

    def post(self, lot_id):
        cache.clear()
        """Reserves an available spot for the current user."""
        if ParkingHistory.query.filter_by(user_id=current_user.id, end_time=None).first():
            return {"message": "You already have an active reservation."}, 409

        spot = ParkingSpot.query.filter_by(lot_id=lot_id, is_occupied=False).first()
        if not spot:
            return {"message": "No spots available in this lot."}, 404

        spot.is_occupied = True
        reservation = ParkingHistory(
            user_id=current_user.id,
            spot_id=spot.id,
            status='active'
        )
        db.session.add(reservation)
        db.session.commit()
        return {"message": "Spot reserved successfully"}, 201

# --- Resource for a User's Own Parking History ---
class ParkingHistoryListAPI(Resource):
    method_decorators = [auth_required('token')]

    @marshal_with(user_history_fields)
    def get(self):
        """Returns the parking history for the current user."""
        return ParkingHistory.query.filter_by(user_id=current_user.id).order_by(ParkingHistory.start_time.desc()).all()

# --- Resource for a User's Active Reservations ---
class ActiveReservationsAPI(Resource):
    method_decorators = [auth_required('token')]
    
    @marshal_with(active_reservation_fields)
    def get(self):
        """Returns a list of the user's active reservations."""
        return ParkingHistory.query.filter_by(user_id=current_user.id, end_time=None).all()

# --- Resource to Update a Reservation (Cancel/Checkout) ---
class UpdateReservationAPI(Resource):
    method_decorators = [auth_required('token')]
    
    def post(self, reservation_id, action):
        cache.clear()
        reservation = ParkingHistory.query.filter_by(id=reservation_id, user_id=current_user.id, end_time=None).first_or_404()
        
        spot = ParkingSpot.query.get(reservation.spot_id) # Get the spot
        
        if action == 'cancel':
            reservation.status = 'cancelled'
            reservation.end_time = datetime.utcnow()
            if spot:
                spot.is_occupied = False
            message = "Reservation cancelled successfully."
        
        elif action == 'checkout':
            reservation.status = 'completed'
            reservation.end_time = datetime.utcnow()
            message = "Checkout successful."
            
            # --- START: NEW PRICE CALCULATION LOGIC ---
            if spot:
                spot.is_occupied = False
                
                # Get duration in seconds
                duration_seconds = (reservation.end_time - reservation.start_time).total_seconds()
                
                # Convert to hours and round UP to the next full hour
                # (3600 seconds in an hour)
                duration_hours_billed = math.ceil(duration_seconds / 3600)
                
                # Ensure a minimum 1-hour charge
                if duration_hours_billed == 0:
                    duration_hours_billed = 1
                
                # Get the lot's price (convert from Numeric to float)
                lot_price = float(reservation.spot.lot.price)
                
                # Calculate and set the total cost
                reservation.total_cost = duration_hours_billed * lot_price
                db.session.add(reservation)
            # --- END: NEW PRICE CALCULATION LOGIC ---
        
        else:
            return {"message": "Invalid action."}, 400
            
        db.session.commit()
        return {"message": message}, 200

# --- Resource for User Dashboard Summary ---
class UserSummaryAPI(Resource):
    method_decorators = [auth_required('token')]

    def get(self):
        user_id = current_user.id
        total_bookings = ParkingHistory.query.filter_by(user_id=user_id).count()
        total_spent = db.session.query(db.func.sum(ParkingHistory.total_cost)).filter_by(user_id=user_id).scalar() or 0.0

        # --- Chart 1: Monthly Spend ---
        monthly_spend_query = db.session.query(
            func.strftime('%Y-%m', ParkingHistory.start_time).label('month'),
            func.sum(ParkingHistory.total_cost).label('spend')
        ).filter(
            ParkingHistory.user_id == user_id,
            ParkingHistory.status.like('completed%')
        ).group_by('month').order_by('month').all()
        
        monthly_spend_data = {
            "labels": [datetime.strptime(item.month, '%Y-%m').strftime('%b') for item in monthly_spend_query],
            "data": [float(item.spend or 0) for item in monthly_spend_query]
        }

        # --- Chart 2: Usage per Lot (NEW) ---
        lot_usage_query = db.session.query(
            ParkingLot.name,
            func.count(ParkingHistory.id)
        ).join(ParkingSpot, ParkingSpot.lot_id == ParkingLot.id)\
         .join(ParkingHistory, ParkingHistory.spot_id == ParkingSpot.id)\
         .filter(ParkingHistory.user_id == user_id)\
         .group_by(ParkingLot.name).all()

        lot_usage_data = {
            "labels": [item[0] for item in lot_usage_query],
            "data": [item[1] for item in lot_usage_query]
        }

        summary = {
            "summaryStats": [
                {"label": "Total Bookings", "value": total_bookings},
                {"label": "Total Spent", "value": f"₹{total_spent:.2f}"},
            ],
            "monthlySpend": monthly_spend_data,
            "lotUsage": lot_usage_data # Sending the new data
        }
        return summary, 200

# --- Resource for Admin Chart Summary ---
class AdminChartSummaryAPI(Resource):
    method_decorators = [roles_required('admin'), auth_required('token')]

    def get(self):
        total_occupied = ParkingSpot.query.filter_by(is_occupied=True).count()
        total_available = ParkingSpot.query.filter_by(is_occupied=False).count()
        
        spot_status_data = {
            "labels": ["Occupied", "Available"],
            "data": [total_occupied, total_available]
        }

        revenue_query = db.session.query(
            ParkingLot.name,
            func.sum(ParkingHistory.total_cost)
        ).join(ParkingSpot, ParkingSpot.lot_id == ParkingLot.id)\
         .join(ParkingHistory, ParkingHistory.spot_id == ParkingSpot.id)\
         .filter(ParkingHistory.status == 'completed')\
         .group_by(ParkingLot.name).all()

        revenue_data = {
            "labels": [item[0] for item in revenue_query],
            "data": [float(item[1] or 0) for item in revenue_query]
        }
        
        return {
            "spotStatus": spot_status_data,
            "revenuePerLot": revenue_data
        }, 200

# --- USER-SPECIFIC CELERY TASK ENDPOINTS ---
class TriggerUserExportAPI(Resource):
    method_decorators = [auth_required('token')]

    def post(self):
        task = create_user_csv.delay(current_user.id)
        return {"task_id": task.id}, 202 

class DownloadUserExportAPI(Resource):
    def get(self, task_id):
        task = create_user_csv.AsyncResult(task_id)
        if task.state == 'PENDING':
            return {'status': 'PENDING'}, 202
        elif task.state == 'SUCCESS':
            filename = task.result
            directory = os.path.join(current_app.root_path, 'backend', 'celery', 'user-downloads')
            return send_from_directory(directory, filename, as_attachment=True)
        else:
            return {'status': 'FAILURE'}, 500

# --- ADMIN-SPECIFIC CELERY TASK ENDPOINTS ---
class TriggerAdminExportAPI(Resource):
    method_decorators = [roles_required('admin'), auth_required('token')]

    def post(self):
        task = create_csv.delay() 
        return {"task_id": task.id}, 202

class DownloadAdminExportAPI(Resource):
    def get(self, task_id):
        task = create_csv.AsyncResult(task_id)
        if task.state == 'PENDING':
            return {'status': 'PENDING'}, 202
        elif task.state == 'SUCCESS':
            filename = task.result
            directory = os.path.join(current_app.root_path, 'backend', 'celery', 'user-downloads')
            return send_from_directory(directory, filename, as_attachment=True)
        else:
            return {'status': 'FAILURE'}, 500

# --- ADMIN-SPECIFIC SPOT MANAGEMENT ---
class AdminSpotDetailsAPI(Resource):
    method_decorators = [roles_required('admin'), auth_required('token')]

    def get(self, spot_id):
        active_reservation = ParkingHistory.query.filter_by(spot_id=spot_id, end_time=None).first()
        if not active_reservation:
            return {"message": "No active reservation found for this spot."}, 404
        
        spot_details = {
            "spot_id": active_reservation.spot.id,
            "spot_number": active_reservation.spot.spot_number,
            "user_id": active_reservation.user.id,
            "vehicle_number": active_reservation.user.vehicle_number,
            "start_time": active_reservation.start_time.isoformat(),
            "parking_cost": float(active_reservation.spot.lot.price)
        }
        return spot_details, 200

class AdminSpotAPI(Resource):
    method_decorators = [roles_required('admin'), auth_required('token')]

    def delete(self, spot_id):
        cache.clear()
        """
        Deletes a parking spot only if it is not occupied.
        This will also re-calculate and fix the parent lot's capacity.
        """
        spot = ParkingSpot.query.get_or_404(spot_id)

        if spot.is_occupied:
            return {"message": "Cannot delete an occupied spot."}, 409

        # --- THIS IS THE ROBUST FIX ---
        lot = ParkingLot.query.get(spot.lot_id)
        
        db.session.delete(spot) # Delete the spot
        
        if lot:
            # After deleting, recount the *actual* remaining spots
            current_spot_count = ParkingSpot.query.filter_by(lot_id=lot.id).count()
            lot.capacity = current_spot_count # Set the capacity to the new, correct, real count
            db.session.add(lot)
        
        db.session.commit()
        # --- End of FIX ---

        return {"message": "Parking spot deleted and lot capacity updated."}, 200


class AdminForceReleaseAPI(Resource):
    """
    Allows an admin to forcefully release an occupied spot.
    ...
    """
    method_decorators = [roles_required('admin'), auth_required('token')]

    def post(self, spot_id):
        cache.clear()
        spot = ParkingSpot.query.get_or_404(spot_id)

        if not spot.is_occupied:
            return {"message": "Spot is already available."}, 400
        
        # Find the active reservation for this spot
        reservation = ParkingHistory.query.filter_by(spot_id=spot.id, end_time=None).first()

        if reservation:
            reservation.end_time = datetime.utcnow()
            reservation.status = 'completed_by_admin' # Set a special status
            
            # --- START: NEW PRICE CALCULATION LOGIC (Copied from above) ---
            # Get duration in seconds
            duration_seconds = (reservation.end_time - reservation.start_time).total_seconds()
            
            # Convert to hours and round UP to the next full hour
            duration_hours_billed = math.ceil(duration_seconds / 3600)
            
            # Ensure a minimum 1-hour charge
            if duration_hours_billed == 0:
                duration_hours_billed = 1
            
            # Get the lot's price (convert from Numeric to float)
            lot_price = float(reservation.spot.lot.price)
            
            # Calculate and set the total cost
            reservation.total_cost = duration_hours_billed * lot_price
            # --- END: NEW PRICE CALCULATION LOGIC ---
            
            db.session.add(reservation)
        
        # Always free the spot, even if no matching reservation was found (stuck spot)
        spot.is_occupied = False
        db.session.add(spot)
        db.session.commit()
        
        return {"message": f"Spot {spot.spot_number} has been forcefully released."}, 200


class PublicLotListAPI(Resource):
    @cache.cached(timeout=300) # Cache this public data for 5 minutes
    @marshal_with(public_lot_fields)
    def get(self):
        """Returns a list of all active parking lot names."""
        return ParkingLot.query.filter_by(is_active=True).all()

# ==============================================================================
# ADDING RESOURCES TO THE API
# ==============================================================================
# This is where we define the actual URL endpoints for each resource.

# --- Admin Routes ---
api.add_resource(AdminParkingLotListAPI, '/admin/lots')
api.add_resource(AdminParkingLotAPI, '/admin/lots/<int:lot_id>')
api.add_resource(AdminSummaryAPI, '/admin/summary')
api.add_resource(AdminUserListAPI, '/admin/users')
api.add_resource(AdminHistoryListAPI, '/admin/history')
api.add_resource(AdminSearchAPI, '/admin/search')
api.add_resource(AdminChartSummaryAPI, '/admin/chart-summary')
api.add_resource(AdminSpotDetailsAPI, '/admin/spots/<int:spot_id>/details')
api.add_resource(AdminSpotAPI, '/admin/spots/<int:spot_id>')
api.add_resource(TriggerAdminExportAPI, '/admin/trigger-export')
api.add_resource(DownloadAdminExportAPI, '/admin/download-export/<string:task_id>')

# --- NEW FUNCTIONALITY ---
api.add_resource(AdminForceReleaseAPI, '/admin/release-spot/<int:spot_id>')
# --- END OF NEW FUNCTIONALITY ---

# --- User Routes ---
api.add_resource(AvailableLotsAPI, '/user/available-lots')
api.add_resource(ReserveSpotAPI, '/user/reserve/<int:lot_id>')
api.add_resource(ParkingHistoryListAPI, '/user/history')
api.add_resource(ActiveReservationsAPI, '/user/reservations/active')
api.add_resource(UpdateReservationAPI, '/user/reservations/<int:reservation_id>/<string:action>')
api.add_resource(UserSummaryAPI, '/user/dashboard')
api.add_resource(TriggerUserExportAPI, '/user/trigger-export')
api.add_resource(DownloadUserExportAPI, '/user/download-export/<string:task_id>')
api.add_resource(PublicLotListAPI, '/public/lots')