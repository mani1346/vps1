export default {
    name: "AdminSearchPage",
    template: `
    <!-- Changed to 'container' for a centered, max-width layout -->
    <div class="container mt-4">
        <h2 class="mb-4">Admin Search</h2>

        <!-- SEARCH BAR in its own floating card -->
        <div class="card mb-4">
            <div class="card-body">
                <div class="input-group">
                    <select class="form-select" style="max-width: 180px;" v-model="searchBy">
                        <option value="user_id">Search by User</option>
                        <option value="location">Search by Location</option>
                        <option value="spot_id">Search by Spot</option>
                    </select>
                    <input type="text" class="form-control" placeholder="Enter search term..." v-model="searchString" @keyup.enter="performSearch">
                    
                    <!-- Updated button style to 'btn-success' (admin green) + icon -->
                    <button class="btn btn-success d-flex align-items-center" type="button" @click="performSearch" :disabled="loading">
                        <span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        <i v-if="!loading" class="bi bi-search me-2"></i>
                        {{ loading ? 'Searching...' : 'Search' }}
                    </button>
                </div>
            </div>
        </div>
        
        <!-- SEARCH RESULTS (Initial empty state) -->
        <div class="card" v-if="!results && !loading">
            <div class="card-body text-center text-muted" style="padding: 4rem;">
                <i class="bi bi-search" style="font-size: 3rem; opacity: 0.5;"></i>
                <h4 class="mt-3">Ready to search</h4>
                <p>Enter a term above to search for users, lots, or spots.</p>
            </div>
        </div>

        <!-- SEARCH RESULTS (Tabbed Interface) -->
        <div class="card" v-if="results && !loading">
            <div class="card-header">
                <!-- NEW: Use tabs for a super clean UI -->
                <ul class="nav nav-tabs card-header-tabs" id="myTab" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active" id="users-tab" data-bs-toggle="tab" data-bs-target="#users-panel" type="button">
                            Users ({{ results.users.length }})
                        </button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="lots-tab" data-bs-toggle="tab" data-bs-target="#lots-panel" type="button">
                            Lots ({{ results.lots.length }})
                        </button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="spots-tab" data-bs-toggle="tab" data-bs-target="#spots-panel" type="button">
                            Spots ({{ results.spots.length }})
                        </button>
                    </li>
                </ul>
            </div>
            
            <div class="card-body">
                <div class="tab-content" id="myTabContent">
                    
                    <!-- Users Panel -->
                    <div class="tab-pane fade show active" id="users-panel" role="tabpanel">
                        <div class="table-responsive">
                            <table class="table table-hover align-middle">
                                <thead>
                                    <tr><th>ID</th><th>Name</th><th>Email</th><th>Vehicle Number</th></tr>
                                </thead>
                                <tbody>
                                    <tr v-if="results.users.length === 0">
                                        <td colspan="4" class="text-center text-muted">No users found.</td>
                                    </tr>
                                    <tr v-for="user in results.users" :key="'user-'+user.id">
                                        <td>{{ user.id }}</td>
                                        <td>{{ user.first_name }} {{ user.last_name }}</td>
                                        <td>{{ user.email }}</td>
                                        <td>{{ user.vehicle_number }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Lots Panel -->
                    <div class="tab-pane fade" id="lots-panel" role="tabpanel">
                         <div class="table-responsive">
                            <!-- Converted lot cards to a clean table -->
                            <table class="table table-hover align-middle">
                                <thead>
                                    <tr>
                                        <th>Lot Name</th>
                                        <th>Address</th>
                                        <th>Price (₹/hr)</th>
                                        <th>Capacity</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-if="results.lots.length === 0">
                                        <td colspan="4" class="text-center text-muted">No parking lots found.</td>
                                    </tr>
                                    <tr v-for="lot in results.lots" :key="'lot-'+lot.id">
                                        <td><strong>{{ lot.name }}</strong></td>
                                        <td>{{ lot.address }}</td>
                                        <td>{{ lot.price.toFixed(2) }}</td>
                                        <td>{{ lot.capacity }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Spots Panel -->
                    <div class="tab-pane fade" id="spots-panel" role="tabpanel">
                         <div class="table-responsive">
                            <table class="table table-hover align-middle">
                                <thead>
                                    <tr><th>Spot ID</th><th>Spot Number</th><th>Lot Name</th><th>Status</th></tr>
                                </thead>
                                <tbody>
                                     <tr v-if="results.spots.length === 0">
                                        <td colspan="4" class="text-center text-muted">No spots found.</td>
                                     </tr>
                                    <tr v-for="spot in results.spots" :key="'spot-'+spot.id">
                                        <td>{{ spot.id }}</td>
                                        <td>{{ spot.spot_number }}</td>
                                        <td>{{ spot.lot_name }}</td>
                                        <td>
                                            <!-- Updated Status Badges -->
                                            <span class_ ="badge" :class="spot.is_occupied ? 'bg-danger-subtle text-danger-emphasis' : 'bg-success-subtle text-success-emphasis'">
                                                {{ spot.is_occupied ? 'Occupied' : 'Available' }}
                                            </span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `,
    data() {
        return {
            loading: false,
            error: null,
            searchBy: 'user_id',
            searchString: '',
            results: null,
        };
    },
    methods: {
        async performSearch() {
            if (!this.searchString.trim()) {
                this.results = null;
                return;
            }
            this.loading = true;
            this.error = null;
            this.results = null;

            try {
                const res = await fetch(`/api/admin/search?search_by=${this.searchBy}&search_string=${this.searchString.trim()}`, {
                    headers: { 'Authentication-Token': this.$store.state.auth_token },
                });
                if (!res.ok) throw new Error('Search failed.');
                this.results = await res.json();
            } catch (e) {
                this.error = e.message;
            } finally {
                this.loading = false;
            }
        },
    },
};