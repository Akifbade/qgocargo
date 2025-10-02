// ===================
// BARCODE SCANNER CLASS
// ===================

class BarcodeScanner {
    constructor() {
        this.scanner = null;
        this.releaseScanner = null;
        this.directReleaseScanner = null;
        this.locationScanner = null; // New location assignment scanner
        this.isScanning = false;
        this.isReleaseScanning = false;
        this.isDirectReleaseScanning = false;
        this.isLocationScanning = false; // New location scanning state
        
        // Audio feedback
        this.audioContext = null;
        this.initializeSounds();
    }
    
    // Initialize audio feedback
    initializeSounds() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
            console.warn('Audio feedback not available:', error);
        }
    }
    
    // Play success sound (high beep)
    playSuccessSound() {
        if (this.audioContext) {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.value = 800; // High pitched
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.2);
        }
    }
    
    // Play error sound (low beep)
    playErrorSound() {
        if (this.audioContext) {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.value = 300; // Low pitched
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.5);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.5);
        }
    }
    
    // Initialize intake scanner
    initializeIntakeScanner() {
        if (this.isScanning) {
            this.stopIntakeScanner();
            return;
        }

        try {
            const config = {
                fps: APP_CONFIG.SCANNER.fps,
                qrbox: APP_CONFIG.SCANNER.qrbox,
                aspectRatio: APP_CONFIG.SCANNER.aspectRatio,
                facingMode: "environment"
            };

            this.scanner = new Html5QrcodeScanner(
                "reader",
                config,
                /* verbose= */ false
            );

            this.scanner.render(
                (decodedText, decodedResult) => {
                    this.onIntakeScanSuccess(decodedText, decodedResult);
                },
                (error) => {
                    console.log(`QR Code scan error: ${error}`);
                }
            );

            this.isScanning = true;
            
            // Safely show scanner section
            const scannerSection = document.getElementById('scanner-section');
            if (scannerSection) {
                scannerSection.style.display = 'block';
            }
            
            if (typeof showMessage === 'function') {
                showMessage('📷 Scanner Active! Position barcode/QR code in view.', 'success');
            }
            
        } catch (error) {
            console.error('Error initializing scanner:', error);
            if (typeof showMessage === 'function') {
                showMessage('Error initializing scanner', 'error');
            }
            this.playErrorSound();
        }
    }

    // Handle successful scan for intake
    onIntakeScanSuccess(decodedText, decodedResult) {
        console.log(`Scan successful: ${decodedText}`);
        this.playSuccessSound(); // Play success sound
        
        // Stop scanning and populate the form
        this.stopIntakeScanner();
        
        // Fill the barcode field
        const barcodeField = document.getElementById('barcode');
        if (barcodeField) {
            barcodeField.value = decodedText.trim();
            if (typeof showMessage === 'function') {
                showMessage(`✅ Barcode scanned: ${decodedText}`, 'success');
            }
        }
    }

    // Stop intake scanner
    stopIntakeScanner() {
        if (this.scanner) {
            try {
                this.scanner.clear();
            } catch (error) {
                console.warn('Error clearing scanner:', error);
            }
            this.scanner = null;
        }
        
        this.isScanning = false;
        
        // Safely hide scanner section
        const scannerSection = document.getElementById('scanner-section');
        if (scannerSection) {
            scannerSection.style.display = 'none';
        }
        
        // if (typeof showMessage === 'function') {
        //     showMessage('Scanner stopped', 'info');
        // }
    }

    // Initialize release scanner
    initializeReleaseScanner() {
        if (this.isReleaseScanning) {
            this.stopReleaseScanner();
            return;
        }

        try {
            const config = {
                fps: APP_CONFIG.SCANNER.fps,
                qrbox: APP_CONFIG.SCANNER.qrbox,
                aspectRatio: APP_CONFIG.SCANNER.aspectRatio,
                facingMode: "environment"
            };

            this.releaseScanner = new Html5QrcodeScanner(
                "releaseReader",
                config,
                /* verbose= */ false
            );

            this.releaseScanner.render(
                (decodedText, decodedResult) => {
                    this.onReleaseScanSuccess(decodedText, decodedResult);
                },
                (error) => {
                    console.log(`QR Code scan error: ${error}`);
                }
            );

            this.isReleaseScanning = true;
            
            // Safely show/hide scanner elements
            const releaseScanner = document.getElementById('release-scanner');
            const directReleaseScanner = document.getElementById('direct-release-scanner');
            
            if (releaseScanner) {
                releaseScanner.style.display = 'block';
            }
            if (directReleaseScanner) {
                directReleaseScanner.style.display = 'none';
            }
            
            if (typeof showMessage === 'function') {
                showMessage('📷 Release Scanner Active! Scan to search shipment.', 'success');
            }
            
        } catch (error) {
            console.error('Error initializing release scanner:', error);
            if (typeof showMessage === 'function') {
                showMessage('Error initializing release scanner', 'error');
            }
            this.playErrorSound();
        }
    }

    // Handle successful scan for release (search mode)
    async onReleaseScanSuccess(decodedText, decodedResult) {
        console.log(`Release Scan successful: ${decodedText}`);
        this.playSuccessSound(); // Play success sound
        
        // Stop scanning immediately
        this.stopReleaseScanner();
        
        try {
            // Search for shipment (exact barcode match)
            if (typeof dbManager?.searchShipments === 'function') {
                const results = await dbManager.searchShipments(decodedText.trim(), 'in', true);
                if (!results || results.length === 0) {
                    // Fallback to strict single fetch
                    const ship = await dbManager.getShipmentByBarcode(decodedText.trim());
                    if (ship && ship.status === 'in') {
                        // If a single shipment is found, show details modal similar to direct flow
                        await showShipmentDetailsForRelease(decodedText.trim());
                    } else {
                        throw new Error('No active shipment found with this barcode');
                    }
                } else {
                    // If results found, render via the existing search UI helper if available
                    if (typeof displayReleaseResults === 'function') {
                        displayReleaseResults(results);
                    }
                }
                if (typeof showMessage === 'function') {
                    showMessage(`🔍 Searched for: ${decodedText}`, 'info');
                }
            } else {
                throw new Error('Search function not available');
            }
        } catch (error) {
            console.error('Search error:', error);
            if (typeof showMessage === 'function') {
                showMessage('Search failed: ' + error.message, 'error');
            }
            this.playErrorSound();
        }
    }

    // Stop release scanner
    stopReleaseScanner() {
        if (this.releaseScanner) {
            try {
                this.releaseScanner.clear();
            } catch (error) {
                console.warn('Error clearing release scanner:', error);
            }
            this.releaseScanner = null;
        }
        
        this.isReleaseScanning = false;
        
        // Safely hide release scanner
        const releaseScanner = document.getElementById('release-scanner');
        if (releaseScanner) {
            releaseScanner.style.display = 'none';
        }
        
        // if (typeof showMessage === 'function') {
        //     showMessage('Release scanner stopped', 'info');
        // }
    }

    // Initialize direct release scanner
    initializeDirectReleaseScanner() {
        if (this.isDirectReleaseScanning) {
            this.stopDirectReleaseScanner();
            return;
        }

        try {
            const config = {
                fps: APP_CONFIG.SCANNER.fps,
                qrbox: APP_CONFIG.SCANNER.qrbox,
                aspectRatio: APP_CONFIG.SCANNER.aspectRatio,
                facingMode: "environment"
            };

            this.directReleaseScanner = new Html5QrcodeScanner(
                "directReleaseReader",
                config,
                /* verbose= */ false
            );

            this.directReleaseScanner.render(
                (decodedText, decodedResult) => {
                    this.onDirectReleaseScanSuccess(decodedText, decodedResult);
                },
                (error) => {
                    console.log(`Direct Release QR Code scan error: ${error}`);
                }
            );

            this.isDirectReleaseScanning = true;
            
            // Safely show/hide scanner elements
            const directReleaseScanner = document.getElementById('direct-release-scanner');
            const releaseScanner = document.getElementById('release-scanner');
            
            if (directReleaseScanner) {
                directReleaseScanner.style.display = 'block';
            }
            if (releaseScanner) {
                releaseScanner.style.display = 'none';
            }
            
            if (typeof showMessage === 'function') {
                showMessage('🚀 Direct Release Scanner Active! Scan to see shipment details.', 'success');
            }
            
        } catch (error) {
            console.error('Error initializing direct release scanner:', error);
            if (typeof showMessage === 'function') {
                showMessage('Error initializing direct release scanner', 'error');
            }
            this.playErrorSound();
        }
    }

    // Handle successful scan for direct release (show details first)
    onDirectReleaseScanSuccess(decodedText, decodedResult) {
        console.log(`Direct Release Scan successful: ${decodedText}`);
        this.playSuccessSound(); // Play success sound
        
        // Stop scanning immediately
        this.stopDirectReleaseScanner();
        
        // Show shipment details first, then offer release option
        showShipmentDetailsForRelease(decodedText.trim());
    }

    // Stop direct release scanner
    stopDirectReleaseScanner() {
        if (this.directReleaseScanner) {
            try {
                this.directReleaseScanner.clear();
            } catch (error) {
                console.warn('Error clearing direct release scanner:', error);
            }
            this.directReleaseScanner = null;
        }
        
        this.isDirectReleaseScanning = false;
        
        // Safely hide direct release scanner
        const directReleaseScanner = document.getElementById('direct-release-scanner');
        if (directReleaseScanner) {
            directReleaseScanner.style.display = 'none';
        }
        
        // if (typeof showMessage === 'function') {
        //     showMessage('Direct release scanner stopped', 'info');
        // }
    }

    // Stop all scanners
    stopAllScanners() {
        this.stopIntakeScanner();
        this.stopReleaseScanner();
        this.stopDirectReleaseScanner();
        this.stopLocationScanner(); // Add location scanner
    }

    // Initialize location assignment scanner
    async initializeLocationScanner() {
        if (this.isLocationScanning) {
            this.stopLocationScanner();
            return;
        }

        try {
            // Check camera permission first
            const hasPermission = await this.checkCameraPermission();
            if (!hasPermission) return;

            const config = {
                fps: APP_CONFIG.SCANNER.fps,
                qrbox: APP_CONFIG.SCANNER.qrbox,
                aspectRatio: APP_CONFIG.SCANNER.aspectRatio,
                facingMode: "environment"
            };

            this.locationScanner = new Html5QrcodeScanner(
                "locationReader",
                config,
                /* verbose= */ false
            );

            this.locationScanner.render(
                (decodedText, decodedResult) => {
                    this.onLocationScanSuccess(decodedText, decodedResult);
                },
                (error) => {
                    console.log(`Location QR scan error: ${error}`);
                }
            );

            this.isLocationScanning = true;
            
            console.log('Location assignment scanner initialized');
            
        } catch (error) {
            console.error('Error initializing location scanner:', error);
            if (typeof showMessage === 'function') {
                showMessage('Error initializing location scanner: ' + error.message, 'error');
            }
            this.playErrorSound();
        }
    }

    // Handle location scan success
    async onLocationScanSuccess(decodedText, decodedResult) {
        try {
            const qrData = decodedText.trim();
            console.log('Location QR scanned:', qrData);
            
            // Determine if this is a shipment piece QR or rack QR
            if (qrData.startsWith('PIECE_')) {
                // This is a shipment piece QR
                const success = await window.warehouseManager.processShipmentQRScan(qrData);
                if (success) {
                    this.playSuccessSound();
                }
            } else if (qrData.startsWith('RACK_')) {
                // This is a rack QR
                const success = await window.warehouseManager.processRackQRScan(qrData);
                if (success) {
                    this.playSuccessSound();
                    // Brief pause before ready for next scan
                    setTimeout(() => {
                        console.log('Ready for next shipment piece scan');
                    }, 1000);
                }
            } else {
                // Unknown QR format
                console.warn('Unknown QR format:', qrData);
                if (typeof showMessage === 'function') {
                    showMessage('❌ Unknown QR code format. Please scan a valid shipment piece or rack QR code.', 'error');
                }
                this.playErrorSound();
            }
            
        } catch (error) {
            console.error('Error processing location scan:', error);
            if (typeof showMessage === 'function') {
                showMessage('Error processing scan: ' + error.message, 'error');
            }
            this.playErrorSound();
        }
    }

    // Stop location scanner
    stopLocationScanner() {
        if (this.locationScanner) {
            try {
                this.locationScanner.clear();
            } catch (error) {
                console.warn('Error clearing location scanner:', error);
            }
            this.locationScanner = null;
        }
        
        this.isLocationScanning = false;
        
        console.log('Location assignment scanner stopped');
    }

    // Check if camera permission is available
    async checkCameraPermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (error) {
            console.error('Camera permission denied:', error);
            if (typeof showMessage === 'function') {
                showMessage('Camera permission is required for barcode scanning', 'error');
            }
            this.playErrorSound();
            return false;
        }
    }
}

