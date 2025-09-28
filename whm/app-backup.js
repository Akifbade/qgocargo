// Main Application Logic
class WarehouseApp {
    constructor() {
        this.currentSection = 'dashboard';
        this.pricingSettings = null;
    }

    // Initialize the application
    async initialize() {
        try {
            console.log('🚀 Initializing Warehouse Management System...');
            
            // Initialize database
            const settings = {
                per_kg_day_enabled: document.getElementById('enablePerKgDay')?.checked ?? true,
                per_kg_day: parseFloat(document.getElementById('perKgDay')?.value) || 0.5,
                handling_fee_enabled: document.getElementById('enableHandling')?.checked ?? true,
                handling_fee: parseFloat(document.getElementById('handlingFee')?.value) || 10,
                flat_rate_enabled: document.getElementById('enableFlatRate')?.checked ?? false,
                flat_rate: parseFloat(document.getElementById('flatRate')?.value) || 25
            };
            const dbInitialized = await dbManager.initializeDatabase();
            if (!dbInitialized) {
                throw new Error('Database initialization failed');
            }

            // Load pricing settings
            await this.loadPricingSettings();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Load dashboard data
            await this.refreshDashboard();
            
            console.log('✅ Application initialized successfully');
            showMessage('Warehouse Management System ready!', 'success');
            
        } catch (error) {
            console.error('❌ Application initialization failed:', error);
            showMessage('Application initialization failed. Please check your configuration.', 'error');
        }
    }

