export default {
    name: "AvailableParkingPage",
    template: `
        <div class="container mt-4">
            <h2 class="mb-4">Available Parking Lots</h2>

            <!-- Loading and Error Messages -->
            <div v-if="loading" class="text-center">Loading...</div>
            <div v-if="error" class="alert alert-danger">{{ error }}</div>
            <div v-if="success" class="alert alert-success">{{ success }}</div>

            <div class="card shadow-sm" v-if="!loading">
                <div class="card-body">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>Lot Name</th>
                                <th>Address</th>
                                <th>Price (₹/hr)</th>
                                <th>Available Spots</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="lot in availableLots" :key="lot.id">
                                <td>{{ lot.name }}</td>
                                <td>{{ lot.address }}</td>
                                <td>{{ lot.price }}</td>
                                <td>{{ lot.available_spots }}</td>
                                <td>
                                    <button 
                                        class="btn btn-primary btn-sm" 
                                        @click="reserveSpot(lot.id)"
                                        :disabled="lot.available_spots === 0">
                                        {{ lot.available_spots === 0 ? 'Full' : 'Reserve' }}
                                    </button>
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
            availableLots: [],
            loading: true,
            error: null,
            success: null,
        };
    },
    methods: {
        async fetchAvailableLots() {
            this.loading = true;
            this.error = null;
            this.success = null;
            try {
                const res = await fetch('/api/user/available-lots', {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authentication-Token':  this.$store.state.auth_token,
                    },
                });
                if (!res.ok) {
                    throw new Error('Could not fetch available lots.');
                }
                this.availableLots = await res.json();
            } catch (e) {
                this.error = e.message;
            } finally {
                this.loading = false;
            }
        },
        async reserveSpot(lotId) {
            this.error = null;
            this.success = null;
            if (confirm("Are you sure you want to reserve a spot in this lot?")) {
                try {
                    const res = await fetch('/api/user/reserve/' + lotId, {
                        method: 'POST',
                        headers: {
                            'Authentication-Token':  this.$store.state.auth_token,
                        },
                    });
                    const data = await res.json();
                    if (!res.ok) {
                        throw new Error(data.message || 'Failed to reserve spot.');
                    }
                    this.success = data.message;
                    // Refresh the list to show updated spot counts
                    await this.fetchAvailableLots();
                } catch (e) {
                    this.error = e.message;
                }
            }
        }
    },
    async mounted() {
        await this.fetchAvailableLots();
    },
}
