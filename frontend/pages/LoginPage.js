export default {
    name: "LoginPage",
    template: `
        <div class="container d-flex justify-content-center align-items-center" style="min-height: 80vh;">
            
            <div class="auth-page-card login-card" style="max-width: 450px; width: 100%;">
                
                <h3 class="card-title text-center mb-4">Smart Park Login</h3>
                
                <div v-if="error" class="alert alert-danger">{{ error }}</div>
                
                <!-- THIS IS THE HTML FIX -->
                <div class="mb-3">
                    <label for="email" class="form-label">Email address</label>
                    <div class="input-group">
                        <span class="input-group-text"><i class="bi bi-envelope-fill"></i></span>
                        <input type="email" class="form-control" id="email" placeholder="Enter your email" v-model="email" />
                    </div>
                </div>
                <div class="mb-3">
                    <label for="password" class="form-label">Password</label>
                    <div class="input-group">
                        <span class="input-group-text"><i class="bi bi-lock-fill"></i></span>
                        <input type="password" class="form-control" id="password" placeholder="Enter your password" v-model="password" />
                    </div>
                </div>
                <!-- END OF HTML FIX -->
                
                <button class="btn btn-primary w-100" @click="submitLogin">Login</button>

                <div class="text-center mt-3">
                    <p class="mb-0 text-muted">Don't have an account? <router-link to="/register">Create one</router-link></p>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            email: null,
            password: null,
            error: null,
        }
    },
    methods: {
        async submitLogin() {
            this.error = null;
            try {
                const res = await fetch('/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: this.email,
                        password: this.password
                    })
                });
                const data = await res.json();
                if (res.ok) {
                    localStorage.setItem('user', JSON.stringify(data));
                    this.$store.commit('setUser');
                    const destination = data.role === 'admin' ? '/admin/dashboard' : '/dashboard';
                    this.$router.push(destination).catch(() => {});
                } else {
                    this.error = data.message || 'Login failed.';
                }
            } catch (err) {
                this.error = 'An error occurred. Please try again.';
            }
        }
    },
}