    // Set up event listeners
    setupEventListeners() {
        // Shipment intake form
        const intakeForm = document.getElementById('intakeForm');
        if (intakeForm) {
            intakeForm.addEventListener('submit', (e) => this.handleShipmentIntake(e));
            intakeForm.addEventListener('reset', () => this.handleFormReset());
        }

        // Search functionality
        const searchQuery = document.getElementById('searchQuery');
        if (searchQuery) {
            searchQuery.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch();
                }
            });
        }

        const releaseSearch = document.getElementById('releaseSearch');
        if (releaseSearch) {
            releaseSearch.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchForRelease();
                }
            });
        }

        // Auto-refresh dashboard every 30 seconds
        setInterval(() => {
            if (this.currentSection === 'dashboard') {
                this.refreshDashboard();
            }
        }, 30000);
    }

    // Handle shipment intake form submission
    async handleShipmentIntake(event) {
        event.preventDefault();
        
        try {
            showLoading(true);
            
            const formData = new FormData(event.target);
            const shipmentData = {
                barcode: '', // Will be auto-generated
                shipper: formData.get('shipper').trim(),
                consignee: formData.get('consignee').trim(),
                weight: formData.get('weight'),
                pieces: formData.get('pieces'),
                rack: formData.get('rack').trim().toUpperCase(),
                notes: formData.get('notes').trim()
            };

            // Validate required fields (barcode not required as it's auto-generated)
            if (!shipmentData.shipper || !shipmentData.consignee || 
                !shipmentData.weight || !shipmentData.pieces || !shipmentData.rack) {
                throw new Error('Please fill in all required fields');
            }

            // Create shipment
            const newShipment = await dbManager.createShipment(shipmentData);
            
            // Update the barcode field with the generated barcode
            document.getElementById('barcode').value = newShipment.barcode;
            
            // Show success message with barcode
            showMessage(`Shipment registered successfully! Barcode: ${newShipment.barcode}`, 'success');
            
            // Store shipment data for label printing and show print button
            window.lastCreatedShipment = newShipment;
            document.getElementById('printLabelsBtn').style.display = 'inline-flex';
            
            // Auto-generate labels for the new shipment
            await this.autoGenerateLabels(newShipment);
            
            // Refresh dashboard if it's the current section
            if (this.currentSection === 'dashboard') {
                this.refreshDashboard();
            }
            
        } catch (error) {
            console.error('Error creating shipment:', error);
            showMessage(error.message || 'Error registering shipment', 'error');
        } finally {
            showLoading(false);
        }
    }

    // Search for shipments (general search)
    async performSearch() {
        try {
            showLoading(true);
            
            const query = document.getElementById('searchQuery').value.trim();
            const filter = document.getElementById('searchFilter').value;
            
            const results = await dbManager.searchShipments(query, filter);
            this.displaySearchResults(results);
            
        } catch (error) {
            console.error('Error performing search:', error);
            showMessage('Error performing search', 'error');
        } finally {
            showLoading(false);
        }
    }

    // Search for shipments to release
    async searchForRelease() {
        try {
            showLoading(true);
            
            const query = document.getElementById('releaseSearch').value.trim();
            
            // Only search for active shipments (status = 'in')
            const results = await dbManager.searchShipments(query, 'in');
            displayReleaseResults(results);
            
        } catch (error) {
            console.error('Error searching for release:', error);
            showMessage('Error searching for shipments', 'error');
        } finally {
            showLoading(false);
        }
    }

    // Display search results
    displaySearchResults(results) {
        const container = document.getElementById('searchResults');
        
        if (!results || results.length === 0) {
            container.innerHTML = '<p class="no-results">No shipments found matching your search.</p>';
            return;
        }

        // Add bulk selection controls
        let selectAllHtml = `
            <div class="bulk-print-controls">
                <div class="select-all-container">
                    <label>
                        <input type="checkbox" id="selectAllShipments" onchange="toggleAllShipments(this.checked)">
                        <strong>Select All</strong>
                    </label>
                    <button onclick="bulkPrintSelectedFromResults()" class="print-labels-btn" style="margin-left: 1rem;">
                        🏷️ Print Selected Labels
                    </button>
                </div>
            </div>
        `;

        const resultsHTML = results.map(shipment => {
            const inDate = new Date(shipment.in_date);
            const statusClass = shipment.status === 'in' ? 'status-in' : 'status-out';
            const storageDays = Math.ceil((new Date() - inDate) / (1000 * 60 * 60 * 24));
            
            return `
                <div class="result-item">
                    <div class="result-header">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" class="shipment-checkbox" value="${shipment.id}" data-barcode="${shipment.barcode}">
                            <span class="result-barcode">${shipment.barcode}</span>
                        </div>
                        <span class="result-status ${statusClass}">${shipment.status}</span>
                    </div>
                    <div class="result-details">
                        <div><strong>Shipper:</strong> ${shipment.shipper}</div>
                        <div><strong>Consignee:</strong> ${shipment.consignee}</div>
                        <div><strong>Weight:</strong> ${shipment.weight} kg</div>
                        <div><strong>Pieces:</strong> ${shipment.pieces}</div>
                        <div><strong>Rack:</strong> ${shipment.rack}</div>
                        <div><strong>Storage Days:</strong> ${storageDays}</div>
                    </div>
                    ${shipment.notes ? `<div class="result-notes"><strong>Notes:</strong> ${shipment.notes}</div>` : ''}
                    <div class="result-dates">
                        <small><strong>In:</strong> ${this.formatDate(inDate)}</small>
                        ${shipment.out_date ? `<small><strong>Out:</strong> ${this.formatDate(new Date(shipment.out_date))}</small>` : ''}
                    </div>
                    <div class="result-actions">
                        <button onclick="reprintShipmentLabels(${shipment.id})" class="print-labels-btn">
                            🏷️ Print Labels
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = selectAllHtml + resultsHTML;
    }

    // Auto-generate labels after shipment creation
    async autoGenerateLabels(shipment) {
        try {
            // Generate labels
            const labels = await labelManager.generateLabels(shipment);
            
            // Show preview with auto-print option
            setTimeout(() => {
                const shouldPrint = confirm(`Shipment registered! Would you like to print ${labels.length} labels now?`);
                if (shouldPrint) {
                    labelManager.showLabelPreview(labels, shipment);
                }
            }, 1000);
            
        } catch (error) {
            console.error('Error auto-generating labels:', error);
            // Don't show error to user as this is a secondary function
        }
    }

    // Handle form reset
    handleFormReset() {
        // Hide the print labels button
        document.getElementById('printLabelsBtn').style.display = 'none';
        // Clear stored shipment data
        window.lastCreatedShipment = null;
        // Clear the barcode field
        document.getElementById('barcode').value = '';
    }

    // Refresh dashboard data
    async refreshDashboard() {
        try {
            // Get dashboard statistics
            const stats = await dbManager.getDashboardStats();
            
            // Update stat cards
            document.getElementById('totalShipments').textContent = stats.totalShipments;
            document.getElementById('occupiedRacks').textContent = stats.occupiedRacks;
            document.getElementById('dailyRevenue').textContent = `KD ${Number(stats.dailyRevenue || 0).toFixed(3)}`;
            document.getElementById('monthlyRevenue').textContent = `KD ${Number(stats.monthlyRevenue || 0).toFixed(3)}`;
            
            // Get longest staying shipments
            const longestStaying = await dbManager.getLongestStayingShipments();
            this.displayLongestStaying(longestStaying);
            
            // Get recent activities
            const recentActivities = await dbManager.getRecentActivities();
            this.displayRecentActivities(recentActivities);
            
        } catch (error) {
            console.error('Error refreshing dashboard:', error);
        }
    }

    // Display longest staying shipments
    displayLongestStaying(shipments) {
        const container = document.getElementById('longestStaying');
        
        if (!shipments || shipments.length === 0) {
            container.innerHTML = '<p>No shipments currently in storage.</p>';
            return;
        }

        const alertsHTML = shipments.map(shipment => {
            const inDate = new Date(shipment.in_date);
            const daysDiff = Math.ceil((new Date() - inDate) / (1000 * 60 * 60 * 24));
            const isLongStay = daysDiff > 30;
            
            return `
                <div class="alert-item ${isLongStay ? 'long-stay' : ''}">
                    <div class="alert-time">${daysDiff} days in storage</div>
                    <div><strong>${shipment.barcode}</strong> - ${shipment.shipper} → ${shipment.consignee}</div>
                    <div>Rack: ${shipment.rack} | Weight: ${shipment.weight} kg</div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = alertsHTML;
    }

    // Display recent activities
    displayRecentActivities(activities) {
        const container = document.getElementById('recentActivities');
        
        if (!activities || activities.length === 0) {
            container.innerHTML = '<p>No recent activities.</p>';
            return;
        }

        const activitiesHTML = activities.map(activity => {
            const createdDate = new Date(activity.created_at);
            const actionText = activity.status === 'in' ? 'Received' : 'Released';
            
            return `
                <div class="activity-item">
                    <div class="activity-time">${this.formatDate(createdDate)}</div>
                    <div><strong>${actionText}:</strong> ${activity.barcode} - ${activity.shipper}</div>
                    <div>Rack: ${activity.rack} | Weight: ${activity.weight} kg</div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = activitiesHTML;
    }

    // Load pricing settings
    async loadPricingSettings() {
        try {
            this.pricingSettings = await dbManager.getPricingSettings();
            this.displayPricingSettings();
        } catch (error) {
            console.error('Error loading pricing settings:', error);
            this.pricingSettings = APP_CONFIG.DEFAULT_PRICING;
        }
    }

    // Display pricing settings in the form
    displayPricingSettings() {
        if (!this.pricingSettings) return;
        
        document.getElementById('enablePerKgDay').checked = this.pricingSettings.per_kg_day_enabled;
        document.getElementById('perKgDay').value = this.pricingSettings.per_kg_day;
        
        document.getElementById('enableHandling').checked = this.pricingSettings.handling_fee_enabled;
        document.getElementById('handlingFee').value = this.pricingSettings.handling_fee;
        
        document.getElementById('freeDays').value = this.pricingSettings.free_days;
        
        document.getElementById('enableFlatRate').checked = this.pricingSettings.enable_flat_rate;
        document.getElementById('flatRate').value = this.pricingSettings.flat_rate;
    }

    // Save pricing settings
    async savePricingSettings() {
        try {
            showLoading(true);
            
            const settings = {
                enable_per_kg_day: document.getElementById('enablePerKgDay').checked,
                per_kg_day: parseFloat(document.getElementById('perKgDay').value) || 0,
                enable_handling: document.getElementById('enableHandling').checked,
                handling_fee: parseFloat(document.getElementById('handlingFee').value) || 0,
                free_days: parseInt(document.getElementById('freeDays').value) || 0,
                enable_flat_rate: document.getElementById('enableFlatRate').checked,
                flat_rate: parseFloat(document.getElementById('flatRate').value) || 0
            };

            await dbManager.updatePricingSettings(settings);
            this.pricingSettings = settings;
            
            showMessage('Pricing settings saved successfully!', 'success');
            
        } catch (error) {
            console.error('Error saving pricing settings:', error);
            showMessage('Error saving pricing settings', 'error');
        } finally {
            showLoading(false);
        }
    }

    // Format date for display
    formatDate(date) {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Global app instance
let warehouseApp;

// Navigation functions
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionId).classList.add('active');
    
    // Add active class to clicked button
    event.target.classList.add('active');
    
    // Update current section
    warehouseApp.currentSection = sectionId;
    
    // Stop any active scanners when switching sections
    barcodeScanner.stopAllScanners();
    
    // Load section-specific data
    switch(sectionId) {
        case 'dashboard':
            warehouseApp.refreshDashboard();
            break;
        case 'pricing':
            warehouseApp.loadPricingSettings();
            break;
    }
}

// Release shipment functions
async function releaseShipment(shipmentId) {
    try {
        showLoading(true);
        
        // Get shipment details
        const shipments = await dbManager.searchShipments('', 'in');
        const shipment = shipments.find(s => s.id === shipmentId);
        
        if (!shipment) {
            throw new Error('Shipment not found');
        }
        
        // Generate invoice
        await invoiceManager.generateInvoice(shipment);
        
        // Release the shipment
        await dbManager.releaseShipment(shipmentId);
        
        // Refresh the release search
        searchForRelease();
        
        // Refresh dashboard if visible
        if (warehouseApp.currentSection === 'dashboard') {
            warehouseApp.refreshDashboard();
        }
        
        showMessage(`Shipment ${shipment.barcode} released successfully!`, 'success');
        
    } catch (error) {
        console.error('Error releasing shipment:', error);
        showMessage('Error releasing shipment', 'error');
    } finally {
        showLoading(false);
    }
}

function displayReleaseResults(results) {
    const container = document.getElementById('releaseResults');
    
    if (!results || results.length === 0) {
        container.innerHTML = '<p class="no-results">No active shipments found matching your search.</p>';
        return;
    }

    const resultsHTML = results.map(shipment => {
        const inDate = new Date(shipment.in_date);
        const storageDays = Math.ceil((new Date() - inDate) / (1000 * 60 * 60 * 24));
        
        // Calculate preview charges
        const charges = dbManager.calculateStorageCharges(shipment, warehouseApp.pricingSettings || APP_CONFIG.DEFAULT_PRICING);
        
        return `
            <div class="result-item">
                <div class="result-header">
                    <span class="result-barcode">${shipment.barcode}</span>
                    <span class="result-status status-in">STORED</span>
                </div>
                <div class="result-details">
                    <div><strong>Shipper:</strong> ${shipment.shipper}</div>
                    <div><strong>Consignee:</strong> ${shipment.consignee}</div>
                    <div><strong>Weight:</strong> ${shipment.weight} kg</div>
                    <div><strong>Pieces:</strong> ${shipment.pieces}</div>
                    <div><strong>Rack:</strong> ${shipment.rack}</div>
                    <div><strong>Storage Days:</strong> ${storageDays}</div>
                    <div><strong>Estimated Charges:</strong> KD ${(Number(charges?.totalCharges || charges?.total_charges || 0)).toFixed(3)}</div>
                    <div><strong>In Date:</strong> ${warehouseApp.formatDate(inDate)}</div>
                </div>
                ${shipment.notes ? `<div class="result-notes"><strong>Notes:</strong> ${shipment.notes}</div>` : ''}
                <div class="result-actions">
                    <button onclick="releaseShipment(${shipment.id})" class="btn-success">
                        📤 Release & Generate Invoice
                    </button>
                    <button onclick="reprintShipmentLabels(${shipment.id})" class="print-labels-btn">
                        🏷️ Print Labels
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = resultsHTML;
}

// Other global functions
function refreshDashboard() {
    warehouseApp.refreshDashboard();
}

function performSearch() {
    warehouseApp.performSearch();
}

function searchForRelease() {
    warehouseApp.searchForRelease();
}

function savePricingSettings() {
    warehouseApp.savePricingSettings();
}

// Utility functions
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = show ? 'flex' : 'none';
}

function showMessage(message, type = 'info') {
    const container = document.getElementById('messageContainer');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.textContent = message;
    
    container.appendChild(messageDiv);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 5000);
    
    // Remove on click
    messageDiv.addEventListener('click', () => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    });
}

// Initialize app when DOM is loaded and Supabase is ready
function initializeApp() {
    warehouseApp = new WarehouseApp();
    warehouseApp.initialize();
}

// Add custom CSS for additional styling
const additionalCSS = `
    .no-results {
        text-align: center;
        padding: 2rem;
        color: #6b7280;
        font-style: italic;
    }
    
    .long-stay {
        border-left-color: #ef4444 !important;
        background: #fef2f2 !important;
    }
    
    .result-notes {
        margin-top: 0.5rem;
        padding: 0.5rem;
        background: #f9fafb;
        border-radius: 4px;
        font-size: 0.9rem;
    }
    
    .result-dates {
        margin-top: 0.5rem;
        padding-top: 0.5rem;
        border-top: 1px solid #e5e7eb;
        display: flex;
        gap: 1rem;
    }
    
    .result-dates small {
        color: #6b7280;
    }
`;

// Add the additional CSS to the page
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalCSS;
document.head.appendChild(styleSheet);

// Label printing functions
async function reprintShipmentLabels(shipmentId) {
    try {
        showLoading(true);
        
        // Get shipment details
        const shipments = await dbManager.searchShipments('', 'all');
        const shipment = shipments.find(s => s.id === shipmentId);
        
        if (!shipment) {
            throw new Error('Shipment not found');
        }
        
        // Generate labels
        const labels = await labelManager.generateLabels(shipment);
        
        // Show preview
        labelManager.showLabelPreview(labels, shipment);
        
    } catch (error) {
        console.error('Error reprinting labels:', error);
        showMessage('Error generating labels', 'error');
    } finally {
        showLoading(false);
    }
}

function toggleAllShipments(checked) {
    const checkboxes = document.querySelectorAll('.shipment-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = checked;
    });
}

