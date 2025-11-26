export default {
    name: "ReservedParkingPage",
    template: `
    <!-- 
      --- THIS IS THE FIX ---
      Changed 'container-fluid' to 'container'.
      This adds a max-width and centers the content.
    -->
    <div class="container mt-4">
        <h2 class="mb-4">My Active Parkings</h2>
        
        <div v-if="loading" class="text-center">Loading active reservations...</div>
        <div v-if="error" class="alert alert-danger">{{ error }}</div>
        <div v-if="success" class="alert alert-success">{{ success }}</div>
        
        <!-- The 'card' class is now styled by main.css -->
        <div class="card" v-if="!loading && !error">
            <div class="card-body">
                
                <!-- NEW, styled empty state -->
                <div v-if="!activeReservations.length" class="text-center text-muted p-5">
                    <i class="bi bi-bookmark-x" style="font-size: 3rem; opacity: 0.5;"></i>
                    <h4 class="mt-3">No Active Reservations</h4>
                    <p>When you book a spot, it will appear here.</p>
                </div>

                <!-- Updated table styles -->
                <table class="table table-hover align-middle" v-else>
                    <thead>
                        <tr>
                            <th>Reservation ID</th>
                            <th>Spot Number</th>
                            <th>Lot Name</th>
                            <th>Start Time</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="res in activeReservations" :key="res.id">
                            <td>{{ res.id }}</td>
                            <td>{{ res.spot_number }}</td>
                            <td>{{ res.lot_name }}</td>
                            <td>{{ new Date(res.start_time).toLocaleString() }}</td>
                            <td>
                                <!-- 
                                  --- THIS IS THE FIX ---
                                  Updated buttons to match the premium theme and add icons.
                                -->
                                <button class="btn btn-outline-danger btn-sm me-2" @click="cancel(res.id)">
                                    <i class="bi bi-x-circle me-1"></i>Cancel
                                </button>
                                <button class="btn btn-primary btn-sm" @click="checkout(res.id)">
                                    <i class="bi bi-check-circle me-1"></i>Checkout
                                </button>
                                <!-- --- END OF FIX --- -->
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    `,
    data() {
        return {
            activeReservations: [],
            loading: true,
            error: null,
            success: null,
        };
    },
    methods: {
        async fetchActiveReservations() {
            this.loading = true;
            this.error = null;
            this.success = null;
            try {
                const res = await fetch('/api/user/reservations/active', {
                       headers: {
                           'Authentication-Token': this.$store.state.auth_token,
                       },
                });
                   if (!res.ok) {
                       throw new Error('Could not fetch active reservations.');
                   }
                this.activeReservations = await res.json();
            } catch(e) {
                this.error = e.message;
            } finally {
                this.loading = false;
            }
        },
        async cancel(reservationId) {
            if (confirm("Are you sure you want to cancel this reservation?")) {
                await this.updateReservation(reservationId, 'cancel', 'Reservation cancelled.');
            }
        },
        async checkout(reservationId) {
            if (confirm("Checkout this reservation and release the spot?")) {
                await this.updateReservation(reservationId, 'checkout', 'Checkout successful.');
            }
        },
        async updateReservation(id, action, successMessage) {
            this.error = null;
            this.success = null;
            try {
                const res = await fetch(`/api/user/reservations/${id}/${action}`, {
                    method: 'POST',
                    headers: {
                       'Authentication-Token': this.$store.state.auth_token,
                    },
                });
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.message || `Failed to ${action}.`);
                }
                this.success = successMessage;
                await this.fetchActiveReservations(); // Refresh the list
            } catch(e) {
                this.error = e.message;
            }
        }
    },
    async mounted() {
        await this.fetchActiveReservations();
    },
}