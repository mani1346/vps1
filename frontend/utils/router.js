// Import Vue components for each page
import WelcomePage from "../pages/WelcomePage.js";
import LoginPage from "../pages/LoginPage.js";
import RegisterPage from "../pages/RegisterPage.js";

// User Pages
import UserDashboardPage from "../pages/UserDashboardPage.js";
import AvailableParkingPage from "../pages/AvailableParkingPage.js";
import ReservedParkingPage from "../pages/ReservedParkingPage.js";
import ParkingHistoryPage from "../pages/ParkingHistoryPage.js";

// Admin Pages
import AdminDashboardPage from "../pages/AdminDashboardPage.js";
import AdminLotsNew from "../pages/AdminLotsNew.js";
import AdminUsersPage from "../pages/AdminUsersPage.js";
import AdminParkingHistoryPage from "../pages/AdminParkingHistoryPage.js";
import AdminSummaryPage from "../pages/AdminSummaryPage.js";
import AdminSearchPage from '../pages/AdminSearchPage.js'

// Import the Vuex store to check login state
import store from './store.js'

// Define the routes for the application
const routes = [
    // --- Public Routes ---
    { path: '/', component: WelcomePage },
    { path: '/login', component: LoginPage },
    { path: '/register', component: RegisterPage },

    // --- User Routes (require login) ---
    { path: '/dashboard', component: UserDashboardPage, meta: { requiresLogin: true, role: 'user' } },
    { path: '/available-parking', component: AvailableParkingPage, meta: { requiresLogin: true, role: 'user' } },
    { path: '/reserved-parking', component: ReservedParkingPage, meta: { requiresLogin: true, role: 'user' } },
    { path: '/parking-history', component: ParkingHistoryPage, meta: { requiresLogin: true, role: 'user' } },

    // --- Admin Routes (require login and 'admin' role) ---
    { path: '/admin/dashboard', component: AdminDashboardPage, meta: { requiresLogin: true, role: "admin" } },
    { path: '/admin/parking-lots', component: AdminLotsNew, meta: { requiresLogin: true, role: "admin" } },    { path: '/admin/users', component: AdminUsersPage, meta: { requiresLogin: true, role: "admin" } },
    { path: '/admin/parking-history', component: AdminParkingHistoryPage, meta: { requiresLogin: true, role: "admin" } },
    { path: '/admin/summary', component: AdminSummaryPage, meta: { requiresLogin: true, role: "admin" } },
    { path: '/admin/search', component: AdminSearchPage, meta: { requiresAuth: true, role: 'admin' } }
];

const router = new VueRouter({
    routes
});

// Navigation guards to protect routes
router.beforeEach((to, from, next) => {
    // Check if the route requires authentication
    if (to.matched.some((record) => record.meta.requiresLogin)) {
        // If user is not logged in, redirect to the login page
        if (!store.state.loggedIn) {
            next({ path: '/login' });
        } 
        // If the route requires a specific role and the user's role doesn't match
        else if (to.meta.role && to.meta.role !== store.state.role) {
            // For a better user experience, you might redirect them to their own dashboard
            if (store.state.role === 'admin') {
                next({ path: '/admin/dashboard' });
            } else {
                next({ path: '/dashboard' });
            }
        } 
        // If user is logged in and has the correct role, proceed
        else {
            next();
        }
    } 
    // If the route doesn't require login, let them pass
    else {
        next();
    }
});

export default router;
