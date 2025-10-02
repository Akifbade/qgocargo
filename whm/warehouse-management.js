// Warehouse Management - Dual QR System
class WarehouseManager {
    constructor() {
        this.currentReleasedPage = 1;
        this.releasedItemsPerPage = 20;
        this.releasedShipments = [];
        this.filteredReleasedShipments = [];
        this.currentReleasedFilter = 'all';
        this.warehouseRacks = [];
        this.totalRacks = 200; // 20x10 grid (A-T zones, 1-10 rows)
        
        // New dual QR system
        this.pendingShipmentAssignment = null; // Stores scanned shipment for location assignment
        this.scanningMode = null; // 'shipment' or 'rack'
        this.shipmentPieces = []; // Track individual piece QR codes
        
        this.initializeWarehouse();
    }

    // Initialize warehouse rack system with permanent QR codes
    initializeWarehouse() {
        this.warehouseRacks = [];
        const zones = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 
                      'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T'];
        
        for (let zoneIndex = 0; zoneIndex < zones.length; zoneIndex++) {
            const zone = zones[zoneIndex];
            for (let row = 1; row <= 10; row++) {
                const rackId = `${zone}-${row.toString().padStart(2, '0')}-01`;
                const rackQR = this.generateRackQR(rackId);
                
                this.warehouseRacks.push({
                    id: rackId,
                    zone: zone,
                    row: row,
                    qrCode: rackQR, // Permanent QR code for this rack
                    status: 'free', // 'occupied', 'free', 'warning', 'overdue'
                    shipmentId: null,
                    shipmentDetails: null,
                    assignedPieces: [], // Track individual pieces in this rack
                    lastUpdated: new Date()
                });
            }
        }
    }

    // Generate permanent QR code for rack
    generateRackQR(rackId) {
        return `RACK_${rackId.replace(/-/g, '_')}`;
    }

    // Generate QR code for shipment piece
    generatePieceQR(barcode, pieceNumber) {
        return `PIECE_${barcode}_${String(pieceNumber).padStart(3, '0')}`;
    }

    // New QR Scanning Workflow Methods
    async startLocationAssignmentMode() {
        this.scanningMode = 'shipment';
        this.pendingShipmentAssignment = null;
        
        // Show scanning interface
        this.showLocationAssignmentUI();
        
        // Initialize scanner for shipment pieces
        if (window.barcodeScanner) {
            await window.barcodeScanner.initializeLocationScanner();
        }
    }

    async processShipmentQRScan(qrData) {
        try {
            // Parse QR code for shipment piece
            if (!qrData.startsWith('PIECE_')) {
                this.showMessage('❌ Invalid shipment QR code format', 'error');
                return false;
            }

            const pieceInfo = this.parseShipmentQR(qrData);
            if (!pieceInfo) {
                this.showMessage('❌ Could not parse shipment QR code', 'error');
                return false;
            }

            // Find shipment in database
            const shipment = await this.findShipmentByBarcode(pieceInfo.barcode);
            if (!shipment) {
                this.showMessage('❌ Shipment not found in system', 'error');
                return false;
            }

            if (shipment.status !== 'confirmed') {
                this.showMessage('❌ Shipment must be confirmed before location assignment', 'error');
                return false;
            }

            // Store pending assignment
            this.pendingShipmentAssignment = {
                shipment: shipment,
                pieceQR: qrData,
                pieceInfo: pieceInfo
            };

            this.scanningMode = 'rack';
            this.updateLocationAssignmentUI('shipment_scanned');
            this.showMessage(`✅ Shipment piece scanned: ${pieceInfo.barcode}-${pieceInfo.pieceNumber}. Now scan rack QR code.`, 'success');
            
            return true;
        } catch (error) {
            console.error('Error processing shipment QR:', error);
            this.showMessage('❌ Error processing shipment QR: ' + error.message, 'error');
            return false;
        }
    }

    async processRackQRScan(qrData) {
        try {
            if (!this.pendingShipmentAssignment) {
                this.showMessage('❌ Please scan shipment QR code first', 'error');
                return false;
            }

            // Parse rack QR code
            if (!qrData.startsWith('RACK_')) {
                this.showMessage('❌ Invalid rack QR code format', 'error');
                return false;
            }

            const rackId = this.parseRackQR(qrData);
            if (!rackId) {
                this.showMessage('❌ Could not parse rack QR code', 'error');
                return false;
            }

            // Find rack
            const rack = this.warehouseRacks.find(r => r.id === rackId);
            if (!rack) {
                this.showMessage('❌ Rack not found in system', 'error');
                return false;
            }

            // Assign piece to rack
            await this.assignPieceToRack(this.pendingShipmentAssignment, rack);
            
            return true;
        } catch (error) {
            console.error('Error processing rack QR:', error);
            this.showMessage('❌ Error processing rack QR: ' + error.message, 'error');
            return false;
        }
    }

    parseShipmentQR(qrData) {
        // Parse "PIECE_WH2410021234_001" format
        const match = qrData.match(/^PIECE_([A-Z0-9]+)_(\d{3})$/);
        if (!match) return null;
        
        return {
            barcode: match[1],
            pieceNumber: parseInt(match[2])
        };
    }

    parseRackQR(qrData) {
        // Parse "RACK_A_01_01" format back to "A-01-01"
        const rackId = qrData.replace('RACK_', '').replace(/_/g, '-');
        return rackId;
    }

    async findShipmentByBarcode(barcode) {
        try {
            const { data, error } = await supabase
                .from('shipments')
                .select('*')
                .eq('barcode', barcode)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error finding shipment:', error);
            return null;
        }
    }

    async assignPieceToRack(assignmentData, rack) {
        try {
            const { shipment, pieceQR, pieceInfo } = assignmentData;
            
            // Check if rack can accommodate this piece
            const existingShipment = rack.shipmentDetails;
            if (existingShipment && existingShipment.barcode !== shipment.barcode) {
                // Different shipment already in rack
                this.showMessage('❌ Rack already contains a different shipment', 'error');
                return false;
            }

            // Update rack with piece assignment
            const rackIndex = this.warehouseRacks.findIndex(r => r.id === rack.id);
            if (rackIndex === -1) return false;

            // Add piece to rack
            if (!this.warehouseRacks[rackIndex].assignedPieces) {
                this.warehouseRacks[rackIndex].assignedPieces = [];
            }

            // Check if piece already assigned
            const existingPiece = this.warehouseRacks[rackIndex].assignedPieces.find(
                p => p.pieceQR === pieceQR
            );
            
            if (existingPiece) {
                this.showMessage('❌ This piece is already assigned to this rack', 'warning');
                return false;
            }

            // Add piece to rack
            this.warehouseRacks[rackIndex].assignedPieces.push({
                pieceQR: pieceQR,
                pieceNumber: pieceInfo.pieceNumber,
                assignedAt: new Date().toISOString()
            });

            // Update rack status and shipment details
            this.warehouseRacks[rackIndex].status = 'occupied';
            this.warehouseRacks[rackIndex].shipmentId = shipment.id;
            this.warehouseRacks[rackIndex].shipmentDetails = shipment;
            this.warehouseRacks[rackIndex].lastUpdated = new Date();

            // Update shipment rack location in database
            await this.updateShipmentLocation(shipment.id, rack.id, pieceQR);

            // Update warehouse display
            this.generateWarehouseGrid();
            this.updateWarehouseStats();

            // Reset assignment state
            this.pendingShipmentAssignment = null;
            this.scanningMode = 'shipment';
            this.updateLocationAssignmentUI('assignment_complete');

            this.showMessage(`✅ Piece ${pieceInfo.pieceNumber} assigned to rack ${rack.id}`, 'success');
            
            // Play success sound
            if (window.barcodeScanner) {
                window.barcodeScanner.playSuccessSound();
            }

            return true;
        } catch (error) {
            console.error('Error assigning piece to rack:', error);
            this.showMessage('❌ Error assigning piece to rack: ' + error.message, 'error');
            return false;
        }
    }

    async updateShipmentLocation(shipmentId, rackId, pieceQR) {
        try {
            // Get current rack assignments for this shipment
            const { data: existingData, error: fetchError } = await supabase
                .from('shipments')
                .select('rack, piece_locations')
                .eq('id', shipmentId)
                .single();

            if (fetchError) throw fetchError;

            // Parse existing piece locations
            let pieceLocations = {};
            try {
                if (existingData.piece_locations) {
                    pieceLocations = JSON.parse(existingData.piece_locations);
                }
            } catch (e) {
                pieceLocations = {};
            }

            // Add new piece location
            const pieceInfo = this.parseShipmentQR(pieceQR);
            pieceLocations[`piece_${pieceInfo.pieceNumber}`] = {
                rackId: rackId,
                assignedAt: new Date().toISOString(),
                pieceQR: pieceQR
            };

            // Update main rack if this is the first piece or consolidate location
            let mainRack = existingData.rack;
            if (!mainRack || mainRack === 'UNASSIGNED') {
                mainRack = rackId;
            }

            // Update database
            const { error: updateError } = await supabase
                .from('shipments')
                .update({
                    rack: mainRack,
                    piece_locations: JSON.stringify(pieceLocations),
                    updated_at: new Date().toISOString()
                })
                .eq('id', shipmentId);

            if (updateError) throw updateError;

            return true;
        } catch (error) {
            console.error('Error updating shipment location:', error);
            throw error;
        }
    }

    // Location Assignment UI Methods
    showLocationAssignmentUI() {
        const section = document.getElementById('warehouse-map');
        if (!section) return;

        // Add scanning interface to warehouse map section
        const existingScanner = document.getElementById('locationAssignmentScanner');
        if (existingScanner) {
            existingScanner.remove();
        }

        const scannerContainer = document.createElement('div');
        scannerContainer.id = 'locationAssignmentScanner';
        scannerContainer.className = 'location-scanner-container';
        scannerContainer.innerHTML = `
            <div class="scanner-header">
                <h3>📱 Location Assignment Scanner</h3>
                <button onclick="warehouseManager.stopLocationAssignment()" class="btn-secondary">❌ Stop Scanning</button>
            </div>
            <div class="scanner-workflow">
                <div class="workflow-step" id="step1" data-active="true">
                    <div class="step-number">1</div>
                    <div class="step-content">
                        <h4>Scan Shipment Piece QR Code</h4>
                        <p>Scan the QR code on the package/pallet</p>
                    </div>
                </div>
                <div class="workflow-step" id="step2">
                    <div class="step-number">2</div>
                    <div class="step-content">
                        <h4>Scan Rack QR Code</h4>
                        <p>Scan the permanent QR code on the rack</p>
                    </div>
                </div>
                <div class="workflow-step" id="step3">
                    <div class="step-number">3</div>
                    <div class="step-content">
                        <h4>Assignment Complete</h4>
                        <p>Piece location recorded in system</p>
                    </div>
                </div>
            </div>
            <div class="scanner-status" id="scannerStatus">
                <div class="status-message">Ready to scan shipment piece QR code...</div>
            </div>
            <div id="locationReader" class="qr-reader"></div>
        `;

        section.insertBefore(scannerContainer, section.firstChild);
        this.updateLocationAssignmentUI('ready');
    }

    updateLocationAssignmentUI(state) {
        const statusDiv = document.getElementById('scannerStatus');
        const steps = document.querySelectorAll('.workflow-step');
        
        if (!statusDiv) return;

        // Reset all steps
        steps.forEach(step => {
            step.removeAttribute('data-active');
            step.removeAttribute('data-completed');
        });

        switch (state) {
            case 'ready':
                document.getElementById('step1').setAttribute('data-active', 'true');
                statusDiv.innerHTML = '<div class="status-message">📱 Ready to scan shipment piece QR code...</div>';
                break;
                
            case 'shipment_scanned':
                document.getElementById('step1').setAttribute('data-completed', 'true');
                document.getElementById('step2').setAttribute('data-active', 'true');
                statusDiv.innerHTML = `
                    <div class="status-message success">✅ Shipment piece scanned successfully!</div>
                    <div class="scanned-info">
                        <strong>Barcode:</strong> ${this.pendingShipmentAssignment.shipment.barcode}<br>
                        <strong>Piece:</strong> ${this.pendingShipmentAssignment.pieceInfo.pieceNumber}<br>
                        <strong>Shipper:</strong> ${this.pendingShipmentAssignment.shipment.shipper}
                    </div>
                    <div class="next-step">📱 Now scan the rack QR code...</div>
                `;
                break;
                
            case 'assignment_complete':
                document.getElementById('step1').setAttribute('data-completed', 'true');
                document.getElementById('step2').setAttribute('data-completed', 'true');
                document.getElementById('step3').setAttribute('data-active', 'true');
                statusDiv.innerHTML = `
                    <div class="status-message success">✅ Location assignment completed!</div>
                    <div class="completion-message">Ready for next shipment piece...</div>
                `;
                
                // Auto-reset to step 1 after 3 seconds
                setTimeout(() => {
                    this.updateLocationAssignmentUI('ready');
                }, 3000);
                break;
        }
    }

    stopLocationAssignment() {
        // Stop scanner
        if (window.barcodeScanner) {
            window.barcodeScanner.stopLocationScanner();
        }

        // Remove scanner UI
        const scannerContainer = document.getElementById('locationAssignmentScanner');
        if (scannerContainer) {
            scannerContainer.remove();
        }

        // Reset state
        this.pendingShipmentAssignment = null;
        this.scanningMode = null;

        this.showMessage('Location assignment scanning stopped', 'info');
    }

    // Print permanent rack QR codes
    async printRackQRCodes(selectedRacks = null) {
        try {
            const racksToProcess = selectedRacks || this.warehouseRacks;
            
            // Check if jsPDF is available
            if (!window.jspdf) {
                this.showMessage('❌ PDF library not loaded. Please refresh the page and try again.', 'error');
                return;
            }
            
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF();
            
            let pageCount = 0;
            const itemsPerPage = 12; // 3x4 grid per page
            
            this.showMessage('Generating rack QR codes...', 'info');
            
            // Simple check for QR library - it should already be loaded from HTML
            console.log('Checking QR library availability...');
            console.log('window.QRCode:', typeof window.QRCode);
            console.log('window.qrcode:', typeof window.qrcode);
            
            // Wait a moment for libraries to be ready
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Use the simplest approach - the library is loaded in HTML
            let qrLibrary = null;
            if (window.QRCode && typeof window.QRCode.toCanvas === 'function') {
                qrLibrary = window.QRCode;
                console.log('Using window.QRCode');
            } else if (window.qrcode && typeof window.qrcode.toCanvas === 'function') {
                qrLibrary = window.qrcode;
                console.log('Using window.qrcode');
            } else {
                // Force use text-based approach
                console.log('QR library not detected, using text-based approach');
                qrLibrary = null;
            }
            
            for (let i = 0; i < racksToProcess.length; i++) {
                const rack = racksToProcess[i];
                
                if (i % itemsPerPage === 0 && i > 0) {
                    pdf.addPage();
                    pageCount++;
                }
                
                const x = 20 + (i % 3) * 60;
                const y = 20 + Math.floor((i % itemsPerPage) / 3) * 60;
                
                if (qrLibrary) {
                    // Try to generate actual QR code
                    try {
                        const canvas = document.createElement('canvas');
                        canvas.width = 150;
                        canvas.height = 150;
                        
                        await new Promise((resolve, reject) => {
                            qrLibrary.toCanvas(canvas, rack.qrCode, { 
                                width: 150,
                                margin: 2,
                                color: {
                                    dark: '#000000',
                                    light: '#FFFFFF'
                                }
                            }, (error) => {
                                if (error) {
                                    console.error('QR generation error:', error);
                                    reject(error);
                                } else {
                                    resolve();
                                }
                            });
                        });
                        
                        const qrDataUrl = canvas.toDataURL();
                        pdf.addImage(qrDataUrl, 'PNG', x, y, 40, 40);
                        
                    } catch (qrError) {
                        console.error('QR generation failed for rack:', rack.id, qrError);
                        // Fall back to text representation
                        this.addTextBasedQRToPDF(pdf, x, y, rack);
                    }
                } else {
                    // Use text-based representation
                    this.addTextBasedQRToPDF(pdf, x, y, rack);
                }
                
                // Add rack ID label
                pdf.setFontSize(12);
                pdf.setFont(undefined, 'bold');
                pdf.text(rack.id, x + 20, y + 45, { align: 'center' });
                
                // Add QR code data
                pdf.setFontSize(8);
                pdf.setFont(undefined, 'normal');
                pdf.text(rack.qrCode, x + 20, y + 50, { align: 'center' });
                
                // Add zone info
                pdf.setFontSize(10);
                pdf.text(`Zone ${rack.zone}`, x + 20, y + 55, { align: 'center' });
            }
            
            // Add header to first page
            pdf.setPage(1);
            pdf.setFontSize(16);
            pdf.setFont(undefined, 'bold');
            pdf.text('Warehouse Rack QR Codes', 105, 10, { align: 'center' });
            pdf.setFontSize(10);
            pdf.setFont(undefined, 'normal');
            pdf.text(`Generated: ${new Date().toLocaleString()}`, 105, 15, { align: 'center' });
            
            const filename = `warehouse-rack-qr-codes-${new Date().toISOString().split('T')[0]}.pdf`;
            pdf.save(filename);
            
            this.showMessage(`✅ ${racksToProcess.length} rack QR codes generated successfully!`, 'success');
            
        } catch (error) {
            console.error('Error generating rack QR codes:', error);
            this.showMessage('❌ Error generating rack QR codes: ' + error.message, 'error');
        }
    }

    // Add text-based QR representation to PDF
    addTextBasedQRToPDF(pdf, x, y, rack) {
        // Draw border for QR placeholder
        pdf.setDrawColor(0);
        pdf.setLineWidth(0.5);
        pdf.rect(x, y, 40, 40);
        
        // Add "QR" text
        pdf.setFontSize(16);
        pdf.setFont(undefined, 'bold');
        pdf.text('QR', x + 20, y + 15, { align: 'center' });
        
        // Add rack code
        pdf.setFontSize(8);
        pdf.setFont(undefined, 'normal');
        const codeLines = this.splitText(rack.qrCode, 12);
        codeLines.forEach((line, index) => {
            pdf.text(line, x + 20, y + 22 + (index * 3), { align: 'center' });
        });
    }

    // Helper to split text into lines
    splitText(text, maxLength) {
        const lines = [];
        for (let i = 0; i < text.length; i += maxLength) {
            lines.push(text.substring(i, i + maxLength));
        }
        return lines;
    }

    // Test QR library availability - for debugging
    testQRLibrary() {
        console.log('=== QR Library Test ===');
        console.log('window.QRCode:', typeof window.QRCode, window.QRCode);
        console.log('window.qrcode:', typeof window.qrcode, window.qrcode);
        console.log('window.QR:', typeof window.QR, window.QR);
        
        if (window.QRCode) {
            console.log('QRCode.toCanvas:', typeof window.QRCode.toCanvas);
            console.log('QRCode.toDataURL:', typeof window.QRCode.toDataURL);
        }
        
        // Test with simple QR generation
        if (window.QRCode && typeof window.QRCode.toCanvas === 'function') {
            try {
                const testCanvas = document.createElement('canvas');
                testCanvas.width = 100;
                testCanvas.height = 100;
                
                window.QRCode.toCanvas(testCanvas, 'TEST_QR_CODE', (error) => {
                    if (error) {
                        console.error('QR test failed:', error);
                        this.showMessage('❌ QR library test failed: ' + error.message, 'error');
                    } else {
                        console.log('✅ QR library test successful!');
                        this.showMessage('✅ QR library is working correctly!', 'success');
                    }
                });
            } catch (error) {
                console.error('QR test exception:', error);
                this.showMessage('❌ QR library test exception: ' + error.message, 'error');
            }
        } else {
            console.log('❌ QR library not available or toCanvas method missing');
            this.showMessage('❌ QR library not properly loaded', 'error');
        }
    }

    async loadReleasedShipments() {
        try {
            console.log('📤 Loading released shipments...');
            
            // Get released shipments from database (use updated_at instead of release_date)
            const { data: releasedData, error } = await supabase
                .from('shipments')
                .select('*')
                .in('status', ['out', 'released'])
                .order('updated_at', { ascending: false });

            if (error) throw error;

            // Sort by effective release date (out_date > release_date > updated_at > created_at)
            const sorted = (releasedData || []).slice().sort((a, b) => {
                const ad = this.getReleaseDate(a);
                const bd = this.getReleaseDate(b);
                return bd - ad;
            });

            this.releasedShipments = sorted;
            this.applyReleasedFilter(this.currentReleasedFilter);
            this.updateReleasedSummary();
            
            console.log('✅ Released shipments loaded successfully');
        } catch (error) {
            console.error('Error loading released shipments:', error);
            this.showMessage('Error loading released shipments: ' + error.message, 'error');
        }
    }

    applyReleasedFilter(filterType) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        this.currentReleasedFilter = filterType;

        switch (filterType) {
            case 'today':
                this.filteredReleasedShipments = this.releasedShipments.filter(shipment => {
                    const releaseDate = this.getReleaseDate(shipment);
                    return releaseDate >= today;
                });
                break;
            case 'thisWeek':
                this.filteredReleasedShipments = this.releasedShipments.filter(shipment => {
                    const releaseDate = this.getReleaseDate(shipment);
                    return releaseDate >= weekStart;
                });
                break;
            case 'thisMonth':
                this.filteredReleasedShipments = this.releasedShipments.filter(shipment => {
                    const releaseDate = this.getReleaseDate(shipment);
                    return releaseDate >= monthStart;
                });
                break;
            default:
                this.filteredReleasedShipments = [...this.releasedShipments];
        }

        this.currentReleasedPage = 1;
        this.displayReleasedShipments();
        this.updateReleasedTabStyles();
    }

    updateReleasedTabStyles() {
        // Update tab styles
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.getElementById(`${this.currentReleasedFilter}ReleasedTab`).classList.add('active');
    }

    searchReleasedShipments() {
        const query = document.getElementById('releasedSearch').value.toLowerCase();
        
        if (!query) {
            this.applyReleasedFilter(this.currentReleasedFilter);
            return;
        }

        this.filteredReleasedShipments = this.releasedShipments.filter(shipment =>
            shipment.barcode.toLowerCase().includes(query) ||
            shipment.shipper.toLowerCase().includes(query) ||
            shipment.consignee.toLowerCase().includes(query) ||
            shipment.rack.toLowerCase().includes(query)
        );

        this.currentReleasedPage = 1;
        this.displayReleasedShipments();
    }

    sortReleasedShipments() {
        const sortBy = document.getElementById('releasedSort').value;
        
        switch (sortBy) {
            case 'release_date_desc':
                this.filteredReleasedShipments.sort((a, b) => this.getReleaseDate(b) - this.getReleaseDate(a));
                break;
            case 'release_date_asc':
                this.filteredReleasedShipments.sort((a, b) => this.getReleaseDate(a) - this.getReleaseDate(b));
                break;
            case 'total_charges_desc':
                this.filteredReleasedShipments.sort((a, b) => (b.total_charges || 0) - (a.total_charges || 0));
                break;
            case 'total_charges_asc':
                this.filteredReleasedShipments.sort((a, b) => (a.total_charges || 0) - (b.total_charges || 0));
                break;
            case 'storage_days_desc':
                this.filteredReleasedShipments.sort((a, b) => {
                    const aDays = this.calculateDaysBetween(a.created_at, this.getReleaseDate(a));
                    const bDays = this.calculateDaysBetween(b.created_at, this.getReleaseDate(b));
                    return bDays - aDays;
                });
                break;
            case 'storage_days_asc':
                this.filteredReleasedShipments.sort((a, b) => {
                    const aDays = this.calculateDaysBetween(a.created_at, this.getReleaseDate(a));
                    const bDays = this.calculateDaysBetween(b.created_at, this.getReleaseDate(b));
                    return aDays - bDays;
                });
                break;
        }
        
        this.displayReleasedShipments();
    }

    displayReleasedShipments() {
        const startIndex = (this.currentReleasedPage - 1) * this.releasedItemsPerPage;
        const endIndex = startIndex + this.releasedItemsPerPage;
        const pageData = this.filteredReleasedShipments.slice(startIndex, endIndex);

        const tbody = document.querySelector('#releasedTable tbody');
        tbody.innerHTML = '';

        pageData.forEach(shipment => {
            const releaseDate = this.getReleaseDate(shipment);
            const storageDays = this.calculateDaysBetween(shipment.created_at, releaseDate);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <strong>${shipment.barcode}</strong>
                    <button title="Copy barcode" class="btn-icon" onclick="copyToClipboard('${shipment.barcode}')">📋</button>
                </td>
                <td>${shipment.shipper}</td>
                <td>${shipment.consignee}</td>
                <td>${shipment.weight} kg</td>
                <td>${shipment.pieces}</td>
                <td>${this.formatDate(shipment.created_at)}</td>
                <td>${this.formatDate(releaseDate)}</td>
                <td><span class="storage-days">${storageDays} days</span></td>
                <td><strong class="charges">KD ${(shipment.total_charges || 0).toFixed(3)}</strong></td>
                <td class="table-actions">
                    <button onclick="warehouseManager.viewReleasedInvoice('${shipment.id}')" class="btn-sm btn-primary">📄 Invoice</button>
                    <button onclick="warehouseManager.viewShipmentHistory('${shipment.id}')" class="btn-sm btn-secondary">📊 History</button>
                    ${window.warehouseApp && warehouseApp.currentUser && warehouseApp.currentUser.role === 'admin' ? `
                        <button onclick="editShipment('${shipment.barcode}')" class="btn-sm btn-warning admin-only">✏️ Edit</button>
                        <button onclick="deleteReleasedShipment('${shipment.barcode}')" class="btn-sm btn-danger admin-only">🗑️ Delete</button>
                    ` : ''}
                </td>
            `;
            tbody.appendChild(row);
        });

        this.updateReleasedPagination();
    }

    updateReleasedPagination() {
        const totalPages = Math.ceil(this.filteredReleasedShipments.length / this.releasedItemsPerPage);
        
        document.getElementById('releasedPageInfo').textContent = 
            `Page ${this.currentReleasedPage} of ${totalPages}`;
        
        document.getElementById('prevReleasedBtn').disabled = this.currentReleasedPage <= 1;
        document.getElementById('nextReleasedBtn').disabled = this.currentReleasedPage >= totalPages;
    }

    previousReleasedPage() {
        if (this.currentReleasedPage > 1) {
            this.currentReleasedPage--;
            this.displayReleasedShipments();
        }
    }

    nextReleasedPage() {
        const totalPages = Math.ceil(this.filteredReleasedShipments.length / this.releasedItemsPerPage);
        if (this.currentReleasedPage < totalPages) {
            this.currentReleasedPage++;
            this.displayReleasedShipments();
        }
    }

    updateReleasedSummary() {
        const totalCount = this.filteredReleasedShipments.length;
        const totalRevenue = this.filteredReleasedShipments.reduce((sum, shipment) => 
            sum + (shipment.total_charges || 0), 0);
        
        const totalDays = this.filteredReleasedShipments.reduce((sum, shipment) => 
            sum + this.calculateDaysBetween(shipment.created_at, this.getReleaseDate(shipment)), 0);
        const averageDays = totalCount > 0 ? Math.round(totalDays / totalCount) : 0;

        document.getElementById('totalReleasedCount').textContent = totalCount;
        document.getElementById('totalReleasedRevenue').textContent = `KD ${totalRevenue.toFixed(3)}`;
        document.getElementById('averageStayDuration').textContent = `${averageDays} days`;
    }

    // Warehouse Map Management
    async loadWarehouseMap() {
        try {
            console.log('🗺️ Loading warehouse map...');
            
            // Get active shipments to map to racks
            const { data: activeShipments, error } = await supabase
                .from('shipments')
                .select('*')
                .eq('status', 'in');

            if (error) throw error;

            // Update rack statuses
            this.updateRackStatuses(activeShipments || []);
            this.generateWarehouseGrid();
            this.updateWarehouseStats();
            
            console.log('✅ Warehouse map loaded successfully');
        } catch (error) {
            console.error('Error loading warehouse map:', error);
            this.showMessage('Error loading warehouse map: ' + error.message, 'error');
        }
    }

    updateRackStatuses(activeShipments) {
        // Reset all racks to free
        this.warehouseRacks.forEach(rack => {
            rack.status = 'free';
            rack.shipmentId = null;
            rack.shipmentDetails = null;
        });

    // Update with active shipments
        activeShipments.forEach(shipment => {
            const rack = this.warehouseRacks.find(r => r.id === shipment.rack);
            if (rack) {
        const daysSinceIntake = this.calculateDaysBetween(shipment.in_date || shipment.created_at, new Date());
                
                rack.shipmentId = shipment.id;
                rack.shipmentDetails = shipment;
                
                if (daysSinceIntake > 30) {
                    rack.status = 'overdue';
                } else if (daysSinceIntake > 21) {
                    rack.status = 'warning';
                } else {
                    rack.status = 'occupied';
                }
            }
        });
    }

    generateWarehouseGrid() {
        const grid = document.getElementById('warehouseGrid');
        grid.innerHTML = '';

        this.warehouseRacks.forEach(rack => {
            const cell = document.createElement('div');
            cell.className = `rack-cell ${rack.status}`;
            cell.dataset.rackId = rack.id;
            cell.textContent = rack.zone + rack.row;
            cell.title = `${rack.id} - ${rack.status.toUpperCase()}`;
            
            cell.addEventListener('click', () => this.showRackDetails(rack.id));
            
            grid.appendChild(cell);
        });
    }

    showRackDetails(rackId) {
        const rack = this.warehouseRacks.find(r => r.id === rackId);
        if (!rack) return;

        document.getElementById('selectedRackTitle').textContent = `Rack ${rack.id}`;
        
        const content = document.getElementById('rackDetailsContent');
        
    const canEdit = !!window.__EDIT_MODE__;
    const isAdmin = !!(window.warehouseApp && warehouseApp.currentUser && warehouseApp.currentUser.role === 'admin');
    const allowEdit = canEdit && isAdmin;
        if (rack.status === 'free') {
            content.innerHTML = `
                <div class="detail-item">
                    <span class="detail-label">Status:</span>
                    <span class="detail-value" style="color: #10b981;">✅ Available</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Zone:</span>
                    <span class="detail-value">${rack.zone}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Row:</span>
                    <span class="detail-value">${rack.row}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Last Updated:</span>
                    <span class="detail-value">${this.formatDate(rack.lastUpdated)}</span>
                </div>
                <div style="margin-top: 1rem;">
                    <h4>📝 Assign Shipment to This Rack</h4>
                    <input type="text" id="assignBarcode" placeholder="Enter barcode to assign" style="width: 100%; padding: 0.5rem; margin: 0.5rem 0; border: 1px solid #e5e7eb; border-radius: 4px;" ${allowEdit ? '' : 'disabled'}>
                    <button onclick="window.warehouseManager.assignShipmentToRack('${rack.id}')" class="btn-primary" style="width: 100%; margin-top: 0.5rem;" ${allowEdit ? '' : 'disabled title="Enable Edit Mode (Admin only)"'}>
                        📦 Assign Shipment
                    </button>
                    ${allowEdit ? '' : '<small style="color:#6b7280">Enable Edit Mode as Admin to assign shipments.</small>'}
                </div>
            `;
        } else {
            const shipment = rack.shipmentDetails;
            const daysSinceIntake = this.calculateDaysBetween(shipment.created_at, new Date());
            
            content.innerHTML = `
                <div class="detail-item">
                    <span class="detail-label">Status:</span>
                    <span class="detail-value" style="color: ${this.getStatusColor(rack.status)};">
                        ${rack.status === 'overdue' ? '🚨' : rack.status === 'warning' ? '⚠️' : '📦'} 
                        ${rack.status.toUpperCase()}
                    </span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Barcode:</span>
                    <span class="detail-value"><strong>${shipment.barcode}</strong></span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Shipper:</span>
                    <span class="detail-value">${shipment.shipper}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Consignee:</span>
                    <span class="detail-value">${shipment.consignee}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Weight:</span>
                    <span class="detail-value">${shipment.weight} kg</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Pieces:</span>
                    <span class="detail-value">${shipment.pieces}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Intake Date:</span>
                    <span class="detail-value">${this.formatDate(shipment.created_at)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Days Stored:</span>
                    <span class="detail-value"><strong>${daysSinceIntake} days</strong></span>
                </div>
                <div style="margin-top: 1rem;">
                    <h4>📝 Edit Rack Assignment</h4>
                    <label>Move to rack:</label>
                    <input type="text" id="moveToRack" placeholder="Enter new rack (e.g., B-05-01)" style="width: 100%; padding: 0.5rem; margin: 0.5rem 0; border: 1px solid #e5e7eb; border-radius: 4px;" ${allowEdit ? '' : 'disabled'}>
                    <button onclick="window.warehouseManager.moveShipmentToRack('${shipment.id}', '${rack.id}')" class="btn-warning" style="width: 100%; margin-top: 0.5rem;" ${allowEdit ? '' : 'disabled title="Enable Edit Mode (Admin only)"'}>
                        🔄 Move Shipment
                    </button>
                    ${allowEdit ? '' : '<small style="color:#6b7280">Enable Edit Mode as Admin to move shipments.</small>'}
                </div>
                <div style="margin-top: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    <button onclick="warehouseManager.quickReleaseShipment('${shipment.id}')" class="btn-sm btn-primary">
                        🚀 Quick Release
                    </button>
                    <button onclick="warehouseManager.viewShipmentDetails('${shipment.id}')" class="btn-sm btn-secondary">
                        📋 View Details
                    </button>
                    ${isAdmin ? `
                        <button onclick="editShipment('${shipment.barcode}')" class="btn-sm btn-warning admin-only">
                            ✏️ Edit Shipment
                        </button>
                        <button onclick="deleteShipmentFromRack('${shipment.barcode}', '${rack.id}')" class="btn-sm btn-danger admin-only">
                            🗑️ Delete Shipment
                        </button>
                    ` : ''}
                    <button onclick="window.warehouseManager.emptyRack('${rack.id}')" class="btn-sm btn-danger" ${allowEdit ? '' : 'disabled title="Enable Edit Mode (Admin only)"'}>
                        🗑️ Empty Rack
                    </button>
                </div>
            `;
        }
        
        document.getElementById('rackDetailsPanel').style.display = 'block';
    }

    closeRackDetails() {
        document.getElementById('rackDetailsPanel').style.display = 'none';
    }

    getStatusColor(status) {
        switch (status) {
            case 'free': return '#10b981';
            case 'occupied': return '#2563eb';
            case 'warning': return '#f59e0b';
            case 'overdue': return '#ef4444';
            default: return '#6b7280';
        }
    }

    updateWarehouseStats() {
        const occupiedCount = this.warehouseRacks.filter(r => r.status !== 'free').length;
        const freeCount = this.warehouseRacks.filter(r => r.status === 'free').length;
        const utilizationRate = Math.round((occupiedCount / this.totalRacks) * 100);

        document.getElementById('totalRacksCount').textContent = this.totalRacks;
        document.getElementById('occupiedRacksCount').textContent = occupiedCount;
        document.getElementById('freeRacksCount').textContent = freeCount;
        document.getElementById('utilizationRate').textContent = `${utilizationRate}%`;
    }

    filterByZone() {
        const selectedZone = document.getElementById('zoneFilter').value;
        this.applyWarehouseFilters();
    }

    filterByStatus() {
        const selectedStatus = document.getElementById('statusFilter').value;
        this.applyWarehouseFilters();
    }

    applyWarehouseFilters() {
        const selectedZone = document.getElementById('zoneFilter').value;
        const selectedStatus = document.getElementById('statusFilter').value;

        document.querySelectorAll('.rack-cell').forEach(cell => {
            const rackId = cell.dataset.rackId;
            const rack = this.warehouseRacks.find(r => r.id === rackId);
            
            let showRack = true;
            
            if (selectedZone !== 'all' && rack.zone !== selectedZone) {
                showRack = false;
            }
            
            if (selectedStatus !== 'all') {
                if (selectedStatus === 'occupied' && rack.status === 'free') {
                    showRack = false;
                } else if (selectedStatus === 'free' && rack.status !== 'free') {
                    showRack = false;
                } else if (selectedStatus === 'overdue' && rack.status !== 'overdue') {
                    showRack = false;
                }
            }
            
            cell.style.display = showRack ? 'flex' : 'none';
        });
    }

    // Text search filter for racks (by rack ID like "B-05")
    filterRacksByText() {
        // First apply existing zone/status filters
        this.applyWarehouseFilters();
        const queryInput = document.getElementById('rackSearch');
        if (!queryInput) return;
        const q = (queryInput.value || '').trim().toLowerCase();
        if (!q) return; // Nothing to filter further

        document.querySelectorAll('.rack-cell').forEach(cell => {
            if (cell.style.display === 'none') return; // already filtered out by zone/status
            const rackId = (cell.dataset.rackId || '').toLowerCase();
            if (!rackId.includes(q)) {
                cell.style.display = 'none';
            }
        });
    }

    // Utility functions
    calculateDaysBetween(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: '2-digit'
        }) + ' ' + date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Export functions
    async exportReleasedData() {
        try {
            const csvContent = this.convertToCSV(this.filteredReleasedShipments);
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `released-shipments-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            
            showMessage('Released shipments data exported successfully!', 'success');
        } catch (error) {
            console.error('Export error:', error);
            showMessage('Error exporting data: ' + error.message, 'error');
        }
    }

    async exportRackData() {
        try {
            const rackData = this.warehouseRacks.map(rack => ({
                rack_id: rack.id,
                zone: rack.zone,
                row: rack.row,
                status: rack.status,
                barcode: rack.shipmentDetails?.barcode || '',
                shipper: rack.shipmentDetails?.shipper || '',
                consignee: rack.shipmentDetails?.consignee || '',
                days_stored: rack.shipmentDetails ? this.calculateDaysBetween(rack.shipmentDetails.created_at, new Date()) : 0
            }));
            
            const csvContent = this.convertToCSV(rackData);
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `warehouse-rack-report-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            
            showMessage('Warehouse rack report exported successfully!', 'success');
        } catch (error) {
            console.error('Export error:', error);
            showMessage('Error exporting rack data: ' + error.message, 'error');
        }
    }

    convertToCSV(data) {
        if (!data.length) return '';
        
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];
        
        data.forEach(row => {
            const values = headers.map(header => {
                const value = row[header];
                return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
            });
            csvRows.push(values.join(','));
        });
        
        return csvRows.join('\n');
    }

    // Utility functions for loading and messages
    showLoadingMessage(message = 'Loading...') {
        let overlay = document.getElementById('loadingOverlay');
        if (!overlay) {
            // Create new loading overlay if it doesn't exist
            overlay = document.createElement('div');
            overlay.id = 'loadingOverlay';
            overlay.className = 'loading-overlay';
            overlay.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p id="loadingText">${message}</p>
                </div>
            `;
            document.body.appendChild(overlay);
        } else {
            // Use existing overlay and update message
            const loadingText = overlay.querySelector('p');
            if (loadingText) {
                loadingText.textContent = message;
            }
        }
        overlay.style.display = 'flex';
    }

    hideLoadingMessage() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    showMessage(message, type = 'info') {
        let container = document.getElementById('messageContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'messageContainer';
            container.className = 'message-container';
            document.body.appendChild(container);
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${type}`;
        
        const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
        messageDiv.innerHTML = `
            <span class="message-icon">${icon}</span>
            <span class="message-text">${message}</span>
            <button class="message-close" onclick="this.parentElement.remove()">×</button>
        `;

        container.appendChild(messageDiv);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentElement) {
                messageDiv.remove();
            }
        }, 5000);
    }

    // Quick actions
    async quickReleaseShipment(shipmentId) {
        if (confirm('Are you sure you want to release this shipment? This will calculate charges and generate an invoice.')) {
            // Use the existing release functionality
            if (window.warehouseApp && window.warehouseApp.releaseShipment) {
                await window.warehouseApp.releaseShipment(shipmentId);
                this.closeRackDetails();
                this.refreshWarehouseMap();
            } else {
                showMessage('Release functionality not available', 'error');
            }
        }
    }

    async viewReleasedInvoice(shipmentId) {
        try {
            // Get shipment details
            const { data: shipment, error } = await supabase
                .from('shipments')
                .select('*')
                .eq('id', shipmentId)
                .single();

            if (error) throw error;

            // Generate and show invoice
            if (window.invoiceManager) {
                await window.invoiceManager.generateInvoice(shipment);
            } else {
                this.showMessage('Invoice functionality not available', 'error');
            }
        } catch (error) {
            console.error('Error viewing invoice:', error);
            this.showMessage('Error loading invoice: ' + error.message, 'error');
        }
    }

    async viewShipmentHistory(shipmentId) {
        try {
            const historyData = await dbManager.getShipmentHistory(shipmentId);
            this.showShipmentHistoryModal(historyData);
        } catch (error) {
            console.error('Error viewing shipment history:', error);
            showMessage('Error loading shipment history: ' + error.message, 'error');
        }
    }

    showShipmentHistoryModal(historyData) {
        const { shipment, charges, history } = historyData;
        
        const modalContent = `
            <div class="history-modal">
                <h3>📋 Shipment History: ${shipment.barcode}</h3>
                
                <div class="shipment-summary">
                    <div class="summary-row">
                        <span><strong>Shipper:</strong> ${shipment.shipper}</span>
                        <span><strong>Consignee:</strong> ${shipment.consignee}</span>
                    </div>
                    <div class="summary-row">
                        <span><strong>Weight:</strong> ${shipment.weight} kg</span>
                        <span><strong>Pieces:</strong> ${shipment.pieces}</span>
                    </div>
                    <div class="summary-row">
                        <span><strong>Rack:</strong> ${shipment.rack}</span>
                        <span><strong>Status:</strong> ${shipment.status.toUpperCase()}</span>
                    </div>
                </div>

                <div class="charges-summary">
                    <h4>💰 Charges Breakdown</h4>
                    <div class="charge-item">
                        <span>Storage Days:</span>
                        <span>${charges.storageDays} days</span>
                    </div>
                    <div class="charge-item">
                        <span>Chargeable Days:</span>
                        <span>${charges.chargeableDays} days</span>
                    </div>
                    <div class="charge-item">
                        <span>Storage Charges:</span>
                        <span>KD ${Number(charges.storageCharges).toFixed(3)}</span>
                    </div>
                    <div class="charge-item">
                        <span>Handling Charges:</span>
                        <span>KD ${Number(charges.handlingCharges).toFixed(3)}</span>
                    </div>
                    <div class="charge-item total">
                        <span><strong>Total Charges:</strong></span>
                        <span><strong>KD ${Number(charges.totalCharges).toFixed(3)}</strong></span>
                    </div>
                </div>

                <div class="history-timeline">
                    <h4>📅 Event Timeline</h4>
                    ${history.map(event => `
                        <div class="timeline-event ${event.type}">
                            <div class="event-date">${this.formatDate(event.date)}</div>
                            <div class="event-content">
                                <h5>${event.event}</h5>
                                <p>${event.details}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        // Create and show modal
        this.showCustomModal('Shipment History', modalContent);
    }

    showCustomModal(title, content) {
        // Create modal if it doesn't exist
        let modal = document.getElementById('customModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'customModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="customModalTitle">${title}</h3>
                        <span class="close" onclick="document.getElementById('customModal').style.display='none'">&times;</span>
                    </div>
                    <div id="customModalContent" class="modal-body">
                        ${content}
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        } else {
            document.getElementById('customModalTitle').textContent = title;
            document.getElementById('customModalContent').innerHTML = content;
        }
        
        modal.style.display = 'block';
    }

    async viewShipmentDetails(shipmentId) {
        try {
            const { data: shipment, error } = await supabase
                .from('shipments')
                .select('*')
                .eq('id', shipmentId)
                .single();

            if (error) throw error;

            const charges = await dbManager.calculateStorageCharges(shipment);
            const daysSinceIntake = this.calculateDaysBetween(shipment.created_at, new Date());
            
            const detailsContent = `
                <div class="shipment-details">
                    <h3>📦 Shipment Details</h3>
                    
                    <div class="details-grid">
                        <div class="detail-section">
                            <h4>Basic Information</h4>
                            <div class="detail-item">
                                <span class="detail-label">Barcode:</span>
                                <span class="detail-value"><strong>${shipment.barcode}</strong></span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Shipper:</span>
                                <span class="detail-value">${shipment.shipper}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Consignee:</span>
                                <span class="detail-value">${shipment.consignee}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Weight:</span>
                                <span class="detail-value">${shipment.weight} kg</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Pieces:</span>
                                <span class="detail-value">${shipment.pieces}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Rack Location:</span>
                                <span class="detail-value"><strong>${shipment.rack}</strong></span>
                            </div>
                        </div>

                        <div class="detail-section">
                            <h4>Storage Information</h4>
                            <div class="detail-item">
                                <span class="detail-label">Intake Date:</span>
                                <span class="detail-value">${this.formatDate(shipment.created_at)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Days Stored:</span>
                                <span class="detail-value"><strong>${daysSinceIntake} days</strong></span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Status:</span>
                                <span class="detail-value status-${shipment.status}">${shipment.status.toUpperCase()}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Current Charges:</span>
                                <span class="detail-value"><strong>KD ${Number(charges.totalCharges).toFixed(3)}</strong></span>
                            </div>
                        </div>
                    </div>

                    ${shipment.notes ? `
                        <div class="detail-section">
                            <h4>Notes</h4>
                            <p class="notes-content">${shipment.notes}</p>
                        </div>
                    ` : ''}

                    <div class="detail-actions">
                        <button onclick="warehouseManager.quickReleaseShipment('${shipment.id}')" class="btn-primary">
                            🚀 Release Shipment
                        </button>
                        <button onclick="warehouseManager.printShipmentLabel('${shipment.id}')" class="btn-secondary">
                            🏷️ Print Label
                        </button>
                        <button onclick="warehouseManager.viewShipmentHistory('${shipment.id}')" class="btn-secondary">
                            📊 View History
                        </button>
                    </div>
                </div>
            `;

            this.showCustomModal('Shipment Details', detailsContent);
        } catch (error) {
            console.error('Error viewing shipment details:', error);
            showMessage('Error loading shipment details: ' + error.message, 'error');
        }
    }

    async printShipmentLabel(shipmentId) {
        try {
            const { data: shipment, error } = await supabase
                .from('shipments')
                .select('*')
                .eq('id', shipmentId)
                .single();

            if (error) throw error;

            // Use the existing label printing functionality
            if (window.labelPrinter) {
                await window.labelPrinter.printSingleLabel(shipment);
            } else {
                this.showMessage('Label printing functionality not available', 'error');
            }
        } catch (error) {
            console.error('Error printing label:', error);
            this.showMessage('Error printing label: ' + error.message, 'error');
        }
    }

    refreshWarehouseMap() {
        this.loadWarehouseMap();
    }

    // New editing functions for warehouse map
    async assignShipmentToRack(rackId) {
        const isAdmin = !!(window.warehouseApp && warehouseApp.currentUser && warehouseApp.currentUser.role === 'admin');
        if (!window.__EDIT_MODE__ || !isAdmin) {
            this.showMessage('Enable Edit Mode as Admin to perform this action', 'warning');
            return;
        }
        const barcode = document.getElementById('assignBarcode').value.trim();
        if (!barcode) {
            this.showMessage('Please enter a barcode', 'warning');
            return;
        }

        try {
            // Find shipment by barcode
            const { data: shipment, error } = await supabase
                .from('shipments')
                .select('*')
                .eq('barcode', barcode)
                .eq('status', 'in')
                .single();

            if (error) {
                this.showMessage('Shipment not found or already released', 'error');
                return;
            }

            // Update shipment rack
            const { error: updateError } = await supabase
                .from('shipments')
                .update({ rack: rackId })
                .eq('id', shipment.id);

            if (updateError) throw updateError;

            this.showMessage(`Shipment ${barcode} assigned to rack ${rackId}`, 'success');
            this.closeRackDetails();
            this.refreshWarehouseMap();

        } catch (error) {
            console.error('Error assigning shipment:', error);
            this.showMessage('Error assigning shipment: ' + error.message, 'error');
        }
    }

    async moveShipmentToRack(shipmentId, currentRackId) {
        const isAdmin = !!(window.warehouseApp && warehouseApp.currentUser && warehouseApp.currentUser.role === 'admin');
        if (!window.__EDIT_MODE__ || !isAdmin) {
            this.showMessage('Enable Edit Mode as Admin to perform this action', 'warning');
            return;
        }
        const newRack = document.getElementById('moveToRack').value.trim();
        if (!newRack) {
            this.showMessage('Please enter a new rack location', 'warning');
            return;
        }

        if (confirm(`Move shipment from ${currentRackId} to ${newRack}?`)) {
            try {
                const { error } = await supabase
                    .from('shipments')
                    .update({ rack: newRack })
                    .eq('id', shipmentId);

                if (error) throw error;

                this.showMessage(`Shipment moved to rack ${newRack}`, 'success');
                this.closeRackDetails();
                this.refreshWarehouseMap();

            } catch (error) {
                console.error('Error moving shipment:', error);
                this.showMessage('Error moving shipment: ' + error.message, 'error');
            }
        }
    }

    async emptyRack(rackId) {
        const isAdmin = !!(window.warehouseApp && warehouseApp.currentUser && warehouseApp.currentUser.role === 'admin');
        if (!window.__EDIT_MODE__ || !isAdmin) {
            this.showMessage('Enable Edit Mode as Admin to perform this action', 'warning');
            return;
        }
        if (confirm(`Are you sure you want to empty rack ${rackId}? This will mark the shipment as released.`)) {
            try {
                // Find shipment in this rack
                const { data: shipment, error: findError } = await supabase
                    .from('shipments')
                    .select('*')
                    .eq('rack', rackId)
                    .eq('status', 'in')
                    .single();

                if (findError) throw findError;

                // Mark as released
                const { error: updateError } = await supabase
                    .from('shipments')
                    .update({ 
                        status: 'out',
                        rack: null,
                        out_date: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', shipment.id);

                if (updateError) throw updateError;

                this.showMessage(`Rack ${rackId} emptied - shipment released`, 'success');
                this.closeRackDetails();
                this.refreshWarehouseMap();

            } catch (error) {
                console.error('Error emptying rack:', error);
                this.showMessage('Error emptying rack: ' + error.message, 'error');
            }
        }
    }

    filterReleasedShipments() {
        const startDate = document.getElementById('releasedStartDate').value;
        const endDate = document.getElementById('releasedEndDate').value;

        if (!startDate || !endDate) {
            showMessage('Please select both start and end dates', 'warning');
            return;
        }

        this.filteredReleasedShipments = this.releasedShipments.filter(shipment => {
            // Use effective release date
            const releaseDate = this.getReleaseDate(shipment);
            return releaseDate >= new Date(startDate) && releaseDate <= new Date(endDate);
        });

        this.currentReleasedPage = 1;
        this.displayReleasedShipments();
        this.updateReleasedSummary();
        
        showMessage(`Filtered ${this.filteredReleasedShipments.length} shipments between ${startDate} and ${endDate}`, 'success');
    }

    // Helper to get the effective release date for a shipment
    getReleaseDate(shipment) {
        return new Date(shipment.out_date || shipment.release_date || shipment.updated_at || shipment.created_at);
    }
}

// ⚡ IMMEDIATE GLOBAL FUNCTION DEFINITIONS - Available immediately when script loads
// Global functions for HTML event handlers - Make sure they're on window object
window.showReleasedTab = window.showReleasedTab || function(tabName) {
    if (window.warehouseManager) {
        window.warehouseManager.applyReleasedFilter(tabName);
    } else {
        console.warn('WarehouseManager not ready yet');
    }
};

window.filterReleasedShipments = window.filterReleasedShipments || function() {
    if (window.warehouseManager) {
        window.warehouseManager.filterReleasedShipments();
    } else {
        console.warn('WarehouseManager not ready yet');
    }
};

window.exportReleasedData = window.exportReleasedData || function() {
    if (window.warehouseManager) {
        window.warehouseManager.exportReleasedData();
    } else {
        console.warn('WarehouseManager not ready yet');
    }
};

window.searchReleasedShipments = window.searchReleasedShipments || function() {
    if (window.warehouseManager) {
        window.warehouseManager.searchReleasedShipments();
    } else {
        console.warn('WarehouseManager not ready yet');
    }
};

window.sortReleasedShipments = window.sortReleasedShipments || function() {
    if (window.warehouseManager) {
        window.warehouseManager.sortReleasedShipments();
    } else {
        console.warn('WarehouseManager not ready yet');
    }
};

window.previousReleasedPage = window.previousReleasedPage || function() {
    if (window.warehouseManager) {
        window.warehouseManager.previousReleasedPage();
    } else {
        console.warn('WarehouseManager not ready yet');
    }
};

window.nextReleasedPage = window.nextReleasedPage || function() {
    if (window.warehouseManager) {
        window.warehouseManager.nextReleasedPage();
    } else {
        console.warn('WarehouseManager not ready yet');
    }
};

window.refreshWarehouseMap = window.refreshWarehouseMap || function() {
    if (window.warehouseManager) {
        window.warehouseManager.refreshWarehouseMap();
    } else {
        console.warn('WarehouseManager not ready yet');
    }
};

window.exportRackData = window.exportRackData || function() {
    if (window.warehouseManager) {
        window.warehouseManager.exportRackData();
    } else {
        console.warn('WarehouseManager not ready yet');
    }
};

window.filterByZone = window.filterByZone || function() {
    if (window.warehouseManager) {
        window.warehouseManager.filterByZone();
    } else {
        console.warn('WarehouseManager not ready yet');
    }
};

window.filterByStatus = window.filterByStatus || function() {
    if (window.warehouseManager) {
        window.warehouseManager.filterByStatus();
    } else {
        console.warn('WarehouseManager not ready yet');
    }
};

window.closeRackDetails = window.closeRackDetails || function() {
    if (window.warehouseManager) {
        window.warehouseManager.closeRackDetails();
    } else {
        console.warn('WarehouseManager not ready yet');
    }
};

window.toggleMapView = window.toggleMapView || function() {
    const grid = document.getElementById('warehouseGrid');
    const button = document.getElementById('mapViewToggle');
    
    if (grid && button) {
        if (grid.style.gridTemplateColumns.includes('repeat(10')) {
            grid.style.gridTemplateColumns = 'repeat(20, 1fr)';
            button.textContent = '🔲 Grid View';
        } else {
            grid.style.gridTemplateColumns = 'repeat(10, 1fr)';
            button.textContent = '📋 List View';
        }
    }
};

console.log('✅ Warehouse Management Functions loaded and attached to window object');

// Initialize warehouse manager - Global variable
window.warehouseManager = null;

// Wait for both DOM and supabase to be ready
function initializeWarehouseManager() {
    if (typeof supabase !== 'undefined' && supabase) {
        window.warehouseManager = new WarehouseManager();
        console.log('✅ Warehouse Manager initialized successfully');
    } else {
        console.log('⏳ Waiting for Supabase client...');
        setTimeout(initializeWarehouseManager, 100);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    initializeWarehouseManager();
});