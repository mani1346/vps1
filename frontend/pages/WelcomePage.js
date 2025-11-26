export default {
    name: "WelcomePage",
    template: `
        <div class="container-fluid" style="padding-top: 2rem;">

            <!-- SECTION 1: Hero & Finder -->
            <div class="row align-items-center" style="min-height: 80vh;">
                <!-- 1. The "Hero" Section -->
                <div class="col-lg-6 mb-4 mb-lg-0 ps-lg-5">
                    <h1 class="display-3" style="font-weight: 700; color: var(--text-color);">
                        Find Your Spot, <span style="color: var(--user-accent);">Instantly.</span>
                    </h1>
                    <p class="lead text-muted my-4">
                        Smart Park is an intelligent parking management system designed to simplify how you find, reserve, and manage parking.
                    </p>
                    <router-link to="/available-parking" class="btn btn-primary btn-lg shadow-lg">
                        <i class="bi bi-car-front-fill me-2"></i> Find Parking Now
                    </router-link>
                </div>

                <!-- 2. The "Finder" Card -->
                <div class="col-lg-6 d-flex justify-content-center">
                    <div class="card shadow-md" style="width: 100%; max-width: 450px;">
                        <div class="card-body p-4">
                            <h4 class="card-title text-center mb-4">Book Your Spot</h4>
                            
                            <div class="mb-3">
                                <label for="welcome-location" class="form-label">Location</label>
                                <div class="input-group">
                                    <span class="input-group-text"><i class="bi bi-geo-alt-fill"></i></span>
                                    <input type="text" class="form-control" id="welcome-location" placeholder="Search by name or address...">
                                </div>
                            </div>

                            <!-- --- THIS IS THE UPDATED SECTION --- -->
                            <div class="mb-3">
                                <label for="welcome-lot" class="form-label">Select Parking Lot</label>
                                <select class="form-select" id="welcome-lot" v-model="selectedLot">
                                    <option value="" disabled selected>
                                        {{ loading ? 'Loading lots...' : 'Any available lot' }}
                                    </option>
                                    <option v-for="lot in lots" :key="lot.id" :value="lot.id">
                                        {{ lot.name }}
                                    </option>
                                </select>
                            </div>

                            <router-link to="/available-parking" class="btn btn-success w-100 mt-3">
                                Show all results
                            </router-link>
                            <!-- --- END OF UPDATED SECTION --- -->
                        </div>
                    </div>
                </div>
            </div>

            <!-- SECTION 2: Features -->
            <div id="features-section" class="container" style="padding: 5rem 0;">
                <h2 class="text-center section-title">Why Smart Park?</h2>
                <div class="row">
                    <div class="col-md-4 mb-4">
                        <div class="feature-card text-center">
                            <i class="bi bi-speedometer2 feature-icon"></i>
                            <h3>Real-Time</h3>
                            <p>Find available spots instantly with our live map. No more circling the block.</p>
                        </div>
                    </div>
                    <div class="col-md-4 mb-4">
                        <div class="feature-card text-center">
                            <i class="bi bi-check-circle feature-icon"></i>
                            <h3>Simple to Use</h3>
                            <p>Book, park, and release your spot with just a few taps. It's that easy.</p>
                        </div>
                    </div>
                    <div class="col-md-4 mb-4">
                        <div class="feature-card text-center">
                            <i class="bi bi-shield-lock feature-icon"></i>
                            <h3>Secure & Reliable</h3>
                            <p>Powered by a secure backend, your reservations and data are always safe.</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- SECTION 3: About Us & Contact -->
            <div id="about-us-section" class="container" style="padding-bottom: 5rem;">
                <div class="card p-4 p-lg-5">
                    <div class="row align-items-center">
                        <div class="col-lg-7">
                            <h2 class="mb-4">About Us</h2>
                            <p class="lead text-muted">We are a team dedicated to solving your urban parking nightmares.</p>
                            <p>
                                Smart Park was born from a simple idea: parking in a city shouldn't be a source of stress. 
                                Our platform connects drivers with available parking spots in real-time, helping you save time,
                                fuel, and frustration. For parking lot owners, we provide a powerful backend to manage your
                                spots, optimize revenue, and gain insights into your operations.
                            </p>
                        </div>
                        <div class="col-lg-5 mt-4 mt-lg-0" id="contact-section">
                            <h4 class="mb-3">Contact Us</h4>
                            <div class="mb-3">
                                <label class="form-label">Your Name</label>
                                <input type="text" class="form-control" placeholder="John Doe">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Email</label>
                                <input type="email" class="form-control" placeholder="you@example.com">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Message</label>
                                <textarea class="form-control" rows="3" placeholder="Your message..."></textarea>
                            </div>
                            <button class="btn btn-success w-100">Send Message</button>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    `,
    // --- NEW DATA & MOUNTED HOOK ---
    data() {
        return {
            lots: [],
            loading: true,
            selectedLot: ""
        }
    },
    async mounted() {
        try {
            const res = await fetch('/api/public/lots');
            if (!res.ok) throw new Error('Failed to load lots');
            this.lots = await res.json();
        } catch (err) {
            console.error(err);
        } finally {
            this.loading = false;
        }
    }
}