async function bulkPrintSelectedFromResults() {
    try {
        const selectedCheckboxes = document.querySelectorAll('.shipment-checkbox:checked');
        
        if (selectedCheckboxes.length === 0) {
            showMessage('Please select shipments to print labels for', 'error');
            return;
        }
        
        showLoading(true);
        
        const shipmentIds = Array.from(selectedCheckboxes).map(cb => parseInt(cb.value));
        
        // Get shipment details
        const allShipments = await dbManager.searchShipments('', 'all');
        const selectedShipments = allShipments.filter(s => shipmentIds.includes(s.id));
        
        if (selectedShipments.length === 0) {
            throw new Error('Selected shipments not found');
        }
        
        // Bulk print
        await labelManager.bulkPrintLabels(selectedShipments);
        
    } catch (error) {
        console.error('Error in bulk print:', error);
        showMessage('Error preparing bulk labels', 'error');
    } finally {
        showLoading(false);
    }
}

async function bulkPrintFromSearch() {
    try {
        const query = document.getElementById('searchQuery').value.trim();
        const filter = document.getElementById('searchFilter').value;
        
        if (!query) {
            showMessage('Please enter a search query first', 'error');
            return;
        }
        
        showLoading(true);
        
        const results = await dbManager.searchShipments(query, filter);
        
        if (!results || results.length === 0) {
            showMessage('No shipments found matching your search', 'error');
            return;
        }
        
        await labelManager.bulkPrintLabels(results);
        
    } catch (error) {
        console.error('Error in bulk print from search:', error);
        showMessage('Error preparing labels for search results', 'error');
    } finally {
        showLoading(false);
    }
}

