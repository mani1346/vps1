export default {
    name: "Navbar",
    template: `
        <nav class="navbar navbar-expand-lg navbar-light bg-white shadow-sm sticky-top">
            <div class="container-fluid">
                
                <!-- Brand Logo (Always shows) -->
                <router-link class="navbar-brand" :to="homeLink">
                    Smart Park™
                </router-link>

                <!-- Mobile Toggler -->
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                    <span class="navbar-toggler-icon"></span>
                </button>

                <!-- Links Wrapper -->
                <div class="collapse navbar-collapse" id="navbarNav">
                    
                    <!-- 1. LOGGED-IN LINKS (Admin) -->
                    <ul class="navbar-nav me-auto mb-2 mb-lg-0" v-if="isAdmin">
                        <!-- ... (your admin links are fine) ... -->
                        <li class="nav-item">
                            <router-link class="nav-link" to="/admin/dashboard"><i class="bi bi-speedometer2 me-1"></i> Dashboard</router-link>
                        </li>
                        <li class="nav-item">
                            <router-link class="nav-link" to="/admin/parking-lots"><i class="bi bi-grid-3x3-gap-fill me-1"></i> Parking Lots</router-link>
                        </li>
                         <li class="nav-item">
                            <router-link class="nav-link" to="/admin/users"><i class="bi bi-people-fill me-1"></i> Users</router-link>
                        </li>
                         <li class="nav-item">
                            <router-link class="nav-link" to="/admin/search"><i class="bi bi-search me-1"></i> Search</router-link>
                        </li>
                         <li class="nav-item">
                            <router-link class="nav-link" to="/admin/parking-history"><i class="bi bi-clock-history me-1"></i> History</router-link>
                        </li>
                         <li class="nav-item">
                            <router-link class="nav-link" to="/admin/summary"><i class="bi bi-pie-chart-fill me-1"></i> Summary</router-link>
                        </li>
                    </ul>

                    <!-- 2. LOGGED-IN LINKS (User) -->
                    <ul class="navbar-nav me-auto mb-2 mb-lg-0" v-if="isUser">
                        <!-- ... (your user links are fine) ... -->
                        <li class="nav-item">
                            <router-link class="nav-link" to="/dashboard"><i class="bi bi-house-door-fill me-1"></i> Home</router-link>
                        </li>
                        <li class="nav-item">
                            <router-link class="nav-link" to="/available-parking"><i class="bi bi-car-front-fill me-1"></i> Find Parking</router-link>
                        </li>
                        <li class="nav-item">
                            <router-link class="nav-link" to="/reserved-parking"><i class="bi bi-bookmark-check-fill me-1"></i> My Reservations</router-link>
                        </li>
                        <li class="nav-item">
                            <router-link class="nav-link" to="/parking-history"><i class="bi bi-clock-history me-1"></i> My History</router-link>
                        </li>
                    </ul>

                    <!-- 3. PUBLIC LINKS (Logged Out) -->
                    <ul class="navbar-nav me-auto mb-2 mb-lg-0" v-if="!isLoggedIn">
                        <li class="nav-item">
                            <router-link class="nav-link" to="/">Home</router-link>
                        </li>
                        
                        <!-- --- THIS IS THE FIX --- -->
                        <li class="nav-item">
                            <a class="nav-link" href="#about-us-section" @click.prevent="scrollToAbout">About Us</a>
                        </li>
                        <!-- --- END OF FIX --- -->
                        
                        <li class="nav-item">
                            <a class="nav-link" href="#contact-section" @click.prevent="scrollToContact">Contact</a>
                        </li>
                    </ul>

                    <!-- Right-side content -->
                    <div class="d-flex align-items-center">
                        
                        <!-- 4. LOGGED-IN USER INFO -->
                        <template v-if="isLoggedIn">
                            <span class="navbar-text me-3 fw-bold" :class="isAdmin ? 'admin-text' : 'user-text'">
                                Welcome, {{ userEmail }}
                            </span>
                            <button class="btn btn-outline-danger btn-sm" @click="logout">
                                <i class="bi bi-box-arrow-right me-1"></i> Logout
                            </button>
                        </template>

                        <!-- 5. LOGGED-OUT BUTTONS (Login/Register) -->
                        <template v-if="!isLoggedIn">
                            <router-link to="/login" class="btn btn-outline-success btn-sm me-2" v-if="this.$route.path !== '/login'">
                                Login
                            </router-link>
                            <router-link to="/register" class="btn btn-success btn-sm" v-if="this.$route.path !== '/register'">
                                Register
                            </router-link>
                        </template>
                    </div>

                </div>
            </div>
        </nav>
    `,
    computed: {
        isLoggedIn() {
            return this.$store.state.loggedIn;
        },
        userEmail() {
            return this.$store.state.user_email;
        },
        isUser() {
            return this.isLoggedIn && this.$store.state.role === 'user';
        },
        isAdmin() {
            return this.isLoggedIn && this.$store.state.role === 'admin';
        },
        homeLink() {
            if (this.isAdmin) return '/admin/dashboard';
            if (this.isUser) return '/dashboard';
            return '/';
        },
    },
    methods: {
        logout() {
            this.$store.commit('logout');
            this.$router.push('/login').catch(() => {});
        },

        // --- THIS IS THE NEW METHOD TO FIX THE FREEZE ---
        scrollToSection(sectionId) {
            if (this.$route.path !== '/') {
                // If we are not on the homepage, navigate there first
                this.$router.push('/'
).then(() => {
                    // Wait for Vue to render, then scroll
                    this.$nextTick(() => {
                        const el = document.getElementById(sectionId);
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                    });
                });
            } else {
                // If we are already on the homepage, just scroll
                const el = document.getElementById(sectionId);
                if (el) el.scrollIntoView({ behavior: 'smooth' });
            }
        },
        scrollToAbout() {
            this.scrollToSection('about-us-section');
        },
        scrollToContact() {
            this.scrollToSection('contact-section');
        }
        // --- END OF NEW METHOD ---
    }
}