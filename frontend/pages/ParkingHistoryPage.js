export default {
    name: "ParkingHistoryPage",
    template: `
    <div> <!-- Root Wrapper -->
        <div class="container mt-4">
            <h2 class="mb-4">My Parking History</h2>
            <div v-if="loading" class="text-center">Loading history...</div>
            <div v-if="error" class="alert alert-danger">{{ error }}</div>
            
            <!-- This is now a "floating" card, matching main.css -->
            <div class="card" v-if="!loading && !error">
                <div class="card-body">
                    <div class="table-responsive">
                        
                        <!-- Updated table styles for a premium look -->
                        <table class="table table-hover align-middle">
                            <thead>
                                <tr>
                                    <th>Lot Name</th>
                                    <th>Cost (₹)</th>
                                    <th>Status</th>
                                    <th class="text-end">Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-if="history.length === 0">
                                    <td colspan="4" class="text-center text-muted">You have no parking history yet.</td>
                                </tr>
                                
                                <!-- The row is now clickable -->
                                <tr v-for="item in history" :key="item.id" @click="showDetails(item)" style="cursor: pointer;">
                                    
                                    <td><strong>{{ item.lot_name }}</strong></td>
                                    
                                    <!-- Formatted Cost -->
                                    <td>₹{{ (item.total_cost || 0).toFixed(2) }}</td>
                                    
                                    <!-- Formatted Status Badges -->
                                    <td>
                                        <span v-if="item.status === 'active'" class="badge bg-primary">
                                            Active
                                        </span>
                                        <span v-else-if="item.status === 'completed'" class="badge bg-success-subtle text-success-emphasis">
                                            Completed
                                        </span>
                                        <span v-else-if="item.status === 'completed_by_admin'" class="badge bg-info-subtle text-info-emphasis">
                                            Force Released
                                        </span>
                                        <span v-else-if="item.status === 'cancelled'" class="badge bg-secondary-subtle text-secondary-emphasis">
                                            Cancelled
                                        </span>
                                        <span v-else class="badge bg-warning-subtle text-warning-emphasis">
                                            {{ item.status }}
                                        </span>
                                    </td>

                                    <!-- Styled "View" button (user theme) -->
                                    <td class="text-end">
                                        <button class="btn btn-sm btn-outline-primary" @click.stop="showDetails(item)">
                                            <i class="bi bi-eye-fill me-1"></i> View
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <!-- NEW: Details Modal -->
        <div class="modal" tabindex="-1" style="display: block; background-color: rgba(0,0,0,0.5);" v-if="showModal && selectedHistoryItem">
            <div class="modal-dialog modal-dialog-centered">
                <!-- The modal-content class is automatically styled like a card by main.css -->
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">History Details (ID: {{ selectedHistoryItem.id }})</h5>
                        <button type="button" class="btn-close" @click="closeModal"></button>
                    </div>
                    <div class="modal-body">
                        <!-- Clean list for details -->
                        <ul class="list-group list-group-flush">
                             <li class="list-group-item d-flex justify-content-between">
                                <strong>Lot Name:</strong>
                                <span>{{ selectedHistoryItem.lot_name }}</span>
                            </li>
                             <li class="list-group-item d-flex justify-content-between">
                                <strong>Spot No:</strong>
                                <span>{{ selectedHistoryItem.spot_number }}</span>
                            </li>
                            <li class="list-group-item d-flex justify-content-between">
                                <strong>Start Time:</strong>
                                <span>{{ new Date(selectedHistoryItem.start_time).toLocaleString() }}</span>
                            </li>
                            <li class="list-group-item d-flex justify-content-between">
                                <strong>End Time:</strong>
                                <span>{{ selectedHistoryItem.end_time ? new Date(selectedHistoryItem.end_time).toLocaleString() : '-' }}</span>
                            </li>
                            <li class="list-group-item d-flex justify-content-between">
                                <strong>Cost:</strong>
                                <span>₹{{ (selectedHistoryItem.total_cost || 0).toFixed(2) }}</span>
                            </li>
                             <li class="list-group-item d-flex justify-content-between">
                                <strong>Status:</strong>
                                <span>{{ selectedHistoryItem.status }}</span>
                            </li>
                        </ul>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" @click="closeModal">Close</button>
                    </div>
                </div>
            </div>
        </div>
        <!-- End of Modal -->

    </div>
    `,
    data() {
        return {
            history: [],
            loading: true,
            error: null,
            // --- NEW data for modal ---
            showModal: false,
            selectedHistoryItem: null
        };
    },
    methods: {
        async fetchHistory() {
            this.loading = true;
            this.error = null;
            try {
                const res = await fetch('/api/user/history', {
                    headers: {
                        'Authentication-Token': this.$store.state.auth_token,
                    },
                });
                if (!res.ok) {
                    throw new Error('Could not fetch your parking history.');
                }
                this.history = await res.json();
            } catch (e) {
                this.error = e.message;
            } finally {
                this.loading = false;
            }
        },
        // --- NEW method to show modal ---
        showDetails(item) {
            this.selectedHistoryItem = item;
            this.showModal = true;
        },
        // --- NEW method to close modal ---
        closeModal() {
            this.showModal = false;
            this.selectedHistoryItem = null;
        }
    },
    async mounted() {
        await this.fetchHistory();
    },
}