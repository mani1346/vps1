Smart Park: Vehicle Parking System - V2
============================================

1\. Student Details
-------------------

*   **Name:** \[Mani Manjunath V\]
    
*   **Roll Number:** \[23f3001956@ds.stduy.iitm.ac.in\]
    
*   **Course:** Modern Application Development II (Project)
    

2\. Project Details
-------------------

### Problem Statement

The goal was to develop a multi-user Vehicle Parking App (V2) to manage parking lots, spots, and vehicle reservations. The system required two distinct roles: an **Admin** (superuser) to manage the infrastructure (lots, spots) and users, and a **User** to find, book, and manage parking spots. The application needed to be built using a specific stack (Flask, VueJS, SQLite, Redis, Celery) and include advanced features like role-based access control, asynchronous jobs (CSV export, email reports), and a responsive, premium UI.

### Approach & Implementation

My approach focused on building a robust, decoupled architecture with a clear separation of concerns:

1.  **Backend API (Flask):** I built a RESTful API using Flask-RESTful to serve data to the frontend.
    
    *   **Authentication:** Implemented token-based authentication using Flask-Security-Too, securing endpoints with @auth\_required and @roles\_required.
        
    *   **Database Design:** Created a relational model with User, Role, ParkingLot, ParkingSpot, and ParkingHistory. I ensured data integrity with foreign keys and cascade deletes.
        
    *   **Business Logic:** Implemented complex logic for dynamic pricing (hourly rates with rounding), capacity management (auto-creating spots), and validation (preventing double booking).
        
2.  **Frontend (VueJS):** I developed a Single Page Application (SPA) using Vue 2.
    
    *   **State Management:** Used Vuex to manage the authentication state (token, role) and persist it across sessions.
        
    *   **Routing:** Implemented Vue Router with navigation guards to protect admin routes from unauthorized access.
        
    *   **UI/UX:** Designed a "Premium Minimalist" interface using Bootstrap 5.3 and custom CSS. I implemented a responsive layout with floating cards, a clean navbar, and visual cues (emojis for parking spots).
        
3.  **Async Tasks (Celery & Redis):** Offloaded time-consuming and scheduled tasks to background workers.
    
    *   **Scheduled Jobs:** Configured Celery Beat to run a daily job (sending admin summaries) and a monthly job (sending user activity reports).
        
    *   **On-Demand Jobs:** Created a user-triggered task for exporting parking history to CSV, using a polling mechanism on the frontend to download the file when ready.
        
4.  **Caching (Redis):** Integrated Flask-Caching to cache public and high-traffic API endpoints (like the list of parking lots), improving performance. I implemented cache invalidation strategies to ensure data consistency when updates occur (e.g., clearing cache on new bookings).
    

3\. Frameworks and Libraries Used
---------------------------------

### Backend

*   **Flask:** Core web framework.
    
*   **Flask-RESTful:** For building the API resources.
    
*   **Flask-SQLAlchemy:** ORM for database interactions.
    
*   **Flask-Security-Too:** For authentication, role management, and password hashing.
    
*   **Flask-Caching:** For API response caching using Redis.
    
*   **Flask-Migrate:** For database schema migrations.
    
*   **Celery:** Distributed task queue for async and scheduled jobs.
    
*   **Redis:** Message broker for Celery and backend for caching.
    
*   **MailHog:** Local SMTP server for testing emails.
    

### Frontend

*   **Vue.js (v2):** Reactive frontend framework.
    
*   **Vue Router:** Client-side routing.
    
*   **Vuex:** State management pattern.
    
*   **Bootstrap 5.3:** CSS framework for responsive grid and components.
    
*   **Bootstrap Icons:** For vector icons.
    
*   **Chart.js:** For visualizing data on dashboards.
    
*   **Fetch API:** For making HTTP requests to the backend.
    

4\. Database Schema (ER Diagram Description)
--------------------------------------------

The SQLite database consists of the following related tables:

*   **User:** Stores user credentials, vehicle number, and active status.
    
*   **Role:** Defines roles (admin, user).
    
*   **roles\_users (Association):** Links users to roles (Many-to-Many).
    
*   **ParkingLot:** Stores lot details (name, address, price, capacity).
    
    *   _One-to-Many_ with ParkingSpot.
        
*   **ParkingSpot:** Represents a physical spot (e.g., "S-1"). Contains status (is\_occupied).
    
    *   _One-to-Many_ with ParkingHistory.
        
*   **ParkingHistory:** Records every booking transaction (start time, end time, cost, status).
    
    *   Links User and ParkingSpot.
        

_(Note: A visual ER diagram image should be included here in the submission)._

5\. API Endpoints
-----------------

Method

Endpoint

Description

Access

**POST**

/login

Authenticate user and return token

Public

**POST**

/register

Create a new user account

Public

**GET**

/api/public/lots

List all lots (names only) for dropdowns

Public

**GET**

/api/admin/lots

Get full details of all lots & spots

Admin

**POST**

/api/admin/lots

Create a new parking lot

Admin

**PUT**

/api/admin/lots/

Update lot details & capacity

Admin

**DELETE**

/api/admin/lots/

Delete a lot (if empty)

Admin

**GET**

/api/admin/summary

Get dashboard stats (revenue, users)

Admin

**GET**

/api/admin/history

Get full parking history

Admin

**POST**

/api/admin/release-spot/

Force release a spot

Admin

**POST**

/api/admin/trigger-export

Start CSV export job

Admin

**GET**

/api/user/available-lots

Get lots with availability counts

User

**POST**

/api/user/reserve/

Book first available spot

User

**POST**

/api/user/reservations//checkout

End parking session & calculate cost

User
