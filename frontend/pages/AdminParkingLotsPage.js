export default {
    name: "AdminParkingLotsPage",
    template: `
    <div> <div class="container-fluid mt-4">
            <div class="d-flex justify-content-between align-items-center mb-4 px-3">
                <h2 class="mb-0">Parking Lots</h2>
                <button class="btn btn-success d-flex align-items-center" @click="showAddLotModal = true">
                    <i class="bi bi-plus-lg me-2"></i>Add Lot
                </button>
            </div>
            
            <div v-if="loading" class="text-center">Loading parking lots...</div>
            <div v-if="error" class="alert alert-danger">{{ error }}</div>

            <div class="row" v-if="!loading && !error">
                <div v-for="lot in parkingLots" :key="lot.id" class="col-xl-4 col-lg-6 col-md-12 mb-4">
                    <div class="card h-100">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <h5 class="card-title mb-0">{{ lot.name }}</h5>
                                    <small class="text-muted">{{ lot.address }}</small>
                                </div>
                                <div>
                                    <a href="#" @click.prevent="handleEditLot(lot)" class="text-muted me-3" style="font-size: 1.1rem;"><i class="bi bi-pencil-fill"></i></a>
                                    <a href="#" @click.prevent="handleDeleteLot(lot.id)" class="text-danger" style="font-size: 1.1rem;"><i class="bi bi-trash-fill"></i></a>
                                </div>
                            </div>
                            <div class="d-flex justify-content-between align-items-baseline my-2">
                                <small class="text-muted">Occupied: {{ lot.occupied }} / {{ lot.capacity }}</small>
                                <span class="badge bg-light text-dark fs-6">₹{{ lot.price.toFixed(2) }}/hr</span>
                            </div>
                            <hr class="my-2">
                            <div class="d-flex flex-wrap" style="background-color: #f8f9fa; border-radius: 4px; padding: 5px;">
                                <div v-for="spot in lot.spots" :key="spot.id" 
                                     class="spot-box d-flex align-items-center justify-content-center"
                                     :class="spot.is_occupied ? 'spot-occupied' : 'spot-available'"
                                     @click="openSpotViewModal(spot)">
                                     
                                     {{ spot.is_occupied ? '🚗' : '' }}
                                     
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                 <div v-if="!loading && parkingLots.length === 0" class="col-12 text-center text-muted mt-5">
                    <h4>No parking lots have been created yet.</h4>
                    <p>Click the "+ Add Lot" button to get started.</p>
                </div>
            </div>

            <div class="modal" tabindex="-1" style="display: block; background-color: rgba(0,0,0,0.5);" v-if="showSpotViewModal && selectedSpot">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Spot {{ selectedSpot.spot_number }}</h5>
                            <button type="button" class="btn-close" @click="closeSpotViewModal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3 row">
                                <label class="col-sm-3 col-form-label">Spot ID:</label>
                                <div class="col-sm-9">
                                    <input type="text" readonly class="form-control-plaintext" :value="selectedSpot.id">
                                </div>
                            </div>
                            <div class="mb-3 row align-items-center">
                                <label class="col-sm-3 col-form-label">Status:</label>
                                <div class="col-sm-9">
                                    <button class="btn btn-sm" :class="selectedSpot.is_occupied ? 'btn-danger' : 'btn-success'" @click="selectedSpot.is_occupied ? viewSpotDetails(selectedSpot) : null" :disabled="!selectedSpot.is_occupied">
                                        {{ selectedSpot.is_occupied ? 'Occupied (Click to view)' : 'Available' }}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer justify-content-between">
                             <button type="button" class="btn btn-outline-danger" @click="deleteSpot(selectedSpot)" :disabled="selectedSpot.is_occupied">
                                <i class="bi bi-trash-fill me-2"></i>Delete Spot
                             </button>
                            <button type="button" class="btn btn-secondary" @click="closeSpotViewModal">Close</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="modal" tabindex="-1" style="display: block; background-color: rgba(0,0,0,0.5);" v-if="showSpotDetailsModal && selectedSpotDetails">
                 <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Occupied Parking Spot Details</h5>
                            <button type="button" class="btn-close" @click="closeSpotDetailsModal"></button>
                        </div>
                        <div class="modal-body">
                            <div v-if="detailsLoading" class="text-center">Loading details...</div>
                            <div v-else>
                                <ul class="list-group list-group-flush">
                                    <li class="list-group-item d-flex justify-content-between"><strong>Spot ID:</strong> <span>{{ selectedSpotDetails.spot_id }}</span></li>
                                    <li class="list-group-item d-flex justify-content-between"><strong>Customer ID:</strong> <span>{{ selectedSpotDetails.user_id }}</span></li>
                                    <li class="list-group-item d-flex justify-content-between"><strong>Vehicle Number:</strong> <span>{{ selectedSpotDetails.vehicle_number }}</span></li>
                                    <li class="list-group-item d-flex justify-content-between"><strong>Parked At:</strong> <span>{{ new Date(selectedSpotDetails.start_time).toLocaleString() }}</span></li>
                                    <li class="list-group-item d-flex justify-content-between"><strong>Lot Price:</strong> <span>₹{{ selectedSpotDetails.parking_cost }} / hour</span></li>
                                </ul>
                            </div>
                        </div>
                        <div class="modal-footer justify-content-between">
                            <button type="button" class="btn btn-warning" @click="forceReleaseSpot" :disabled="detailsLoading">
                                <i class="bi bi-unlock-fill me-2"></i>
                                {{ detailsLoading ? 'Releasing...' : 'Force Release Spot' }}
                            </button>
                            <button type="button" class="btn btn-secondary" @click="closeSpotDetailsModal" :disabled="detailsLoading">Close</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="modal" tabindex="-1" style="display: block; background-color: rgba(0,0,0,0.5);" v-if="showAddLotModal">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Add New Parking Lot</h5>
                            <button type="button" class="btn-close" @click="closeAddModal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="form-group mb-2"><label>Lot Name</label><input type="text" class="form-control" v-model="newLot.name"></div>
                            <div class="form-group mb-2"><label>Address</label><input type="text" class="form-control" v-model="newLot.address"></div>
                            <div class="form-group mb-2"><label>Capacity</label><input type="number" min="1" class="form-control" v-model.number="newLot.capacity"></div>
                            <div class="form-group mb-2"><label>Price</label><input type="number" min="0" step="0.5" class="form-control" v-model.number="newLot.price"></div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" @click="closeAddModal">Close</button>
                            <button type="button" class="btn btn-success" @click="handleAddLot">
                                <i class="bi bi-check-circle-fill me-2"></i>Save Lot
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal" tabindex="-1" style="display: block; background-color: rgba(0,0,0,0.5);" v-if="showEditLotModal && editingLot">
                 <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Edit Parking Lot #{{ editingLot.id }}</h5>
                            <button type="button" class="btn-close" @click="closeEditModal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="form-group mb-2"><label>Lot Name</label><input type="text" class="form-control" v-model="editingLot.name"></div>
                            <div class="form-group mb-2"><label>Address</label><input type="text" class="form-control" v-model="editingLot.address"></div>
                            <div class="form-group mb-2"><label>Capacity</label><input type="number" min="1" class="form-control" v-model.number="editingLot.capacity"></div>
                            <div class="form-group mb-2"><label>Price</label><input type="number" min="0" step="0.5" class="form-control" v-model.number="editingLot.price"></div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" @click="closeEditModal">Close</button>
                            <button type="button" class="btn btn-success" @click="handleUpdateLot">
                                <i class="bi bi-check-circle-fill me-2"></i>Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    </div> `,
    data() {
        return {
            parkingLots: [],
            loading: true,
            error: null,
            showAddLotModal: false, 
            newLot: { name: '', address: '', capacity: 10, price: 50.0 },
            showEditLotModal: false,
            editingLot: null,
            showSpotViewModal: false,
            selectedSpot: null,
            showSpotDetailsModal: false,
            selectedSpotDetails: null,
            detailsLoading: false,
        };
    },
    methods: {
        // --- No changes to any methods ---
        async fetchParkingLots() {
            this.loading = true;
            this.error = null;
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
                this.error = e.message;
            } finally {
                this.loading = false;
            }
        },
        async handleAddLot() {
            if (!this.newLot.name || !this.newLot.address || !this.newLot.capacity || !this.newLot.price) return alert('Please fill out all fields.');
            try {
                const res = await fetch('/api/admin/lots', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authentication-Token': this.$store.state.auth_token },
                    body: JSON.stringify(this.newLot)
                });
                if (!res.ok) throw new Error((await res.json()).message || 'Failed to create lot.');
                alert('Parking lot created successfully!');
                this.closeAddModal();
                await this.fetchParkingLots();
            } catch(e) { alert(e.message); }
        },
        handleEditLot(lot) {
            this.editingLot = { ...lot }; 
            this.showEditLotModal = true;
        },
        async handleUpdateLot() {
            if (!this.editingLot) return;
            try {
                const res = await fetch('/api/admin/lots/' + this.editingLot.id, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authentication-Token': this.$store.state.auth_token },
                    body: JSON.stringify(this.editingLot)
                });
                if (!res.ok) throw new Error((await res.json()).message || 'Failed to update lot.');
                alert('Parking lot updated successfully!');
                this.closeEditModal();
                await this.fetchParkingLots();
            } catch(e) { alert(e.message); }
        },
        async handleDeleteLot(lotId) {
            if (!confirm(`Are you sure you want to delete lot #${lotId}? This will also delete all its spots.`)) return;
            try {
                const res = await fetch('/api/admin/lots/'+ lotId, {
                    method: 'DELETE',
                    headers: { 'Authentication-Token': this.$store.state.auth_token },
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message);
                alert(data.message);
                await this.fetchParkingLots();
            } catch (e) { alert(e.message); }
        },
        closeAddModal() {
            this.showAddLotModal = false;
            this.newLot = { name: '', address: '', capacity: 10, price: 50.0 };
        },
        closeEditModal() {
            this.showEditLotModal = false;
            this.editingLot = null;
        },
        openSpotViewModal(spot) {
            this.selectedSpot = spot;
            this.showSpotViewModal = true;
        },
        closeSpotViewModal() {
            this.showSpotViewModal = false;
            this.selectedSpot = null;
        },
        async viewSpotDetails(spot) {
            this.detailsLoading = true;
            this.closeSpotViewModal();
            this.showSpotDetailsModal = true;
            try {
                const res = await fetch(`/api/admin/spots/${spot.id}/details`, {
                    headers: { 'Authentication-Token': this.$store.state.auth_token },
                });
                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.message || 'Could not fetch spot details.');
                }
                this.selectedSpotDetails = await res.json();
            } catch (e) {
                alert(e.message);
                this.closeSpotDetailsModal();
            } finally {
                this.detailsLoading = false;
            }
        },
        closeSpotDetailsModal() {
            this.showSpotDetailsModal = false;
            this.selectedSpotDetails = null;
        },
        async deleteSpot(spot) {
            if (!confirm(`Are you sure you want to delete spot ${spot.spot_number}?`)) return;
            try {
                const res = await fetch(`/api/admin/spots/${spot.id}`, {
                    method: 'DELETE',
                    headers: { 'Authentication-Token': this.$store.state.auth_token },
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message);
                alert(data.message);
                this.closeSpotViewModal();
                await this.fetchParkingLots();
            } catch (e) {
                alert(e.message);
            }
        },
        async forceReleaseSpot() {
            if (!this.selectedSpotDetails) return;
            const spotId = this.selectedSpotDetails.spot_id;
            const spotNumber = this.selectedSpotDetails.spot_number;
            if (!confirm(`Are you sure you want to force-release spot #${spotNumber}? This will end the user's active session.`)) return;

            this.detailsLoading = true;
            try {
                const res = await fetch(`/api/admin/release-spot/${spotId}`, {
                    method: 'POST',
                    headers: { 'Authentication-Token': this.$store.state.auth_token },
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message);
                
                alert(data.message);
                this.closeSpotDetailsModal();
                await this.fetchParkingLots(); 
            } catch (e) {
                alert(e.message);
            } finally {
                this.detailsLoading = false;
            }
        }
    },
    async mounted() {
        await this.fetchParkingLots();
        const style = document.createElement('style');
        
        // --- INJECT THE NEW CSS ---
        style.innerHTML = `
            .spot-box {
                /* Base styles for all spots */
                width: 35px;      /* Slightly wider rectangle */
                height: 60px;
                margin: 4px;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s ease-in-out;
                
                /* For the emoji */
                font-size: 1.5rem;  /* Smaller emoji */
                text-align: center;
                line-height: 60px;
                overflow: hidden;
            }
            .spot-box:hover {
                transform: scale(1.05);
                box-shadow: 0 0 10px rgba(0,0,0,0.1);
            }

            /* This is the "Available" state (looks like a stall) */
            .spot-available {
                background-color: #f8f9fa; /* Light gray background */
                border: 2px dashed #ced4da; /* Gray parking lines */
                border-top: 3px solid #ced4da; /* Solid line at the top */
                color: transparent;
            }

            /* This is the "Occupied" state (shows the car) */
            .spot-occupied {
                background-color: var(--card-bg); /* Solid white */
                border: 2px solid #dee2e6; /* Solid gray border */
                color: #333; /* Show the car emoji */
                font-size: 1.75rem; /* Make car emoji a bit bigger */
            }
        `;
        // --- END OF CSS ---
        
        document.head.appendChild(style);
    },
};