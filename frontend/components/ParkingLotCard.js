export default {
    name: "ParkingLotCard",
    props: {
        lot: {
            type: Object,
            required: true
        }
    },
    template: `
        <div class="card shadow-sm h-100">
            <div class="card-body d-flex flex-column">
                <h5 class="card-title">{{ lot.name }}</h5>
                <p class="card-text mb-1"><small class="text-muted">{{ lot.address }}</small></p>
                <p class="card-text mb-2"><strong>Price:</strong> ₹{{ lot.price }} / hour</p>
                
                <!-- Spot availability summary -->
                <div class="mb-3">
                    <p class="mb-1"><strong>{{ lot.capacity - lot.occupied }}</strong> available of <strong>{{ lot.capacity }}</strong> spots</p>
                    <div class="progress">
                        <div class="progress-bar bg-danger" role="progressbar" :style="{ width: (lot.occupied / lot.capacity * 100) + '%' }"></div>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="mt-auto">
                    <button class="btn btn-primary btn-sm me-2" @click="$emit('view-spots', lot)">View Spots</button>
                    <button class="btn btn-secondary btn-sm me-2" @click="$emit('edit', lot)">Edit</button>
                    <button class="btn btn-danger btn-sm" @click="$emit('delete', lot.id)">Delete Lot</button>
                </div>
            </div>
        </div>
    `,
}