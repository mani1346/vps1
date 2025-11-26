export default {
    name: "RegisterPage",
    template: `
        <div class="container d-flex justify-content-center align-items-center" style="min-height: 80vh;">
            <div class="auth-page-card register-card" style="max-width: 550px; width: 100%;">
                <h3 class="card-title text-center mb-4">Create Your Account</h3>
                
                <!-- Error/Success Messages -->
                <div v-if="error" class="alert alert-danger">{{ error }}</div>
                <div v-if="success" class="alert alert-success">{{ success }}</div>
                
                <!-- Row for Name Fields -->
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label for="fname" class="form-label">First Name</label>
                        <div class="input-group">
                            <span class="input-group-text"><i class="bi bi-person-fill"></i></span>
                            <input type="text" class="form-control" id="fname" placeholder="John" v-model="first_name" required />
                        </div>
                    </div>
                     <div class="col-md-6 mb-3">
                        <label for="lname" class="form-label">Last Name</label>
                        <div class="input-group">
                            <span class="input-group-text"><i class="bi bi-person-fill"></i></span>
                            <input type="text" class="form-control" id="lname" placeholder="Doe" v-model="last_name" required />
                        </div>
                    </div>
                </div>
                
                <div class="mb-3">
                    <label for="vehicle" class="form-label">Vehicle Number</label>
                    <div class="input-group">
                        <span class="input-group-text"><i class="bi bi-car-front-fill"></i></span>
                        <input type="text" class="form-control" id="vehicle" placeholder="XX00XX0000" v-model="vehicle_number" required />
                    </div>
                </div>

                <div class="mb-3">
                    <label for="email" class="form-label">Email address</label>
                    <div class="input-group">
                        <span class="input-group-text"><i class="bi bi-envelope-fill"></i></span>
                        <input type="email" class="form-control" id="email" placeholder="you@example.com" v-model="email" required />
                    </div>
                </div>

                <div class="mb-4">
                    <label for="password" class="form-label">Password</label>
                     <div class="input-group">
                        <span class="input-group-text"><i class="bi bi-lock-fill"></i></span>
                        <input type="password" class="form-control" id="password" placeholder="Choose a strong password" v-model="password" required />
                    </div>
                </div>

                <button class="btn btn-success w-100" @click="submitRegister" :disabled="loading">
                    {{ loading ? 'Creating Account...' : 'Create Account' }}
                </button>
                
                <div class="text-center mt-3">
                    <p class="mb-0 text-muted">Already have an account? <router-link to="/login">Login</router-link></p>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            first_name: null,
            last_name: null,
            vehicle_number: null,
            email: null,
            password: null,
            error: null,
            success: null,
            loading: false
        }
    },
    methods: {
        async submitRegister() {
            this.error = null;
            this.success = null;
            this.loading = true;

            // Simple client-side validation
            if (!this.first_name || !this.last_name || !this.vehicle_number || !this.email || !this.password) {
                this.error = "Please fill in all fields.";
                this.loading = false;
                return;
            }

            try {
                const res = await fetch('/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        first_name: this.first_name,
                        last_name: this.last_name,
                        vehicle_number: this.vehicle_number,
                        email: this.email,
                        password: this.password,
                    })
                });

                const data = await res.json();

                if (res.ok) {
                    this.success = "User registered successfully! Redirecting to login...";
                    // Clear form
                    this.first_name = null;
                    this.last_name = null;
                    this.vehicle_number = null;
                    this.email = null;
                    this.password = null;
                    
                    // Redirect after a short delay
                    setTimeout(() => {
                        this.$router.push('/login');
                    }, 2000);
                } else {
                    // --- THIS IS THE FIX ---
                    // Display the full error details from the backend
                    if (data.error) {
                         this.error = data.message + ": " + data.error;
                    } else {
                         this.error = data.message || "Registration failed";
                    }
                    // --- END OF FIX ---
                }
            } catch (err) {
                console.error(err);
                this.error = "Something went wrong! Please try again.";
            } finally {
                this.loading = false;
            }
        }
    }
}


