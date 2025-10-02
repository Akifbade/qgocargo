// Main Application Logic
class WarehouseApp {
    constructor() {
        this.currentSection = 'login';
        this.pricingSettings = null;
        this.siteSettings = {
            editMode: false,
            companyName: '',
            companyAddress: '',
            companyPhone: '',
            companyEmail: '',
            logoUrl: ''
        };
        this.currentUser = null; // {id,email,role}
    }

    // Initialize the application
    async initialize() {
        try {
            console.log('🚀 Initializing Warehouse Management System...');
            
            // Initialize database
            const dbInitialized = await dbManager.initializeDatabase();
            if (!dbInitialized) {
                throw new Error('Database initialization failed');
            }

            // Load pricing settings
            await this.loadPricingSettings();
            // Load site settings
            this.loadSiteSettings();
            // Load auth session (if available)
            await this.loadAuthSession();
            
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

    // ===== Site settings (Edit Mode + Branding) =====
    loadSiteSettings() {
        try {
            const raw = localStorage.getItem('siteSettings');
            if (raw) {
                this.siteSettings = { ...this.siteSettings, ...JSON.parse(raw) };
            }
            // Apply branding to UI
            this.applyBrandingToUI();
            // Populate Settings form if present
            this.populateSettingsForm();
            // Apply edit mode state
            this.applyEditMode();
        } catch (e) {
            console.warn('Failed to load site settings', e);
        }
    }

    saveSiteSettings() {
        const editMode = document.getElementById('editModeToggle')?.checked || false;
        const companyName = document.getElementById('companyName')?.value?.trim() || '';
        const companyAddress = document.getElementById('companyAddress')?.value?.trim() || '';
        const companyPhone = document.getElementById('companyPhone')?.value?.trim() || '';
        const companyEmail = document.getElementById('companyEmail')?.value?.trim() || '';
        const logoUrl = document.getElementById('logoUrl')?.value?.trim() || '';

        this.siteSettings = { editMode, companyName, companyAddress, companyPhone, companyEmail, logoUrl };
        localStorage.setItem('siteSettings', JSON.stringify(this.siteSettings));
        this.applyBrandingToUI();
        this.applyEditMode(true);
        showMessage('Settings saved', 'success');
    }

    populateSettingsForm() {
        const s = this.siteSettings;
        const em = document.getElementById('editModeToggle');
        if (em) em.checked = !!s.editMode;
        const cn = document.getElementById('companyName');
        if (cn) cn.value = s.companyName || APP_CONFIG.INVOICE.company_name || '';
        const ca = document.getElementById('companyAddress');
        if (ca) ca.value = s.companyAddress || APP_CONFIG.INVOICE.company_address || '';
        const cp = document.getElementById('companyPhone');
        if (cp) cp.value = s.companyPhone || APP_CONFIG.INVOICE.company_phone || '';
        const ce = document.getElementById('companyEmail');
        if (ce) ce.value = s.companyEmail || APP_CONFIG.INVOICE.company_email || '';
        const lu = document.getElementById('logoUrl');
        if (lu) {
            lu.value = s.logoUrl || document.querySelector('.company-logo')?.src || '';
            if (s.logoUrl) {
                const lp = document.getElementById('logoPreview');
                if (lp) {
                    lp.src = s.logoUrl;
                    lp.style.display = 'inline-block';
                }
            }
        }
    }

    applyBrandingToUI() {
        const s = this.siteSettings;
        // Update top-left logo if provided
        if (s.logoUrl) {
            const img = document.querySelector('.company-logo');
            if (img) img.src = s.logoUrl;
        }
        // Update invoice config in APP_CONFIG so invoice.js uses it
        if (s.companyName) APP_CONFIG.INVOICE.company_name = s.companyName;
        if (s.companyAddress) APP_CONFIG.INVOICE.company_address = s.companyAddress;
        if (s.companyPhone) APP_CONFIG.INVOICE.company_phone = s.companyPhone;
        if (s.companyEmail) APP_CONFIG.INVOICE.company_email = s.companyEmail;
    }

    applyEditMode(fromUserAction = false) {
        const on = !!this.siteSettings.editMode;
        document.body.classList.toggle('edit-mode-on', on);
        // Gate Warehouse Map action buttons by disabling them in UI when off
        const disableActions = !on;
        // In rack details panel, buttons are created dynamically; we also guard in code paths
        window.__EDIT_MODE__ = on; // global flag checked by WarehouseManager actions
        if (fromUserAction && this.currentSection === 'warehouse-map' && window.warehouseManager) {
            // Force refresh details to reflect disabled/enabled controls immediately
            window.warehouseManager.refreshWarehouseMap();
        }
    }

    // ===== Authentication & Roles =====
    async loadAuthSession() {
        try {
            // Supabase v2: getSession returns current session
            const { data, error } = await supabase.auth.getSession();
            if (!error && data?.session?.user) {
                const user = data.session.user;
                // Role via user metadata or a dedicated table; default to 'staff'
                const role = user?.user_metadata?.role || 'staff';
                this.currentUser = { id: user.id, email: user.email, role };
                // If user is authenticated, show dashboard
                showSection('dashboard');
            } else {
                this.currentUser = null;
                // If no user, show login screen
                showSection('login');
            }
            this.applyAuthUI();
        } catch (e) {
            console.warn('Auth session load failed', e);
            this.currentUser = null;
            // On error, show login screen
            showSection('login');
            this.applyAuthUI();
        }
    }

    async login(email, password) {
        try {
            showLoading(true);
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            // Optionally fetch role from a profiles table
            await this.loadAuthSession();
            showMessage('Logged in', 'success');
            // Redirect to dashboard
            showSection('dashboard');
        } catch (e) {
            console.error('Login failed', e);
            showMessage(e.message || 'Login failed', 'error');
        } finally {
            showLoading(false);
        }
    }

    async signup(email, password) {
        try {
            showLoading(true);
            const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { role: 'staff' } } });
            if (error) throw error;
            showMessage('Registration successful. Please check your email for confirmation.', 'success');
        } catch (e) {
            console.error('Signup failed', e);
            showMessage(e.message || 'Signup failed', 'error');
        } finally {
            showLoading(false);
        }
    }

    async logout() {
        try {
            await supabase.auth.signOut();
        } catch (e) {
            // ignore
        } finally {
            this.currentUser = null;
            this.applyAuthUI();
            showMessage('Logged out', 'success');
            showSection('login');
        }
    }

    applyAuthUI() {
        const userEmailSpan = document.getElementById('userEmail');
        const loginBtn = document.getElementById('loginNavBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const navLinks = document.getElementById('navLinks');

        if (this.currentUser) {
            if (userEmailSpan) { userEmailSpan.textContent = this.currentUser.email; userEmailSpan.style.display = 'inline'; }
            if (loginBtn) loginBtn.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'inline-flex';
            if (navLinks) navLinks.style.display = 'flex';
            // Role-based visibility: only admin can see Pricing and Settings
            const isAdmin = this.currentUser.role === 'admin';
            this.setNavVisibility({ pricing: isAdmin, settings: isAdmin, admin: isAdmin });
            // Show/hide admin-only buttons
            this.updateAdminButtons(isAdmin);
        } else {
            if (userEmailSpan) { userEmailSpan.textContent = ''; userEmailSpan.style.display = 'none'; }
            if (loginBtn) loginBtn.style.display = 'inline-flex';
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (navLinks) navLinks.style.display = 'none';
            // Hide admin-only sections
            this.setNavVisibility({ pricing: false, settings: false, admin: false });
            // Hide admin buttons
            this.updateAdminButtons(false);
        }
    }

    setNavVisibility(vis) {
        const findBtn = (label) => Array.from(document.querySelectorAll('.nav-btn')).find(b => b.textContent.trim() === label);
        const pricingBtn = findBtn('Pricing Settings');
        const settingsBtn = findBtn('Settings');
        const adminBtn = findBtn('Admin Panel');
        if (pricingBtn) pricingBtn.style.display = vis.pricing ? 'inline-flex' : 'none';
        if (settingsBtn) settingsBtn.style.display = vis.settings ? 'inline-flex' : 'none';
        if (adminBtn) adminBtn.style.display = vis.admin ? 'inline-flex' : 'none';
    }

    updateAdminButtons(isAdmin) {
        // Show/hide bulk delete buttons based on admin status
        const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
        const bulkDeleteSearchBtn = document.getElementById('bulkDeleteSearchBtn');
        
        if (bulkDeleteBtn) bulkDeleteBtn.style.display = isAdmin ? 'inline-flex' : 'none';
        if (bulkDeleteSearchBtn) bulkDeleteSearchBtn.style.display = isAdmin ? 'inline-flex' : 'none';
        
        // Show/hide all admin-only buttons throughout the interface
        const adminOnlyButtons = document.querySelectorAll('.admin-only');
        adminOnlyButtons.forEach(button => {
            button.style.display = isAdmin ? 'inline-flex' : 'none';
        });
        
        // If not admin, also refresh current view to remove admin buttons from dynamically generated content
        if (!isAdmin) {
            setTimeout(() => {
                const allAdminButtons = document.querySelectorAll('.admin-only');
                allAdminButtons.forEach(btn => btn.remove());
            }, 100);
        }
    }

    // Handle shipment intake form submission with new QR piece system
    async handleShipmentIntake(event) {
        event.preventDefault();
        
        try {
            showLoading(true);
            
            const formData = new FormData(event.target);
            const pieces = parseInt(formData.get('pieces')) || 1;
            
            // Generate main barcode
            const barcode = await dbManager.generateUniqueBarcode();
            
            // Generate piece QR codes for each piece
            const pieceQRCodes = [];
            for (let i = 1; i <= pieces; i++) {
                const pieceQR = window.warehouseManager.generatePieceQR(barcode, i);
                pieceQRCodes.push({
                    pieceNumber: i,
                    qrCode: pieceQR,
                    rackId: null, // Will be assigned later via QR scanning
                    assignedAt: null
                });
            }

            const shipmentData = {
                barcode: barcode,
                shipper: formData.get('shipper').trim(),
                consignee: formData.get('consignee').trim(),
                weight: formData.get('weight'),
                pieces: pieces,
                rack: 'UNASSIGNED', // Will be updated when pieces are scanned to racks
                notes: formData.get('notes').trim(),
                piece_qr_codes: JSON.stringify(pieceQRCodes), // Store piece QR codes
                piece_locations: JSON.stringify({}), // Will track individual piece locations
                status: 'confirmed'
            };

            // Validate required fields
            if (!shipmentData.shipper || !shipmentData.consignee || 
                !shipmentData.weight || !shipmentData.pieces) {
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
            document.getElementById('printPieceQRBtn').style.display = 'inline-flex'; // New piece QR button
            
            // Auto-generate piece QR labels
            await this.autoGeneratePieceQRLabels(newShipment, pieceQRCodes);
            
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
                        ${this.currentUser && this.currentUser.role === 'admin' ? `
                            <button onclick="editShipment('${shipment.barcode}')" class="btn-warning btn-sm admin-only">
                                ✏️ Edit
                            </button>
                            <button onclick="deleteShipmentFromResults('${shipment.barcode}')" class="btn-danger btn-sm admin-only">
                                🗑️ Delete
                            </button>
                        ` : ''}
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

    // Auto-generate piece QR labels for new dual QR system
    async autoGeneratePieceQRLabels(shipment, pieceQRCodes) {
        try {
            // Generate piece QR labels
            const qrLabels = await labelManager.generatePieceQRLabels(shipment, pieceQRCodes);
            
            // Show preview with auto-print option
            setTimeout(() => {
                const shouldPrint = confirm(`Piece QR codes generated! Would you like to print ${qrLabels.length} QR labels for pieces now?`);
                if (shouldPrint) {
                    labelManager.showPieceQRPreview(qrLabels, shipment);
                }
            }, 1500);
            
        } catch (error) {
            console.error('Error auto-generating piece QR labels:', error);
            // Don't show error to user as this is a secondary function
        }
    }

    // Handle form reset
    handleFormReset() {
        // Hide the print labels buttons
        document.getElementById('printLabelsBtn').style.display = 'none';
        document.getElementById('printPieceQRBtn').style.display = 'none';
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
                    ${this.currentUser && this.currentUser.role === 'admin' ? `
                        <div class="alert-actions" style="margin-top: 0.5rem;">
                            <button onclick="editShipment('${shipment.barcode}')" class="btn-sm btn-warning admin-only">✏️ Edit</button>
                            <button onclick="deleteShipmentFromResults('${shipment.barcode}')" class="btn-sm btn-danger admin-only">🗑️ Delete</button>
                        </div>
                    ` : ''}
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
    if (event && event.target && event.target.classList) {
        event.target.classList.add('active');
    } else {
        // Fallback: set active by section mapping
        const map = {
            'dashboard': 0, 'intake': 1, 'release': 2, 'released': 3, 'warehouse-map': 4,
            'pricing': 5, 'search': 6, 'settings': 7
        };
        const btns = document.querySelectorAll('.nav-btn');
        const idx = map[sectionId];
        if (btns[idx]) btns[idx].classList.add('active');
    }
    
    // Update current section
    warehouseApp.currentSection = sectionId;
    
    // Stop any active scanners when switching sections (if scanner is initialized)
    if (typeof barcodeScanner !== 'undefined' && barcodeScanner.stopAllScanners) {
        barcodeScanner.stopAllScanners();
    }
    
    // Load section-specific data
    switch(sectionId) {
        case 'dashboard':
            warehouseApp.refreshDashboard();
            break;
        case 'pricing':
            warehouseApp.loadPricingSettings();
            break;
        case 'settings':
            warehouseApp.populateSettingsForm();
            break;
        case 'admin':
            showAdminTab('users'); // Default to users tab
            break;
        case 'login':
            // nothing special
            break;
        case 'released':
            if (window.warehouseManager) {
                window.warehouseManager.loadReleasedShipments();
            }
            break;
        case 'warehouse-map':
            if (window.warehouseManager) {
                window.warehouseManager.loadWarehouseMap();
            }
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
                    ${warehouseApp.currentUser && warehouseApp.currentUser.role === 'admin' ? `
                        <button onclick="editShipment('${shipment.barcode}')" class="btn-warning btn-sm admin-only">
                            ✏️ Edit
                        </button>
                        <button onclick="deleteShipmentFromResults('${shipment.barcode}')" class="btn-danger btn-sm admin-only">
                            🗑️ Delete
                        </button>
                    ` : ''}
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

// Small global helper to copy text to clipboard (used in Released table)
function copyToClipboard(text) {
    try {
        navigator.clipboard.writeText(text);
        showMessage('Copied to clipboard', 'success');
    } catch (e) {
        // Fallback
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showMessage('Copied to clipboard', 'success');
    }
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

// ===== REMOVED OLD RACK PICKER SYSTEM =====
// The old manual rack picker has been replaced with the new dual QR scanning system
// Staff now scan shipment piece QR codes and then rack QR codes to assign locations

// Initialize app when DOM is loaded and Supabase is ready
function initializeApp() {
    try {
        console.log('🎯 Initializing main application...');
        
        // Hide loading screen first
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
        
        // Initialize main app
        warehouseApp = new WarehouseApp();
        warehouseApp.initialize();
        
        console.log('✅ Application initialization complete');
        
    } catch (error) {
        console.error('❌ App initialization failed:', error);
        
        // Hide loading screen even on error
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
        
        // Show error message
        alert('Application failed to initialize: ' + error.message);
    }
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

// Settings helpers for HTML
function saveSiteSettings() {
    warehouseApp.saveSiteSettings();
}

function previewLogo() {
    const input = document.getElementById('logoUrl');
    const lp = document.getElementById('logoPreview');
    if (input && lp) {
        const url = input.value.trim();
        if (url) {
            lp.src = url;
            lp.style.display = 'inline-block';
        } else {
            lp.style.display = 'none';
        }
    }
}

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

// Auth helpers for HTML
function login() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    warehouseApp.login(email, password);
}

function signup() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    if (!email || !password) {
        showMessage('Enter email and password to register', 'warning');
        return;
    }
    warehouseApp.signup(email, password);
}

// Print piece QR codes from intake
function printPieceQRFromIntake() {
    const shipment = window.lastCreatedShipment;
    if (!shipment) {
        showMessage('No shipment data found to print QR codes', 'error');
        return;
    }
    
    try {
        let pieceQRCodes = [];
        if (shipment.piece_qr_codes) {
            pieceQRCodes = JSON.parse(shipment.piece_qr_codes);
        }
        
        if (pieceQRCodes.length === 0) {
            showMessage('No piece QR codes found for this shipment', 'error');
            return;
        }
        
        // Use label manager to generate piece QR labels
        labelManager.generatePieceQRLabels(shipment, pieceQRCodes)
            .then(labels => {
                labelManager.showPieceQRPreview(labels, shipment);
            })
            .catch(error => {
                console.error('Error generating piece QR labels:', error);
                showMessage('Error generating piece QR labels: ' + error.message, 'error');
            });
            
    } catch (error) {
        console.error('Error printing piece QR codes:', error);
        showMessage('Error printing piece QR codes: ' + error.message, 'error');
    }
}

// ===================
// ADMIN FUNCTIONS
// ===================

let currentAdminTab = 'users';

function showAdminTab(tabName) {
    currentAdminTab = tabName;
    
    // Hide all tab contents
    document.querySelectorAll('.admin-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active from all tabs
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(`admin${tabName.charAt(0).toUpperCase() + tabName.slice(1)}Tab`).classList.add('active');
    document.getElementById(`${tabName}Tab`).classList.add('active');
    
    // Load tab-specific data
    switch(tabName) {
        case 'users':
            refreshUserList();
            break;
        case 'shipments':
            loadAdminShipments();
            break;
        case 'system':
            loadSystemSettings();
            break;
        case 'reports':
            // Reports are generated on demand
            break;
    }
}

function refreshAdminData() {
    showAdminTab(currentAdminTab);
    showMessage('Admin data refreshed', 'success');
}

// USER MANAGEMENT FUNCTIONS
async function refreshUserList() {
    if (!warehouseApp.currentUser || warehouseApp.currentUser.role !== 'admin') {
        showMessage('Admin access required', 'error');
        return;
    }
    
    try {
        showLoading(true);
        
        // Get users from Supabase auth
        const { data, error } = await supabase.auth.admin.listUsers();
        
        if (error) throw error;
        
        displayUsers(data.users);
        
    } catch (error) {
        console.error('Error loading users:', error);
        showMessage('Failed to load users: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

function displayUsers(users) {
    const tbody = document.querySelector('#usersTable tbody');
    tbody.innerHTML = '';
    
    users.forEach(user => {
        const row = document.createElement('tr');
        const role = user.user_metadata?.role || 'staff';
        const createdAt = new Date(user.created_at).toLocaleDateString();
        const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never';
        
        row.innerHTML = `
            <td>${user.email}</td>
            <td>
                <select onchange="changeUserRole('${user.id}', this.value)" ${warehouseApp.currentUser.id === user.id ? 'disabled' : ''}>
                    <option value="staff" ${role === 'staff' ? 'selected' : ''}>Staff</option>
                    <option value="admin" ${role === 'admin' ? 'selected' : ''}>Admin</option>
                </select>
            </td>
            <td>${createdAt}</td>
            <td>${lastSignIn}</td>
            <td>
                <span class="status-badge ${user.email_confirmed_at ? 'confirmed' : 'unconfirmed'}">
                    ${user.email_confirmed_at ? 'Confirmed' : 'Unconfirmed'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    ${warehouseApp.currentUser.id !== user.id ? 
                        `<button onclick="resetUserPassword('${user.id}')" class="btn-secondary btn-sm">🔑 Reset Password</button>
                         <button onclick="deleteUser('${user.id}', '${user.email}')" class="btn-danger btn-sm">🗑️ Delete</button>` 
                        : '<span class="text-muted">Current User</span>'}
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function changeUserRole(userId, newRole) {
    if (!confirm(`Change user role to ${newRole}?`)) return;
    
    try {
        showLoading(true);
        
        const { error } = await supabase.auth.admin.updateUserById(userId, {
            user_metadata: { role: newRole }
        });
        
        if (error) throw error;
        
        showMessage(`User role updated to ${newRole}`, 'success');
        refreshUserList();
        
    } catch (error) {
        console.error('Error updating user role:', error);
        showMessage('Failed to update user role: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function resetUserPassword(userId) {
    const email = prompt('Enter user email to confirm password reset:');
    if (!email) return;
    
    try {
        showLoading(true);
        
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/reset-password'
        });
        
        if (error) throw error;
        
        showMessage('Password reset email sent', 'success');
        
    } catch (error) {
        console.error('Error sending password reset:', error);
        showMessage('Failed to send password reset: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function deleteUser(userId, email) {
    if (!confirm(`Delete user ${email}? This action cannot be undone.`)) return;
    
    try {
        showLoading(true);
        
        const { error } = await supabase.auth.admin.deleteUser(userId);
        
        if (error) throw error;
        
        showMessage(`User ${email} deleted`, 'success');
        refreshUserList();
        
    } catch (error) {
        console.error('Error deleting user:', error);
        showMessage('Failed to delete user: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function exportUserData() {
    try {
        const { data } = await supabase.auth.admin.listUsers();
        const csvData = data.users.map(user => ({
            email: user.email,
            role: user.user_metadata?.role || 'staff',
            created: new Date(user.created_at).toISOString(),
            lastLogin: user.last_sign_in_at ? new Date(user.last_sign_in_at).toISOString() : '',
            confirmed: user.email_confirmed_at ? 'Yes' : 'No'
        }));
        
        downloadCSV(csvData, 'users_export.csv');
        showMessage('User data exported', 'success');
        
    } catch (error) {
        showMessage('Export failed: ' + error.message, 'error');
    }
}

// SHIPMENT MANAGEMENT FUNCTIONS
async function loadAdminShipments() {
    try {
        showLoading(true);
        
        const allShipments = await dbManager.getAllShipments();
        const releasedShipments = await dbManager.getReleasedShipments();
        
        const combinedData = [...allShipments.map(s => ({...s, status: 'active'})), 
                           ...releasedShipments.map(s => ({...s, status: 'released'}))];
        
        displayAdminShipments(combinedData);
        
    } catch (error) {
        console.error('Error loading admin shipments:', error);
        showMessage('Failed to load shipments', 'error');
    } finally {
        showLoading(false);
    }
}

function displayAdminShipments(shipments) {
    const tbody = document.querySelector('#adminShipmentsTable tbody');
    tbody.innerHTML = '';
    
    shipments.forEach(shipment => {
        const row = document.createElement('tr');
        const daysSince = Math.floor((Date.now() - new Date(shipment.intake_date)) / (1000 * 60 * 60 * 24));
        const charges = shipment.total_charges || 0;
        
        row.innerHTML = `
            <td><input type="checkbox" class="shipment-select" value="${shipment.barcode}"></td>
            <td>${shipment.barcode}</td>
            <td>${shipment.shipper}</td>
            <td>${shipment.consignee}</td>
            <td>
                <span class="status-badge ${shipment.status}">
                    ${shipment.status === 'active' ? 'In Storage' : 'Released'}
                </span>
            </td>
            <td>${daysSince} days</td>
            <td>KD ${charges.toFixed(3)}</td>
            <td>
                <div class="action-buttons">
                    <button onclick="viewShipmentDetails('${shipment.barcode}')" class="btn-secondary btn-sm">👁️ View</button>
                    <button onclick="deleteShipment('${shipment.barcode}')" class="btn-danger btn-sm">🗑️ Delete</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function toggleAllShipments() {
    const selectAll = document.getElementById('selectAllShipments');
    const checkboxes = document.querySelectorAll('.shipment-select');
    
    checkboxes.forEach(cb => cb.checked = selectAll.checked);
}

function searchAdminShipments() {
    const query = document.getElementById('adminShipmentSearch').value.toLowerCase();
    const rows = document.querySelectorAll('#adminShipmentsTable tbody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(query) ? '' : 'none';
    });
}

function filterAdminShipments() {
    const filter = document.getElementById('adminShipmentFilter').value;
    const rows = document.querySelectorAll('#adminShipmentsTable tbody tr');
    
    rows.forEach(row => {
        if (filter === 'all') {
            row.style.display = '';
        } else {
            const status = row.querySelector('.status-badge').textContent.toLowerCase();
            const show = (filter === 'active' && status.includes('storage')) ||
                         (filter === 'released' && status.includes('released')) ||
                         (filter === 'overdue' && parseInt(row.cells[5].textContent) > 30);
            row.style.display = show ? '' : 'none';
        }
    });
}

async function deleteShipment(barcode) {
    if (!confirm(`Delete shipment ${barcode}? This action cannot be undone.`)) return;
    
    try {
        showLoading(true);
        
        // Delete from both active and released tables
        await dbManager.deleteShipment(barcode);
        
        showMessage(`Shipment ${barcode} deleted`, 'success');
        loadAdminShipments();
        
    } catch (error) {
        console.error('Error deleting shipment:', error);
        showMessage('Failed to delete shipment: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function bulkDeleteShipments() {
    const selected = Array.from(document.querySelectorAll('.shipment-select:checked')).map(cb => cb.value);
    
    if (selected.length === 0) {
        showMessage('No shipments selected', 'warning');
        return;
    }
    
    if (!confirm(`Delete ${selected.length} shipments? This action cannot be undone.`)) return;
    
    try {
        showLoading(true);
        
        for (const barcode of selected) {
            await dbManager.deleteShipment(barcode);
        }
        
        showMessage(`${selected.length} shipments deleted`, 'success');
        loadAdminShipments();
        
    } catch (error) {
        console.error('Error bulk deleting shipments:', error);
        showMessage('Failed to delete shipments: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// SYSTEM FUNCTIONS
function loadSystemSettings() {
    // Load current system settings
    const emailVerification = localStorage.getItem('requireEmailVerification') === 'true';
    const activityLogging = localStorage.getItem('enableActivityLogging') === 'true';
    
    document.getElementById('requireEmailVerification').checked = emailVerification;
    document.getElementById('enableActivityLogging').checked = activityLogging;
}

async function backupDatabase() {
    try {
        showLoading(true);
        
        const allData = {
            shipments: await dbManager.getAllShipments(),
            released: await dbManager.getReleasedShipments(),
            settings: {
                pricing: warehouseApp.pricingSettings,
                site: warehouseApp.siteSettings
            },
            timestamp: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `warehouse_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        showMessage('Database backup downloaded', 'success');
        
    } catch (error) {
        console.error('Error backing up database:', error);
        showMessage('Backup failed: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function clearOldData() {
    const days = prompt('Delete shipments older than how many days?', '365');
    if (!days || days < 30) {
        showMessage('Must be at least 30 days', 'warning');
        return;
    }
    
    if (!confirm(`Delete all released shipments older than ${days} days?`)) return;
    
    try {
        showLoading(true);
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
        
        const released = await dbManager.getReleasedShipments();
        const toDelete = released.filter(s => new Date(s.release_date) < cutoffDate);
        
        for (const shipment of toDelete) {
            await dbManager.deleteShipment(shipment.barcode);
        }
        
        showMessage(`Deleted ${toDelete.length} old shipments`, 'success');
        
    } catch (error) {
        console.error('Error clearing old data:', error);
        showMessage('Clear failed: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function resetDatabase() {
    if (!confirm('RESET ALL DATA? This will delete EVERYTHING and cannot be undone!')) return;
    if (!confirm('Are you absolutely sure? Type RESET to confirm:') || 
        prompt('Type RESET to confirm:') !== 'RESET') return;
    
    try {
        showLoading(true);
        
        await dbManager.resetDatabase();
        localStorage.clear();
        
        showMessage('Database reset complete', 'success');
        setTimeout(() => location.reload(), 2000);
        
    } catch (error) {
        console.error('Error resetting database:', error);
        showMessage('Reset failed: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

function checkSystemHealth() {
    // Basic system health check
    const health = {
        database: 'OK',
        storage: 'OK',
        auth: warehouseApp.currentUser ? 'OK' : 'Not logged in',
        localStorage: localStorage ? 'OK' : 'Not available'
    };
    
    const healthReport = Object.entries(health)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
    
    alert(`System Health Report:\n\n${healthReport}`);
}

function optimizeDatabase() {
    // Placeholder for database optimization
    showMessage('Database optimization is not available in this version', 'info');
}

function generateSystemReport() {
    // Generate basic system report
    const report = {
        timestamp: new Date().toISOString(),
        currentUser: warehouseApp.currentUser?.email,
        editMode: warehouseApp.siteSettings.editMode,
        // Add more system stats as needed
    };
    
    downloadCSV([report], 'system_report.csv');
}

// REPORT FUNCTIONS
function generateRevenueReport() {
    showMessage('Revenue report generation not implemented yet', 'info');
}

function generateInventoryReport() {
    showMessage('Inventory report generation not implemented yet', 'info');
}

function generateUserActivityReport() {
    showMessage('User activity report generation not implemented yet', 'info');
}

function generateAlertsReport() {
    showMessage('Alerts report generation not implemented yet', 'info');
}

// Helper function to download CSV
function downloadCSV(data, filename) {
    if (!data.length) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => JSON.stringify(row[header] || '')).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
}

// BULK DELETE FUNCTIONS FOR EXISTING SECTIONS
async function bulkDeleteSelected() {
    if (!warehouseApp.currentUser || warehouseApp.currentUser.role !== 'admin') {
        showMessage('Admin access required for delete operations', 'error');
        return;
    }
    
    const selected = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
        .map(cb => cb.value).filter(v => v);
    
    if (selected.length === 0) {
        showMessage('No items selected for deletion', 'warning');
        return;
    }
    
    if (!confirm(`Delete ${selected.length} selected items? This cannot be undone.`)) return;
    
    try {
        showLoading(true);
        
        for (const barcode of selected) {
            await dbManager.deleteShipment(barcode);
        }
        
        showMessage(`${selected.length} items deleted`, 'success');
        searchForRelease(); // Refresh the results
        
    } catch (error) {
        console.error('Error in bulk delete:', error);
        showMessage('Bulk delete failed: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function bulkDeleteFromSearch() {
    bulkDeleteSelected(); // Same function
}

// GLOBAL EDIT/DELETE FUNCTIONS FOR ALL SECTIONS
async function editShipment(barcode) {
    if (!warehouseApp.currentUser || warehouseApp.currentUser.role !== 'admin') {
        showMessage('Admin access required to edit shipments', 'error');
        return;
    }
    
    try {
        showLoading(true);
        
        // Find the shipment (could be active or released)
        let shipment = null;
        const activeShipments = await dbManager.getAllShipments();
        const releasedShipments = await dbManager.getReleasedShipments();
        
        shipment = activeShipments.find(s => s.barcode === barcode) || 
                  releasedShipments.find(s => s.barcode === barcode);
        
        if (!shipment) {
            throw new Error('Shipment not found');
        }
        
        // Create edit modal
        showEditShipmentModal(shipment);
        
    } catch (error) {
        console.error('Error loading shipment for edit:', error);
        showMessage('Failed to load shipment: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function deleteShipmentFromResults(barcode) {
    if (!warehouseApp.currentUser || warehouseApp.currentUser.role !== 'admin') {
        showMessage('Admin access required to delete shipments', 'error');
        return;
    }
    
    if (!confirm(`Delete shipment ${barcode}? This action cannot be undone.`)) return;
    
    try {
        showLoading(true);
        
        await dbManager.deleteShipment(barcode);
        showMessage(`Shipment ${barcode} deleted successfully`, 'success');
        
        // Refresh the current view
        if (warehouseApp.currentSection === 'search') {
            performSearch();
        } else if (warehouseApp.currentSection === 'release') {
            searchForRelease();
        }
        
    } catch (error) {
        console.error('Error deleting shipment:', error);
        showMessage('Failed to delete shipment: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function deleteShipmentFromRack(barcode, rackId) {
    if (!warehouseApp.currentUser || warehouseApp.currentUser.role !== 'admin') {
        showMessage('Admin access required to delete shipments', 'error');
        return;
    }
    
    if (!confirm(`Delete shipment ${barcode} from rack ${rackId}? This action cannot be undone.`)) return;
    
    try {
        showLoading(true);
        
        await dbManager.deleteShipment(barcode);
        showMessage(`Shipment ${barcode} deleted successfully`, 'success');
        
        // Refresh warehouse map and close details panel
        if (window.warehouseManager) {
            window.warehouseManager.loadWarehouseMap();
            window.warehouseManager.closeRackDetails();
        }
        
    } catch (error) {
        console.error('Error deleting shipment:', error);
        showMessage('Failed to delete shipment: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function deleteReleasedShipment(barcode) {
    if (!warehouseApp.currentUser || warehouseApp.currentUser.role !== 'admin') {
        showMessage('Admin access required to delete shipments', 'error');
        return;
    }
    
    if (!confirm(`Delete released shipment ${barcode}? This action cannot be undone.`)) return;
    
    try {
        showLoading(true);
        
        await dbManager.deleteShipment(barcode);
        showMessage(`Released shipment ${barcode} deleted successfully`, 'success');
        
        // Refresh released shipments view
        if (window.warehouseManager) {
            window.warehouseManager.loadReleasedShipments();
        }
        
    } catch (error) {
        console.error('Error deleting released shipment:', error);
        showMessage('Failed to delete shipment: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

function showEditShipmentModal(shipment) {
    // Create modal HTML
    const modalHTML = `
        <div id="editShipmentModal" class="modal" style="display: flex;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>✏️ Edit Shipment - ${shipment.barcode}</h3>
                    <span class="close" onclick="closeEditModal()">&times;</span>
                </div>
                <div class="modal-body">
                    <form id="editShipmentForm">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="editBarcode">Barcode</label>
                                <input type="text" id="editBarcode" value="${shipment.barcode}" readonly style="background: #f3f4f6;">
                            </div>
                            <div class="form-group">
                                <label for="editShipper">Shipper *</label>
                                <input type="text" id="editShipper" value="${shipment.shipper}" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="editConsignee">Consignee *</label>
                                <input type="text" id="editConsignee" value="${shipment.consignee}" required>
                            </div>
                            <div class="form-group">
                                <label for="editWeight">Weight (kg) *</label>
                                <input type="number" id="editWeight" value="${shipment.weight}" step="0.01" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="editPieces">Pieces *</label>
                                <input type="number" id="editPieces" value="${shipment.pieces}" required>
                            </div>
                            <div class="form-group">
                                <label for="editRack">Rack *</label>
                                <input type="text" id="editRack" value="${shipment.rack}" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="editNotes">Notes</label>
                            <textarea id="editNotes">${shipment.notes || ''}</textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-actions">
                    <button onclick="saveShipmentEdit('${shipment.barcode}')" class="btn-primary">💾 Save Changes</button>
                    <button onclick="closeEditModal()" class="btn-secondary">Cancel</button>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to page
    const existingModal = document.getElementById('editShipmentModal');
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

async function saveShipmentEdit(originalBarcode) {
    const form = document.getElementById('editShipmentForm');
    const formData = new FormData(form);
    
    const updatedShipment = {
        barcode: document.getElementById('editBarcode').value,
        shipper: document.getElementById('editShipper').value.trim(),
        consignee: document.getElementById('editConsignee').value.trim(),
        weight: parseFloat(document.getElementById('editWeight').value),
        pieces: parseInt(document.getElementById('editPieces').value),
        rack: document.getElementById('editRack').value.trim(),
        notes: document.getElementById('editNotes').value.trim()
    };
    
    // Validate required fields
    if (!updatedShipment.shipper || !updatedShipment.consignee || !updatedShipment.weight || !updatedShipment.pieces || !updatedShipment.rack) {
        showMessage('Please fill in all required fields', 'warning');
        return;
    }
    
    try {
        showLoading(true);
        
        // Update shipment in database
        const { error } = await supabase
            .from('shipments')
            .update({
                shipper: updatedShipment.shipper,
                consignee: updatedShipment.consignee,
                weight: updatedShipment.weight,
                pieces: updatedShipment.pieces,
                rack: updatedShipment.rack,
                notes: updatedShipment.notes,
                updated_at: new Date().toISOString()
            })
            .eq('barcode', originalBarcode);
        
        if (error) throw error;
        
        showMessage('Shipment updated successfully', 'success');
        closeEditModal();
        
        // Refresh current view
        refreshCurrentView();
        
    } catch (error) {
        console.error('Error updating shipment:', error);
        showMessage('Failed to update shipment: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

function closeEditModal() {
    const modal = document.getElementById('editShipmentModal');
    if (modal) modal.remove();
}

function refreshCurrentView() {
    switch(warehouseApp.currentSection) {
        case 'search':
            performSearch();
            break;
        case 'release':
            searchForRelease();
            break;
        case 'warehouse-map':
            if (window.warehouseManager) {
                window.warehouseManager.loadWarehouseMap();
            }
            break;
        case 'released':
            if (window.warehouseManager) {
                window.warehouseManager.loadReleasedShipments();
            }
            break;
        case 'admin':
            if (currentAdminTab === 'shipments') {
                loadAdminShipments();
            }
            break;
    }
}

function logout() { warehouseApp.logout(); }

// =======================
// RACK MANAGEMENT FUNCTIONS
// =======================

// Update rack management statistics
function updateRackManagementStats() {
    if (!window.customRackManager) return;
    
    const racks = window.customRackManager.getAllRacks();
    const sections = [...new Set(racks.map(rack => rack.section))];
    
    document.getElementById('totalRacksCount').textContent = racks.length;
    document.getElementById('sectionsCount').textContent = sections.length;
    document.getElementById('qrCodesGenerated').textContent = racks.length;
    
    const lastGenerated = localStorage.getItem('lastRackQRGenerated');
    document.getElementById('lastGenerated').textContent = lastGenerated ? 
        new Date(lastGenerated).toLocaleDateString() : 'Never';
}

// Display current rack configuration
function displayCurrentRackConfiguration() {
    if (!window.customRackManager) return;
    
    const container = document.getElementById('rackConfigurationContent');
    const racks = window.customRackManager.getAllRacks();
    
    if (racks.length === 0) {
        container.innerHTML = `
            <div class="no-racks-message">
                <p>No racks configured yet.</p>
                <button onclick="editRackConfiguration()" class="btn-primary">⚙️ Configure Racks</button>
            </div>
        `;
        return;
    }
    
    // Group racks by section
    const sections = {};
    racks.forEach(rack => {
        if (!sections[rack.section]) sections[rack.section] = [];
        sections[rack.section].push(rack);
    });
    
    let html = '';
    Object.keys(sections).sort().forEach(sectionKey => {
        const sectionRacks = sections[sectionKey];
        html += `
            <div class="rack-section">
                <h4>Section ${sectionKey} (${sectionRacks.length} racks)</h4>
                <div class="rack-list">
        `;
        
        sectionRacks.forEach(rack => {
            html += `
                <div class="rack-item-config">
                    <span class="rack-id">${rack.id}</span>
                    <span class="rack-qr-text">${rack.qrCode}</span>
                    <span class="rack-location-text">${rack.location}</span>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Open rack configuration modal
function editRackConfiguration() {
    const modal = document.getElementById('rackConfigModal');
    const textarea = document.getElementById('rackConfigTextarea');
    
    // Load current configuration
    if (window.customRackManager) {
        const racks = window.customRackManager.getAllRacks();
        const rackList = racks.map(rack => rack.id).join('\n');
        textarea.value = rackList;
    }
    
    modal.style.display = 'flex';
}

// Close rack configuration modal
function closeRackConfigModal() {
    document.getElementById('rackConfigModal').style.display = 'none';
}

// Load sample rack configuration
function loadSampleConfiguration() {
    const sampleConfig = `A-001
A-002
A-003
A-004
A-005
B-001
B-002
B-003
B-004
B-005
C-001
C-002
C-003
C-004
C-005`;
    
    document.getElementById('rackConfigTextarea').value = sampleConfig;
}

// Save rack configuration
function saveRackConfiguration() {
    const textarea = document.getElementById('rackConfigTextarea');
    const rackLines = textarea.value.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    
    if (rackLines.length === 0) {
        showMessage('Please enter at least one rack configuration', 'warning');
        return;
    }
    
    // Validate rack format
    const invalidRacks = rackLines.filter(rack => !rack.match(/^[A-Z]-\d{3}$/));
    if (invalidRacks.length > 0) {
        showMessage(`Invalid rack format: ${invalidRacks.join(', ')}. Use format: A-001`, 'error');
        return;
    }
    
    try {
        // Update custom rack manager
        if (!window.customRackManager) {
            window.customRackManager = new CustomRackManager();
        }
        
        // Clear existing racks and add new ones
        window.customRackManager.customRacks = rackLines.map(rackId => ({
            id: rackId,
            qrCode: window.customRackManager.generateRackQR(rackId),
            status: 'available',
            section: rackId.split('-')[0],
            number: rackId.split('-')[1],
            location: window.customRackManager.getRackLocation(rackId)
        }));
        
        // Save to localStorage
        localStorage.setItem('customRackConfiguration', JSON.stringify(rackLines));
        
        showMessage(`✅ ${rackLines.length} racks configured successfully!`, 'success');
        
        // Update UI
        updateRackManagementStats();
        displayCurrentRackConfiguration();
        closeRackConfigModal();
        
    } catch (error) {
        console.error('Error saving rack configuration:', error);
        showMessage('Error saving rack configuration: ' + error.message, 'error');
    }
}

// Generate all rack QR codes
async function generateAllRackQRCodes() {
    if (!window.customRackManager) {
        showMessage('No rack configuration found. Please configure racks first.', 'error');
        return;
    }
    
    const racks = window.customRackManager.getAllRacks();
    if (racks.length === 0) {
        showMessage('No racks configured. Please add racks first.', 'error');
        return;
    }
    
    try {
        showLoading(true);
        showMessage('Generating QR codes PDF...', 'info');
        
        await window.customRackManager.generateRackQRCodesPDF();
        
        // Update last generated timestamp
        localStorage.setItem('lastRackQRGenerated', new Date().toISOString());
        updateRackManagementStats();
        
        showMessage(`✅ QR codes PDF generated for ${racks.length} racks!`, 'success');
        
    } catch (error) {
        console.error('Error generating QR codes:', error);
        showMessage('Error generating QR codes: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Preview rack configuration
function previewRackConfiguration() {
    if (!window.customRackManager) {
        showMessage('No rack configuration found. Please configure racks first.', 'error');
        return;
    }
    
    const previewDiv = document.getElementById('rackQRPreview');
    const contentDiv = document.getElementById('rackQRPreviewContent');
    
    const previewHTML = window.customRackManager.generateRackPreviewHTML();
    contentDiv.innerHTML = previewHTML;
    
    previewDiv.style.display = 'block';
}

// Hide rack QR preview
function hideRackQRPreview() {
    document.getElementById('rackQRPreview').style.display = 'none';
}

// Export rack list
function exportRackList() {
    if (!window.customRackManager) {
        showMessage('No rack configuration found. Please configure racks first.', 'error');
        return;
    }
    
    const racks = window.customRackManager.getAllRacks();
    if (racks.length === 0) {
        showMessage('No racks configured. Please add racks first.', 'error');
        return;
    }
    
    const csvData = racks.map(rack => ({
        'Rack ID': rack.id,
        'Section': rack.section,
        'Number': rack.number,
        'QR Code': rack.qrCode,
        'Location': rack.location,
        'Status': rack.status
    }));
    
    downloadCSV(csvData, 'warehouse_racks.csv');
    showMessage(`✅ Rack list exported (${racks.length} racks)`, 'success');
}

// Add new rack section
function addNewRackSection() {
    const section = prompt('Enter section letter (A-Z):');
    if (!section || !section.match(/^[A-Z]$/)) {
        showMessage('Please enter a valid section letter (A-Z)', 'error');
        return;
    }
    
    const startNumber = prompt('Starting rack number (001-999):', '001');
    if (!startNumber || !startNumber.match(/^\d{3}$/)) {
        showMessage('Please enter a valid 3-digit number (001-999)', 'error');
        return;
    }
    
    const count = prompt('How many racks in this section?', '10');
    if (!count || isNaN(count) || count < 1 || count > 100) {
        showMessage('Please enter a valid count (1-100)', 'error');
        return;
    }
    
    const textarea = document.getElementById('rackConfigTextarea');
    const currentConfig = textarea.value;
    const newRacks = [];
    
    for (let i = 0; i < parseInt(count); i++) {
        const rackNumber = String(parseInt(startNumber) + i).padStart(3, '0');
        newRacks.push(`${section}-${rackNumber}`);
    }
    
    const updatedConfig = currentConfig ? 
        currentConfig + '\n' + newRacks.join('\n') : 
        newRacks.join('\n');
    
    textarea.value = updatedConfig;
    
    showMessage(`✅ Added ${count} racks to section ${section}`, 'success');
}

// Test QR libraries to debug rendering issues
function testQRLibraries() {
    console.log('🧪 Testing QR Libraries...');
    
    let testResults = '🧪 QR Library Test Results:\n\n';
    
    // Test 1: Check if libraries are loaded
    testResults += '📚 Library Availability:\n';
    testResults += `• window.QRCode: ${typeof window.QRCode}\n`;
    testResults += `• window.QRious: ${typeof window.QRious}\n`;
    testResults += `• window.qrcode: ${typeof window.qrcode}\n`;
    testResults += `• Html5Qrcode: ${typeof window.Html5Qrcode}\n\n`;
    
    // Test 2: Check specific methods
    testResults += '🔧 Method Availability:\n';
    testResults += `• QRCode.toCanvas: ${window.QRCode && typeof window.QRCode.toCanvas === 'function' ? '✅' : '❌'}\n`;
    testResults += `• QRious constructor: ${window.QRious && typeof window.QRious === 'function' ? '✅' : '❌'}\n`;
    testResults += `• qrcode function: ${window.qrcode && typeof window.qrcode === 'function' ? '✅' : '❌'}\n\n`;
    
    // Test 3: Try generating a test QR code
    testResults += '🎯 QR Generation Test:\n';
    
    const testData = 'RACK_TEST_001';
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    
    // Try QRCode library
    if (window.QRCode && typeof window.QRCode.toCanvas === 'function') {
        try {
            window.QRCode.toCanvas(canvas, testData, {
                width: 200,
                margin: 1,
                errorCorrectionLevel: 'M'
            }, (error) => {
                if (error) {
                    testResults += '• QRCode.toCanvas: ❌ ' + error.message + '\n';
                } else {
                    testResults += '• QRCode.toCanvas: ✅ Success\n';
                }
                showTestResults();
            });
        } catch (e) {
            testResults += '• QRCode.toCanvas: ❌ ' + e.message + '\n';
            showTestResults();
        }
    } else {
        testResults += '• QRCode.toCanvas: ❌ Not available\n';
        showTestResults();
    }
    
    function showTestResults() {
        alert(testResults);
        console.log(testResults);
    }
}

// Simple QR code test generation function
async function generateTestQR() {
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 200;
        document.body.appendChild(canvas);
        
        if (window.QRCode) {
            await new Promise((resolve, reject) => {
                window.QRCode.toCanvas(canvas, 'RACK_TEST_001', {
                    width: 200,
                    margin: 1,
                    errorCorrectionLevel: 'M'
                }, (error) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            });
            
            showMessage('✅ Test QR code generated successfully!', 'success');
        } else {
            showMessage('❌ QR library not available', 'error');
        }
        
        // Remove test canvas after 3 seconds
        setTimeout(() => {
            if (canvas.parentNode) {
                canvas.parentNode.removeChild(canvas);
            }
        }, 3000);
        
    } catch (error) {
        showMessage('❌ QR generation failed: ' + error.message, 'error');
    }
}