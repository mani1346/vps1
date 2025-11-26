export default {
    name: "AdminDashboardPage",
    template: `
        <div class="container mt-4">
            <h2 class="mb-4">Admin Dashboard</h2>
            
            <div v-if="statsLoading" class="text-center">Loading dashboard data...</div>
            <div v-if="statsError" class="alert alert-danger">{{ statsError }}</div>

            <div v-if="!statsLoading && !statsError">
                <div class="row">
                    <div class="col-md-3 mb-4" v-for="stat in summaryStats" :key="stat.label">
                        <!-- NEW stat card style -->
                        <div class="card stat-card stat-card-admin h-100 position-relative">
                            <i class="bi" :class="stat.icon" style="font-size: 3rem; color: var(--admin-accent); opacity: 0.2; position: absolute; right: 1rem; top: 1rem;"></i>
                            <div class="card-body">
                                <h5 class="stat-card-title">{{ stat.label }}</h5>
                                <p class="stat-card-value">{{ stat.value }}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row mt-3">
                <div class="col-md-8 mb-4">
                    <div class="card h-100">
                        <div class="card-body">
                            <h5 class="card-title">Live Lot Status</h5>
                             <div v-if="lotsLoading" class="text-center">Loading parking lots...</div>
                            <div v-if="lotsError" class="alert alert-danger">{{ lotsError }}</div>
                            <div class="table-responsive" v-if="!lotsLoading && !lotsError">
                                <table class="table table-hover align-middle">
                                    <thead>
                                        <tr>
                                            <th>Lot Name</th>
                                            <th>Occupied</th>
                                            <th>Available</th>
                                            <th style="min-width: 150px;">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-if="parkingLots.length === 0">
                                            <td colspan="4" class="text-center text-muted">No parking lots found.</td>
                                        </tr>
                                        <tr v-for="lot in parkingLots" :key="lot.id">
                                            <td><strong>{{ lot.name }}</strong></td>
                                            <td>{{ lot.occupied }}</td>
                                            <td>{{ lot.capacity - lot.occupied }}</td>
                                            <td>
                                                <div class="progress" style="height: 25px;">
                                                    <div class="progress-bar bg-danger" role="progressbar" :style="{ width: (lot.occupied / lot.capacity * 100) + '%' }"></div>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-4 mb-4">
                    <div class="card h-100">
                        <div class="card-body">
                            <h5 class="card-title">Export All Parking Data</h5>
                            <p class="text-muted small">Trigger a background job to generate a CSV file of all parking history.</p>
                            <button class="btn btn-success w-100" @click="create_csv" :disabled="exporting">
                                <i class="bi bi-download me-2"></i>
                                {{ exporting ? 'Processing...' : 'Get Parking Data' }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    `,
    data() {
        return {
            summaryStats: [],
            parkingLots: [],
            statsLoading: true,
            statsError: null,
            lotsLoading: true,
            lotsError: null,
            exporting: false,
        };
    },
    methods: {
        async fetchStats() {
            this.statsLoading = true;
            this.statsError = null;
            try {
                const res = await fetch('/api/admin/summary', {
                    headers: { 'Authentication-Token': this.$store.state.auth_token },
                });
                if (!res.ok) throw new Error('Could not fetch dashboard summary.');
                const data = await res.json();
                // Add icons
                data.summaryStats[0].icon = 'bi-currency-rupee';
                data.summaryStats[1].icon = 'bi-people-fill';
                data.summaryStats[2].icon = 'bi-p-circle-fill';
                data.summaryStats[3].icon = 'bi-journal-check';
                this.summaryStats = data.summaryStats;
            } catch (e) {
                this.statsError = e.message;
            } finally {
                this.statsLoading = false;
            }
        },
        async fetchParkingLots() {
            this.lotsLoading = true;
            this.lotsError = null;
            try {
                const res = await fetch('/api/admin/lots', {
                    headers: { 'Authentication-Token': this.$store.state.auth_token },
                });
                if (!res.ok) throw new Error('Failed to fetch parking lots.');
                const data = await res.json();
                this.parkingLots = data.map(lot => ({
                    ...lot,
                    occupied: lot.spots.filter(spot => spot.is_occupied).length
                }));
            } catch (e) {
                this.lotsError = e.message;
            } finally {
                this.lotsLoading = false;
            }
        },
        async create_csv() {
            this.exporting = true;
            try {
                const startRes = await fetch('/api/admin/trigger-export', {
                    method: 'POST',
                    headers: { 'Authentication-Token': this.$store.state.auth_token },
                });
                if (!startRes.ok) throw new Error("Failed to start the export task.");
                
                const { task_id } = await startRes.json();
                
                const interval = setInterval(async () => {
                    const statusRes = await fetch(`/api/admin/download-export/${task_id}`);
                    if (statusRes.ok) {
                        clearInterval(interval); 
                        window.open(`/api/admin/download-export/${task_id}`); 
                        this.exporting = false;
                    } else if (statusRes.status !== 202) {
                        clearInterval(interval);
                        this.exporting = false;
                        alert('Could not generate the report. Please try again later.');
                    }
                }, 2000);
            } catch (e) {
                alert(e.message);
                this.exporting = false;
            }
        }
    },
    async mounted() {
        this.fetchStats();
        this.fetchParkingLots();
    },
}