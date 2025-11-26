export default {
    name: "UserDashboardPage",
    template: `
        <div class="container mt-4">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2>User Dashboard</h2>
                <button class="btn btn-outline-dark" @click="triggerUserExport" :disabled="exporting">
                    <i class="bi bi-download me-2"></i> {{ exporting ? 'Processing...' : 'Export History CSV' }}
                </button>
            </div>
            
            <div v-if="loading" class="text-center">Loading dashboard...</div>
            <div v-if="error" class="alert alert-danger">{{ error }}</div>

            <div v-if="!loading && !error">
                <!-- Summary Cards -->
                <div class="row mb-4">
                    <div class="col-md-6 mb-4" v-for="stat in summaryStats" :key="stat.label">
                        <!-- NEW stat card style -->
                        <div class="card stat-card stat-card-user h-100 position-relative">
                            <i class="bi" :class="stat.icon" style="font-size: 3rem; color: var(--user-accent); opacity: 0.2; position: absolute; right: 1rem; top: 1rem;"></i>
                            <div class="card-body">
                                <h5 class="stat-card-title">{{ stat.label }}</h5>
                                <p class="stat-card-value">{{ stat.value }}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Charts Section -->
                <div class="row">
                    <!-- Chart 1: Monthly Spend -->
                    <div class="col-md-6 mb-4">
                        <div class="card shadow-sm h-100">
                            <div class="card-body">
                                <h5 class="card-title text-muted mb-3">Monthly Spend (₹)</h5>
                                <div style="position: relative; height: 250px;">
                                    <canvas id="monthlySpendChart"></canvas>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Chart 2: Usage per Lot -->
                    <div class="col-md-6 mb-4">
                        <div class="card shadow-sm h-100">
                            <div class="card-body">
                                <h5 class="card-title text-muted mb-3">Visits per Parking Lot</h5>
                                <div style="position: relative; height: 250px;">
                                    <canvas id="lotUsageChart"></canvas>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            summaryStats: [],
            monthlySpend: {},
            lotUsage: {},
            loading: true,
            error: null,
            exporting: false,
            spendChartInstance: null,
            usageChartInstance: null,
        };
    },
    methods: {
        async fetchDashboardData() {
            this.loading = true;
            this.error = null;
            try {
                const res = await fetch('/api/user/dashboard', {
                    headers: { 'Authentication-Token': this.$store.state.auth_token }
                });
                if (!res.ok) throw new Error('Could not fetch dashboard data.');
                
                const data = await res.json();
                // Add icons
                data.summaryStats[0].icon = 'bi-journal-check';
                data.summaryStats[1].icon = 'bi-currency-rupee';
                this.summaryStats = data.summaryStats;
                this.monthlySpend = data.monthlySpend;
                this.lotUsage = data.lotUsage;

                this.loading = false;

                this.$nextTick(() => {
                    this.renderSpendChart();
                    this.renderUsageChart();
                });

            } catch (e) {
                this.error = e.message;
                this.loading = false;
            }
        },
        renderSpendChart() {
            if (this.spendChartInstance) this.spendChartInstance.destroy();
            
            const ctx = document.getElementById('monthlySpendChart');
            if (!ctx) return; // Add a guard
            this.spendChartInstance = new Chart(ctx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: this.monthlySpend.labels || [],
                    datasets: [{
                        label: 'Cost',
                        data: this.monthlySpend.data || [],
                        backgroundColor: 'rgba(0, 82, 212, 0.6)',
                        borderColor: 'rgba(0, 82, 212, 1)',
                        borderWidth: 1,
                        barThickness: 40,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true } }
                }
            });
        },
        renderUsageChart() {
            if (this.usageChartInstance) this.usageChartInstance.destroy();

            const ctx = document.getElementById('lotUsageChart');
            if (!ctx) return; // Add a guard
            this.usageChartInstance = new Chart(ctx.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: this.lotUsage.labels || [],
                    datasets: [{
                        data: this.lotUsage.data || [],
                        backgroundColor: [
                            'rgba(0, 82, 212, 0.7)',
                            'rgba(67, 100, 247, 0.7)',
                            'rgba(0, 176, 155, 0.7)',
                            'rgba(150, 201, 61, 0.7)',
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                }
            });
        },
        async triggerUserExport() {
            this.exporting = true;
            try {
                const startRes = await fetch('/api/user/trigger-export', {
                    method: 'POST',
                    headers: { 'Authentication-Token': this.$store.state.auth_token },
                });
                if (!startRes.ok) throw new Error("Failed to start export.");
                
                const { task_id } = await startRes.json();
                
                const interval = setInterval(async () => {
                    const statusRes = await fetch(`/api/user/download-export/${task_id}`);
                    if (statusRes.ok) {
                        clearInterval(interval); 
                        window.open(`/api/user/download-export/${task_id}`); 
                        this.exporting = false;
                    } else if (statusRes.status !== 202) {
                        clearInterval(interval);
                        this.exporting = false;
                        alert("Export failed.");
                    }
                }, 2000);
            } catch (e) {
                alert(e.message);
                this.exporting = false;
            }
        }
    },
    async mounted() {
        await this.fetchDashboardData();
    },
}