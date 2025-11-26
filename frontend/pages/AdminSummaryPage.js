export default {
    name: "AdminSummaryPage",
    template: `
        <div class="container mt-4">
            <h2 class="mb-4">Summary & Reports</h2>
            <div v-if="loading" class="text-center">Loading chart data...</div>
            <div v-if="error" class="alert alert-danger">{{ error }}</div>
            
            <div v-if="!loading && !error">
                <div class="row">
                    <!-- Chart 1: Overall Spot Status -->
                    <div class="col-md-6 mb-4">
                        <div class="card h-100">
                            <div class="card-body">
                                <h5 class="card-title text-muted">Overall Spot Status</h5>
                                <!-- Added wrapper div for responsive height -->
                                <div style="position: relative; height: 300px;">
                                    <canvas id="spotStatusChart"></canvas>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Chart 2: Revenue per Lot -->
                    <div class="col-md-6 mb-4">
                        <div class="card h-100">
                            <div class="card-body">
                                <h5 class="card-title text-muted">Revenue per Lot (₹)</h5>
                                <!-- Added wrapper div for responsive height -->
                                <div style="position: relative; height: 300px;">
                                    <canvas id="revenueChart"></canvas>
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
            loading: true,
            error: null,
            spotStatusChartInstance: null,
            revenueChartInstance: null,
        };
    },
    methods: {
        async fetchChartData() {
            this.loading = true;
            this.error = null;
            try {
                const res = await fetch('/api/admin/chart-summary', {
                    headers: { 'Authentication-Token': this.$store.state.auth_token },
                });
                if (!res.ok) throw new Error('Could not fetch chart data.');
                const chartData = await res.json();

                this.loading = false;

                this.$nextTick(() => {
                    this.renderSpotStatusChart(chartData.spotStatus);
                    this.renderRevenueChart(chartData.revenuePerLot);
                });

            } catch (e) {
                this.error = e.message;
                this.loading = false;
            }
        },

        renderSpotStatusChart(data) {
            if (this.spotStatusChartInstance) {
                this.spotStatusChartInstance.destroy();
            }
            
            const computedStyle = getComputedStyle(document.documentElement);
            const colorAvailable = computedStyle.getPropertyValue('--admin-accent').trim() || '#02A85C';
            const colorOccupied = '#dc3545'; // Bootstrap 'danger' red
            const colorBorder = computedStyle.getPropertyValue('--card-bg').trim() || '#ffffff';

            const ctx = document.getElementById('spotStatusChart').getContext('2d');
            this.spotStatusChartInstance = new Chart(ctx, {
                // --- 1. CHANGED 'pie' TO 'doughnut' ---
                type: 'doughnut', 
                data: {
                    labels: data.labels,
                    datasets: [{
                        label: 'Spot Status',
                        data: data.data,
                        backgroundColor: [colorOccupied, colorAvailable],
                        borderColor: colorBorder,
                        borderWidth: 4,
                        // --- 2. ADDED HOVER EFFECT ---
                        hoverBorderWidth: 8,
                        hoverBorderColor: colorBorder,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                        }
                    },
                    // --- 3. THIS CREATES THE "HOLE" ---
                    cutout: '70%'
                }
            });
        },

        renderRevenueChart(data) {
            if (this.revenueChartInstance) {
                this.revenueChartInstance.destroy();
            }

            const computedStyle = getComputedStyle(document.documentElement);
            const colorPrimary = computedStyle.getPropertyValue('--user-accent').trim() || '#0052D4';
            const colorSecondary = computedStyle.getPropertyValue('--user-secondary').trim() || '#4364F7';

            const ctx = document.getElementById('revenueChart').getContext('2d');
            
            // --- 4. CREATE A GRADIENT FILL ---
            const barGradient = ctx.createLinearGradient(0, 0, 0, 300);
            barGradient.addColorStop(0, colorSecondary);
            barGradient.addColorStop(1, colorPrimary);

            const hoverGradient = ctx.createLinearGradient(0, 0, 0, 300);
            hoverGradient.addColorStop(0, colorPrimary);
            hoverGradient.addColorStop(1, colorSecondary);
            // --- END OF GRADIENT ---

            this.revenueChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.labels,
                    datasets: [{
                        label: 'Total Revenue (₹)',
                        data: data.data,
                        
                        // --- 5. APPLY STYLES ---
                        backgroundColor: barGradient,
                        hoverBackgroundColor: hoverGradient,
                        borderColor: 'transparent',
                        borderWidth: 0,
                        borderRadius: 8, // Rounded tops
                        // --- END OF STYLES ---
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false // Hide legend for a cleaner look
                        },
                        tooltip: {
                            backgroundColor: '#000',
                            titleFont: { size: 14 },
                            bodyFont: { size: 12 },
                            cornerRadius: 4
                        }
                    },
                    scales: { 
                        y: { 
                            beginAtZero: true,
                            grid: {
                                display: false // Hide Y-axis lines
                            }
                        },
                        x: {
                            grid: {
                                display: false // Hide X-axis lines
                            }
                        }
                    }
                }
            });
        }
    },
    async mounted() {
        await this.fetchChartData();
    },
}