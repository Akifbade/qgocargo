// Warehouse Map System - Real-time Storage Visualization
class WarehouseMap {
    constructor() {
        this.supabase = null;
        this.rackData = new Map();
        this.shipmentData = new Map();
        this.refreshInterval = null;
        this.lastUpdated = null;
        this.autoRefreshEnabled = true;
        
        this.initializeSystem();
    }

    async initializeSystem() {
        try {
            console.log('🗺️ Initializing Warehouse Map System...');
            
            // Initialize Supabase - try multiple configuration sources
            let supabaseInitialized = false;
            
            // Method 1: Direct window variables
            if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY && window.supabase) {
                this.supabase = window.supabase.createClient(
                    window.SUPABASE_URL,
                    window.SUPABASE_ANON_KEY
                );
                supabaseInitialized = true;
                console.log('✅ Supabase connected via window variables');
            }
            
            // Method 2: Config object
            else if (window.SUPABASE_CONFIG && window.supabase) {
                this.supabase = window.supabase.createClient(
                    window.SUPABASE_CONFIG.url,
                    window.SUPABASE_CONFIG.anon_key
                );
                supabaseInitialized = true;
                console.log('✅ Supabase connected via config object');
            }
            
            // Method 3: Try parent window (if in iframe)
            else if (window.parent && window.parent.SUPABASE_URL && window.parent.supabase) {
                this.supabase = window.parent.supabase.createClient(
                    window.parent.SUPABASE_URL,
                    window.parent.SUPABASE_ANON_KEY
                );
                supabaseInitialized = true;
                console.log('✅ Supabase connected via parent window');
            }

            if (!supabaseInitialized) {
                console.warn('⚠️ Supabase not available, using offline mode');
            } else {
                // Set up real-time subscriptions for live updates
                this.setupRealtimeSubscriptions();
            }

            // Initial load
            await this.loadWarehouseData();
            
            // Set up auto-refresh every 30 seconds
            if (this.autoRefreshEnabled) {
                this.refreshInterval = setInterval(() => {
                    this.loadWarehouseData();
                }, 30000);
                console.log('✅ Auto-refresh enabled (30s interval)');
            }
            
        } catch (error) {
            console.error('❌ Error initializing warehouse map:', error);
            this.showError('Failed to initialize warehouse map: ' + error.message);
        }
    }

    setupRealtimeSubscriptions() {
        if (!this.supabase) return;
        
        try {
            // Subscribe to shipment changes (rack assignments)
            this.supabase
                .channel('warehouse_updates')
                .on('postgres_changes', 
                    { 
                        event: '*', 
                        schema: 'public', 
                        table: 'shipments' 
                    }, 
                    (payload) => {
                        console.log('📦 Shipment update received:', payload);
                        this.handleShipmentUpdate(payload);
                    }
                )
                .subscribe();
                
            console.log('🔔 Real-time subscriptions active');
            
        } catch (error) {
            console.warn('Could not set up real-time subscriptions:', error);
        }
    }

    handleShipmentUpdate(payload) {
        // Handle real-time shipment updates
        if (payload.eventType === 'UPDATE' && payload.new.rack) {
            console.log(`📍 New rack assignment: ${payload.new.barcode} → ${payload.new.rack}`);
            
            // Show notification
            this.showNotification(`🎉 Package ${payload.new.barcode} assigned to ${payload.new.rack}`, 'success');
            
            // Refresh the map to show the new assignment
            setTimeout(() => {
                this.loadWarehouseData();
            }, 1000);
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element if it doesn't exist
        let notificationContainer = document.getElementById('warehouseNotifications');
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.id = 'warehouseNotifications';
            notificationContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1000;
                max-width: 300px;
            `;
            document.body.appendChild(notificationContainer);
        }
        
        // Create notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            animation: slideIn 0.3s ease-out;
            cursor: pointer;
        `;
        notification.innerHTML = `
            <div style="font-weight: 500; margin-bottom: 4px;">Warehouse Update</div>
            <div style="font-size: 14px; opacity: 0.9;">${message}</div>
        `;
        
        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        // Add to container
        notificationContainer.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideIn 0.3s ease-out reverse';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, 5000);
        
        // Remove on click
        notification.addEventListener('click', () => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });
    }

    async loadWarehouseData() {
        try {
            console.log('📊 Loading warehouse data...');
            
            let shipments = [];
            let enhancedRacks = [];

            // Load shipments from Supabase if available
            if (this.supabase) {
                const { data: shipmentsData, error: shipmentsError } = await this.supabase
                    .from('shipments')
                    .select('*')
                    .neq('rack', 'UNASSIGNED')
                    .neq('rack', '')
                    .not('rack', 'is', null);

                if (shipmentsError) {
                    console.warn('Warning loading shipments:', shipmentsError);
                } else {
                    shipments = shipmentsData || [];
                }

                // Load enhanced racks from database
                const { data: racksData, error: racksError } = await this.supabase
                    .from('warehouse_racks')
                    .select('*');

                if (racksError && racksError.code !== '42P01') {
                    console.warn('Warning loading enhanced racks:', racksError);
                } else {
                    enhancedRacks = racksData || [];
                }
            }

            // Also try to load enhanced racks from localStorage (enhanced rack manager)
            try {
                const localRackData = localStorage.getItem('enhanced_rack_data');
                if (localRackData) {
                    const data = JSON.parse(localRackData);
                    if (data.racks) {
                        const localRacks = Array.from(new Map(data.racks).values());
                        // Merge with database racks (prioritize database)
                        const dbRackIds = new Set(enhancedRacks.map(r => r.id));
                        localRacks.forEach(rack => {
                            if (!dbRackIds.has(rack.id)) {
                                enhancedRacks.push({
                                    id: rack.id,
                                    section: rack.section,
                                    capacity: rack.capacity,
                                    current_occupancy: rack.currentOccupancy || 0
                                });
                            }
                        });
                    }
                }
            } catch (e) {
                console.warn('Could not load local rack data:', e);
            }

            // Process shipment and rack data
            this.processEnhancedRackData(shipments, enhancedRacks);
            
            // Generate warehouse map
            this.generateEnhancedWarehouseMap();
            
            console.log('✅ Warehouse data loaded successfully');
            
        } catch (error) {
            console.error('❌ Error loading warehouse data:', error);
            this.showError('Error loading warehouse data: ' + error.message);
        }
    }

    processEnhancedRackData(shipments, enhancedRacks) {
        // Clear existing data
        this.rackData.clear();
        this.shipmentData.clear();

        // Store shipment data
        shipments.forEach(shipment => {
            this.shipmentData.set(shipment.id, shipment);
        });

        // Initialize all enhanced racks
        enhancedRacks.forEach(rack => {
            this.rackData.set(rack.id, {
                rackId: rack.id,
                section: rack.section,
                capacity: rack.capacity || 4,
                currentOccupancy: 0,
                shipments: [],
                lastUpdated: new Date(),
                isEnhancedRack: true
            });
        });

        // Assign shipments to racks
        shipments.forEach(shipment => {
            const rackId = shipment.rack;
            if (!rackId || rackId === 'UNASSIGNED') return;

            // Check if this rack exists in enhanced racks
            if (this.rackData.has(rackId)) {
                const rackInfo = this.rackData.get(rackId);
                rackInfo.shipments.push({
                    id: shipment.id,
                    barcode: shipment.barcode,
                    shipper: shipment.shipper || shipment.sender_name,
                    consignee: shipment.consignee || shipment.receiver_name,
                    pieces: parseInt(shipment.pieces) || 1,
                    notes: shipment.notes,
                    createdAt: shipment.created_at
                });
                
                rackInfo.currentOccupancy += parseInt(shipment.pieces) || 1;
                
                // Update last updated time
                const shipmentDate = new Date(shipment.updated_at || shipment.created_at);
                if (shipmentDate > rackInfo.lastUpdated) {
                    rackInfo.lastUpdated = shipmentDate;
                }
            } else {
                // Create rack entry for shipments in unknown racks
                this.rackData.set(rackId, {
                    rackId: rackId,
                    section: 'UNKNOWN',
                    capacity: 4,
                    currentOccupancy: parseInt(shipment.pieces) || 1,
                    shipments: [{
                        id: shipment.id,
                        barcode: shipment.barcode,
                        shipper: shipment.shipper || shipment.sender_name,
                        consignee: shipment.consignee || shipment.receiver_name,
                        pieces: parseInt(shipment.pieces) || 1,
                        notes: shipment.notes,
                        createdAt: shipment.created_at
                    }],
                    lastUpdated: new Date(shipment.updated_at || shipment.created_at),
                    isEnhancedRack: false
                });
            }
        });

        console.log(`📦 Processed ${shipments.length} shipments across ${this.rackData.size} racks`);
    }

    generateEnhancedWarehouseMap() {
        const mapContent = document.getElementById('mapContent');
        
        if (!mapContent) {
            console.error('❌ mapContent element not found');
            return;
        }
        
        // Group racks by section
        const sections = new Map();
        
        for (const [rackId, rackInfo] of this.rackData) {
            const section = rackInfo.section || 'UNKNOWN';
            if (!sections.has(section)) {
                sections.set(section, []);
            }
            sections.get(section).push(rackInfo);
        }

        // Sort sections
        const sortedSections = Array.from(sections.keys()).sort();
        
        let warehouseHTML = '<div class="warehouse-grid">';
        
        sortedSections.forEach(sectionName => {
            const sectionRacks = sections.get(sectionName);
            warehouseHTML += this.generateEnhancedSectionHTML(sectionName, sectionRacks);
        });
        
        warehouseHTML += '</div>';
        
        mapContent.innerHTML = warehouseHTML;
        
        // Update statistics
        this.updateEnhancedStatistics();
    }

    generateEnhancedSectionHTML(sectionName, racks) {
        let sectionHTML = `
            <div class="zone">
                <div class="zone-header">${sectionName === 'UNKNOWN' ? '🚫 Unknown Racks' : '📁 Section ' + sectionName}</div>
                <div class="racks-grid enhanced-racks-grid">
        `;

        // Sort racks by ID
        racks.sort((a, b) => a.rackId.localeCompare(b.rackId));

        racks.forEach(rack => {
            sectionHTML += this.generateEnhancedRackHTML(rack);
        });

        sectionHTML += `
                </div>
            </div>
        `;

        return sectionHTML;
    }

    generateEnhancedRackHTML(rackInfo) {
        if (rackInfo.shipments.length === 0) {
            // Empty rack
            return `
                <div class="rack empty enhanced-rack" data-rack="${rackInfo.rackId}">
                    <div class="rack-id">${rackInfo.rackId}</div>
                    <div class="rack-count">📭 Empty</div>
                    <div class="rack-capacity">${rackInfo.currentOccupancy}/${rackInfo.capacity}</div>
                </div>
            `;
        }

        // Determine rack status based on capacity
        const utilizationRate = (rackInfo.currentOccupancy / rackInfo.capacity) * 100;
        let rackClass = 'occupied';
        let rackIcon = '📦';
        
        if (utilizationRate >= 100) {
            rackClass = 'full';
            rackIcon = '🚛';
        } else if (utilizationRate >= 75) {
            rackClass = 'occupied';
            rackIcon = '📦';
        }

        // Create shipment info tooltip
        const tooltipInfo = rackInfo.shipments.map(s => 
            `${s.barcode} (${s.pieces}p) - ${s.shipper}`
        ).join('\n');

        return `
            <div class="rack ${rackClass} enhanced-rack" data-rack="${rackInfo.rackId}">
                <div class="rack-id">${rackInfo.rackId}</div>
                <div class="rack-count">${rackIcon} ${rackInfo.shipments.length}</div>
                <div class="rack-capacity">${rackInfo.currentOccupancy}/${rackInfo.capacity}</div>
                <div class="shipment-info">
                    ${rackInfo.shipments.length} shipment${rackInfo.shipments.length > 1 ? 's' : ''}<br>
                    ${rackInfo.currentOccupancy}/${rackInfo.capacity} capacity<br>
                    Updated: ${this.formatTime(rackInfo.lastUpdated)}
                </div>
            </div>
        `;
    }

    updateEnhancedStatistics() {
        const totalRacks = this.rackData.size;
        const occupiedRacks = Array.from(this.rackData.values()).filter(r => r.shipments.length > 0).length;
        const emptyRacks = totalRacks - occupiedRacks;
        const totalShipments = this.shipmentData.size;
        
        // Calculate total capacity and utilization
        let totalCapacity = 0;
        let totalOccupancy = 0;
        
        for (const rack of this.rackData.values()) {
            totalCapacity += rack.capacity;
            totalOccupancy += rack.currentOccupancy;
        }
        
        const utilizationRate = totalCapacity > 0 ? ((totalOccupancy / totalCapacity) * 100).toFixed(1) : 0;

        // Update HTML elements safely
        const elements = {
            'totalRacks': totalRacks,
            'occupiedRacks': occupiedRacks,
            'emptyRacks': emptyRacks,
            'totalCapacity': totalCapacity
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            } else {
                console.warn(`⚠️ Element with ID '${id}' not found`);
            }
        });
        
        // Add utilization rate if element exists
        const utilizationEl = document.getElementById('utilizationRate');
        if (utilizationEl) {
            utilizationEl.textContent = utilizationRate + '%';
        }
    }

    generateWarehouseMap() {
        const mapContent = document.getElementById('mapContent');
        
        // Create zones (A-T)
        const zones = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
        
        let warehouseHTML = '<div class="warehouse-grid">';
        
        zones.forEach(zone => {
            warehouseHTML += this.generateZoneHTML(zone);
        });
        
        warehouseHTML += '</div>';
        
        mapContent.innerHTML = warehouseHTML;
        
        // Update statistics
        this.updateStatistics();
    }

    generateZoneHTML(zone) {
        let zoneHTML = `
            <div class="zone">
                <div class="zone-header">Zone ${zone}</div>
                <div class="racks-grid">
        `;

        // Generate 10x10 grid for each zone (rows 1-10, columns 1-10)
        for (let row = 1; row <= 10; row++) {
            for (let col = 1; col <= 10; col++) {
                const rackId = `${zone}-${String(row).padStart(2, '0')}-${String(col).padStart(2, '0')}`;
                const rackInfo = this.rackData.get(rackId);
                
                zoneHTML += this.generateRackHTML(rackId, rackInfo);
            }
        }

        zoneHTML += `
                </div>
            </div>
        `;

        return zoneHTML;
    }

    generateRackHTML(rackId, rackInfo) {
        if (!rackInfo) {
            // Empty rack
            return `
                <div class="rack empty" data-rack="${rackId}">
                    <div class="rack-id">${rackId}</div>
                    <div class="rack-count">📭</div>
                </div>
            `;
        }

        // Determine rack status
        const totalPieces = rackInfo.totalPieces;
        const shipmentCount = rackInfo.shipments.length;
        let rackClass = 'occupied';
        let rackIcon = '📦';
        
        if (totalPieces > 10) {
            rackClass = 'full';
            rackIcon = '🚛';
        }

        // Create shipment info tooltip
        const tooltipInfo = rackInfo.shipments.map(s => 
            `${s.barcode} (${s.pieces}p) - ${s.shipper}`
        ).join('\n');

        return `
            <div class="rack ${rackClass}" data-rack="${rackId}">
                <div class="rack-id">${rackId}</div>
                <div class="rack-count">${rackIcon} ${shipmentCount}</div>
                <div class="shipment-info">
                    ${shipmentCount} shipment${shipmentCount > 1 ? 's' : ''}<br>
                    ${totalPieces} total pieces<br>
                    Updated: ${this.formatTime(rackInfo.lastUpdated)}
                </div>
            </div>
        `;
    }

    updateStatistics() {
        const totalRacks = 10 * 10 * 10; // 10 zones × 10 rows × 10 columns
        const occupiedRacks = this.rackData.size;
        const emptyRacks = totalRacks - occupiedRacks;
        const totalShipments = this.shipmentData.size;

        document.getElementById('totalRacks').textContent = totalRacks;
        document.getElementById('occupiedRacks').textContent = occupiedRacks;
        document.getElementById('emptyRacks').textContent = emptyRacks;
        document.getElementById('totalShipments').textContent = totalShipments;
    }

    formatTime(date) {
        return new Date(date).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    setupRealtimeSubscriptions() {
        // Subscribe to shipments table changes
        const subscription = this.supabase
            .channel('warehouse-map-updates')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'shipments'
                },
                (payload) => {
                    console.log('📡 Real-time update received:', payload);
                    this.handleRealtimeUpdate(payload);
                }
            )
            .subscribe();

        console.log('📡 Real-time subscriptions set up');
    }

    async handleRealtimeUpdate(payload) {
        try {
            console.log('🔄 Processing real-time update...');
            
            // Add a small delay to ensure database consistency
            setTimeout(async () => {
                await this.loadWarehouseData();
                console.log('✅ Map updated in real-time');
            }, 1000);
            
        } catch (error) {
            console.error('❌ Error handling real-time update:', error);
        }
    }

    startAutoRefresh() {
        // Refresh every 30 seconds
        this.refreshInterval = setInterval(() => {
            console.log('🔄 Auto-refreshing warehouse map...');
            this.loadWarehouseData();
        }, 30000);
        
        console.log('⏰ Auto-refresh started (every 30 seconds)');
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
            console.log('⏹️ Auto-refresh stopped');
        }
    }

    showError(message) {
        const mapContent = document.getElementById('mapContent');
        mapContent.innerHTML = `
            <div class="error">
                <h3>❌ Error Loading Map</h3>
                <p>${message}</p>
                <button class="refresh-btn" onclick="refreshMap()">🔄 Try Again</button>
            </div>
        `;
    }

    // Method to manually refresh the map
    async refresh() {
        console.log('🔄 Manual refresh requested');
        const mapContent = document.getElementById('mapContent');
        mapContent.innerHTML = '<div class="loading"><h3>🔄 Refreshing warehouse map...</h3></div>';
        
        await this.loadWarehouseData();
    }
}

// Global instance
let warehouseMap;

// Global functions
function refreshMap() {
    if (warehouseMap) {
        warehouseMap.refresh();
    }
}

// Open rack manager interface
function openRackManager() {
    window.open('index.html', '_blank');
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    warehouseMap = new WarehouseMap();
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (warehouseMap) {
        warehouseMap.stopAutoRefresh();
    }
});