// Global scanner instance
let barcodeScanner = new BarcodeScanner();

// ===================
// GLOBAL SCANNER FUNCTIONS
// ===================

// Scanner control functions (called from HTML)
async function toggleBarcodeScanner() {
    const hasPermission = await barcodeScanner.checkCameraPermission();
    if (hasPermission) {
        barcodeScanner.initializeIntakeScanner();
    }
}

function stopScanner() {
    barcodeScanner.stopIntakeScanner();
}

async function toggleReleaseScanner() {
    const hasPermission = await barcodeScanner.checkCameraPermission();
    if (hasPermission) {
        barcodeScanner.initializeReleaseScanner();
    }
}

function stopReleaseScanner() {
    barcodeScanner.stopReleaseScanner();
}

// Direct release scanner functions
function startDirectReleaseScanner() {
    barcodeScanner.initializeDirectReleaseScanner();
}

function stopDirectReleaseScanner() {
    barcodeScanner.stopDirectReleaseScanner();
}

function switchToSearchMode() {
    barcodeScanner.stopDirectReleaseScanner();
    toggleReleaseScanner();
}

function switchToDirectMode() {
    barcodeScanner.stopReleaseScanner();
    barcodeScanner.initializeDirectReleaseScanner();
}

// ===================
// SHIPMENT DETAILS DISPLAY FUNCTION
// ===================

