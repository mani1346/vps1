import os
import time
from datetime import datetime, timedelta
from collections import Counter
import pyexcel
from celery import shared_task
from flask import current_app, render_template
from sqlalchemy import and_, func

# Import all models, including Role
from backend.models import ParkingLot, ParkingHistory, User, Role, db, ParkingSpot
from backend.celery.mail_service import send_email


@shared_task(ignore_result=False)
def add(x, y):
    """A simple example task that adds two numbers."""
    time.sleep(10)
    return x + y

@shared_task(bind=True, ignore_result=False)
def create_csv(self):
    """Celery task to generate a CSV file from all ParkingHistory records."""
    resource = ParkingHistory.query.all()
    task_id = self.request.id
    filename = f'parking_history_{task_id}.csv'
    
    column_names = [column.name for column in ParkingHistory.__table__.columns]
    data = [{col: getattr(row, col) for col in column_names} for row in resource]
    
    save_dir = os.path.join(current_app.root_path, 'backend', 'celery', 'user-downloads')    
    os.makedirs(save_dir, exist_ok=True)
    file_path = os.path.join(save_dir, filename)
    pyexcel.save_as(records=data, dest_file_name=file_path)
    
    return filename

@shared_task(bind=True, ignore_result=False)
def create_user_csv(self, user_id):
    """Celery task to generate a CSV file for a single user's parking history."""
    resource = ParkingHistory.query.filter_by(user_id=user_id).all()
    if not resource:
        return "No parking history found for this user."

    task_id = self.request.id
    filename = f'user_{user_id}_history_{task_id}.csv'
    column_names = [column.name for column in ParkingHistory.__table__.columns]
    data = [{col: getattr(row, col) for col in column_names} for row in resource]
    
    save_dir = os.path.join(current_app.root_path, 'backend', 'celery', 'user-downloads')    
    os.makedirs(save_dir, exist_ok=True)
    file_path = os.path.join(save_dir, filename)
    pyexcel.save_as(records=data, dest_file_name=file_path)
    
    return filename

@shared_task
def send_daily_reminders():
    """
    Sends a daily reminder to users (ROLE 'user' ONLY) who have NOT parked in the last 7 days.
    """
    # 1. Define the time threshold (7 days ago)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)

    # 2. Find users who HAVE parked recently
    recent_users_subquery = db.session.query(
        ParkingHistory.user_id
    ).filter(
        ParkingHistory.start_time >= seven_days_ago
    ).distinct()

    # 3. Find users who are NOT in that recent list AND have the 'user' role
    inactive_users = User.query.join(User.roles).filter(
        Role.name == 'user',
        User.active == True,
        User.id.notin_(recent_users_subquery)
    ).all()

    print(f"--- Running Daily Reminder Job for {len(inactive_users)} inactive users ---")
    
    for user in inactive_users:
        subject = "We Miss You! Parking Spots Available"
        body = render_template("daily_reminder.html", user=user)
        send_email(to_address=user.email, subject=subject, html_content=body)
        
    return f"Daily reminders sent to {len(inactive_users)} users."

@shared_task
def send_monthly_reports():
    """Generates and sends a detailed, styled monthly activity report to each user."""
    
    # Only send reports to active 'user' roles
    users = User.query.join(User.roles).filter(
        Role.name == 'user',
        User.active == True
    ).all()

    print(f"--- Running Monthly Report Job for {len(users)} users ---")

    today = datetime.utcnow()
    first_day_current_month = today.replace(day=1)
    last_day_last_month = first_day_current_month - timedelta(days=1)
    first_day_last_month = last_day_last_month.replace(day=1)
    month_name = first_day_last_month.strftime('%B %Y')

    for user in users:
        history = ParkingHistory.query.filter(
            ParkingHistory.user_id == user.id,
            and_(
                ParkingHistory.start_time >= first_day_last_month,
                ParkingHistory.start_time <= last_day_last_month
            )
        ).order_by(ParkingHistory.start_time.asc()).all()

        if not history:
            print(f"No parking history for {user.email} last month. Skipping report.")
            continue

        total_bookings = len(history)
        total_spent = sum(item.total_cost for item in history if item.total_cost)
        
        # Find most used lot
        lot_ids = [item.spot.lot_id for item in history if item.spot and item.spot.lot]
        most_used_lot_name = "N/A"
        if lot_ids:
            most_common_lot_id = Counter(lot_ids).most_common(1)[0][0]
            most_used_lot = ParkingLot.query.get(most_common_lot_id)
            if most_used_lot:
                most_used_lot_name = most_used_lot.name

        summary_data = {
            "total_bookings": total_bookings,
            "total_spent": f"{total_spent:.2f}",
            "most_used_lot": most_used_lot_name
        }

        report_html = render_template(
            "monthly_report.html",
            user=user,
            summary=summary_data,
            history=history,
            month_name=month_name
        )

        send_email(
            to_address=user.email,
            subject=f"Your Smart Park Monthly Summary for {first_day_last_month.strftime('%B')}",
            html_content=report_html
        )
    
    return "Monthly reports sent."


@shared_task
def send_admin_daily_summary():
    """
    Sends a daily summary report to all users with the 'admin' role.
    """
    # Find all admins
    admins = User.query.join(User.roles).filter(Role.name == 'admin').all()
    if not admins:
        print("--- No admin user found. Skipping admin summary. ---")
        return "No admin user found."

    # Calculate stats
    yesterday = datetime.utcnow() - timedelta(days=1)
    
    occupied_now = ParkingSpot.query.filter_by(is_occupied=True).count()
    available_now = ParkingSpot.query.filter_by(is_occupied=False).count()
    
    new_bookings_24h = ParkingHistory.query.filter(
        ParkingHistory.start_time >= yesterday
    ).count()

    revenue_24h = db.session.query(
        func.sum(ParkingHistory.total_cost)
    ).filter(
        ParkingHistory.end_time >= yesterday, # Bookings completed in the last 24h
        ParkingHistory.status.like('completed%')
    ).scalar() or 0.0

    stats = {
        "occupied_now": occupied_now,
        "available_now": available_now,
        "new_bookings_24h": new_bookings_24h,
        "revenue_24h": revenue_24h
    }

    report_date_str = datetime.utcnow().strftime('%Y-%m-%d')

    for admin in admins:
        print(f"--- Sending daily summary to admin: {admin.email} ---")
        body = render_template(
            "admin_daily_summary.html", 
            user=admin, 
            stats=stats, 
            report_date=report_date_str
        )
        send_email(
            to_address=admin.email, 
            subject=f"Smart Park Daily Summary - {report_date_str}", 
            html_content=body
        )
    
    return f"Admin daily summaries sent to {len(admins)} admin(s)."