async function bulkPrintSelected() {
    try {
        const query = document.getElementById('releaseSearch').value.trim();
        
        if (!query) {
            showMessage('Please enter a search query first', 'error');
            return;
        }
        
        showLoading(true);
        
        const results = await dbManager.searchShipments(query, 'in');
        
        if (!results || results.length === 0) {
            showMessage('No active shipments found matching your search', 'error');
            return;
        }
        
        await labelManager.bulkPrintLabels(results);
        
    } catch (error) {
        console.error('Error in bulk print for release:', error);
        showMessage('Error preparing labels', 'error');
    } finally {
        showLoading(false);
    }
}

// Print labels from intake form (after shipment registration)
async function printLabelsFromIntake() {
    try {
        if (!window.lastCreatedShipment) {
            showMessage('No shipment data found. Please register a shipment first.', 'error');
            return;
        }

        showLoading(true);
        
        // Generate labels for the last created shipment
        const labels = await labelManager.generateLabels(window.lastCreatedShipment);
        
        // Show preview
        labelManager.showLabelPreview(labels, window.lastCreatedShipment);
        
    } catch (error) {
        console.error('Error printing labels from intake:', error);
        showMessage('Error generating labels', 'error');
    } finally {
        showLoading(false);
    }
}

// Generate unique barcode for intake form
async function generateUniqueBarcode() {
    try {
        showLoading(true);
        
        // Generate unique barcode
        const barcode = await dbManager.generateUniqueBarcode();
        
        // Fill the barcode field
        document.getElementById('barcode').value = barcode;
        
        showMessage(`Unique barcode generated: ${barcode}`, 'success');
        
        // Focus on next field
        document.getElementById('shipper').focus();
        
    } catch (error) {
        console.error('Error generating barcode:', error);
        showMessage('Error generating unique barcode', 'error');
    } finally {
        showLoading(false);
    }
}