// Show shipment details first, then offer release option
async function showShipmentDetailsForRelease(barcode) {
    try {
        showLoading(true);
        showMessage(`🔍 Loading shipment details for: ${barcode}`, 'info');
        
        // Search for the shipment in active shipments
        // Use exact matching for scanned barcodes
        let shipments = await dbManager.searchShipments(barcode, 'in', true);
        if (!shipments || shipments.length === 0) {
            const single = await dbManager.getShipmentByBarcode(barcode);
            shipments = single ? [single] : [];
        }
        
        if (!shipments || shipments.length === 0) {
            barcodeScanner.playErrorSound();
            throw new Error(`No active shipment found with barcode: ${barcode}`);
        }
        
        // Get the first matching shipment
        const shipment = shipments[0];
        
        // Calculate days in storage
        const inDate = new Date(shipment.in_date);
        const storageDays = Math.ceil((new Date() - inDate) / (1000 * 60 * 60 * 24));
        
        // Calculate charges
        const pricingSettings = warehouseApp.pricingSettings || APP_CONFIG.DEFAULT_PRICING;
        const charges = dbManager.calculateStorageCharges(shipment, pricingSettings);
        
        // Create detailed shipment info HTML
        const detailsHtml = `
            <div class="shipment-details-modal" onclick="closeShipmentDetailsOutside(event)" style="
                position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
                background: rgba(0,0,0,0.8); z-index: 10000; 
                display: flex; align-items: center; justify-content: center;
                font-family: 'Segoe UI', sans-serif;
            ">
                <div onclick="event.stopPropagation()" style="
                    background: white; border-radius: 12px; padding: 24px; 
                    max-width: 500px; width: 90%; max-height: 90%; overflow-y: auto;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                ">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h2 style="margin: 0; color: #1f2937; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <span style="font-size: 24px;">📦</span>
                            Shipment Details
                        </h2>
                    </div>
                    
                    <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                        <div style="display: grid; gap: 12px;">
                            <div><strong>Barcode:</strong> <span style="color: #059669; font-family: monospace;">${shipment.barcode}</span></div>
                            <div><strong>Shipper:</strong> ${shipment.shipper}</div>
                            <div><strong>Consignee:</strong> ${shipment.consignee}</div>
                            <div><strong>Weight:</strong> ${shipment.weight} kg</div>
                            <div><strong>Pieces:</strong> ${shipment.pieces}</div>
                            <div><strong>Rack Location:</strong> <span style="color: #7c3aed;">${shipment.rack}</span></div>
                            <div><strong>Storage Days:</strong> <span style="color: #dc2626;">${storageDays} days</span></div>
                            <div><strong>Total Charges:</strong> <span style="color: #059669; font-size: 18px; font-weight: bold;">KD ${(charges?.totalCharges || charges?.total_charges || 0).toFixed(3)}</span></div>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 12px; justify-content: center;">
                        <button onclick="processDirectRelease('${barcode}')" style="
                            background: #059669; color: white; border: none; padding: 12px 24px; 
                            border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 16px;
                            display: flex; align-items: center; gap: 8px;
                        ">
                            <span>🚀</span> Release & Generate Invoice
                        </button>
                        <button onclick="closeShipmentDetails()" style="
                            background: #6b7280; color: white; border: none; padding: 12px 24px; 
                            border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 16px;
                        ">
                            Cancel
                        </button>
                    </div>
                    
                    <div style="text-align: center; margin-top: 16px; font-size: 14px; color: #6b7280;">
                        Review the details above and click "Release" to proceed with invoice generation
                    </div>
                </div>
            </div>
        `;
        
        // Add to page
        document.body.insertAdjacentHTML('beforeend', detailsHtml);
        
    } catch (error) {
        console.error('Error showing shipment details:', error);
        showMessage(`❌ Error: ${error.message}`, 'error');
        barcodeScanner.playErrorSound();
        
        // Ask if user wants to try again
        setTimeout(() => {
            if (confirm('Shipment not found. Try scanning again?')) {
                startDirectReleaseScanner();
            }
        }, 2000);
    } finally {
        showLoading(false);
    }
}

// Close shipment details modal
function closeShipmentDetails() {
    const modal = document.querySelector('.shipment-details-modal');
    if (modal) {
        modal.remove();
    }
    
    // Ask if user wants to scan another
    if (confirm('🔍 Scan another shipment?')) {
        startDirectReleaseScanner();
    }
}

// Close modal when clicking outside
function closeShipmentDetailsOutside(event) {
    if (event.target.classList.contains('shipment-details-modal')) {
        closeShipmentDetails();
    }
}

// Process direct release after user confirms
async function processDirectRelease(barcode) {
    try {
        // Close the details modal
        closeShipmentDetails();
        
        showLoading(true);
        showMessage(`🚀 Processing release for: ${barcode}`, 'info');
        
        // Search for the shipment again
        // Use exact matching again
        let shipments = await dbManager.searchShipments(barcode, 'in', true);
        if (!shipments || shipments.length === 0) {
            const single = await dbManager.getShipmentByBarcode(barcode);
            shipments = single ? [single] : [];
        }
        if (!shipments || shipments.length === 0) {
            throw new Error(`Shipment not found: ${barcode}`);
        }
        
        // Process the release
        await releaseShipment(shipments[0].id);
        
        barcodeScanner.playSuccessSound();
        showMessage(`✅ Shipment ${barcode} released successfully! Invoice generated.`, 'success');
        
        // Ask if user wants to scan another
        setTimeout(() => {
            if (confirm('🚀 Scan another shipment for release?')) {
                startDirectReleaseScanner();
            }
        }, 2000);
        
    } catch (error) {
        console.error('Direct release error:', error);
        showMessage(`❌ Release failed: ${error.message}`, 'error');
        barcodeScanner.playErrorSound();
        
        // Ask if user wants to try again
        setTimeout(() => {
            if (confirm('Try again?')) {
                showShipmentDetailsForRelease(barcode);
            }
        }, 2000);
    } finally {
        showLoading(false);
    }
}

// Handle visibility change to pause/resume scanning
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Page is hidden, pause scanning to save resources
        if (barcodeScanner.isScanning || barcodeScanner.isReleaseScanning || barcodeScanner.isDirectReleaseScanning) {
            console.log('Page hidden, pausing scanners');
        }
    } else {
        // Page is visible again
        if (barcodeScanner.isScanning || barcodeScanner.isReleaseScanning || barcodeScanner.isDirectReleaseScanning) {
            console.log('Page visible, resuming scanners');
        }
    }
});