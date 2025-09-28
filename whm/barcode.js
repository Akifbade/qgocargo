// Barcode Scanner Management
class BarcodeScanner {
    constructor() {
        this.html5QrcodeScanner = null;
        this.releaseScanner = null;
        this.isScanning = false;
        this.isReleaseScanning = false;
    }

    // Initialize intake barcode scanner
    initializeIntakeScanner() {
        if (this.isScanning) {
            this.stopIntakeScanner();
            return;
        }

        try {
            const config = {
                fps: APP_CONFIG.SCANNER.fps,
                qrbox: APP_CONFIG.SCANNER.qrbox,
                aspectRatio: APP_CONFIG.SCANNER.aspectRatio
            };

            this.html5QrcodeScanner = new Html5QrcodeScanner(
                "reader",
                config,
                /* verbose= */ false
            );

            this.html5QrcodeScanner.render(
                (decodedText, decodedResult) => {
                    this.onIntakeScanSuccess(decodedText, decodedResult);
                },
                (error) => {
                    // Handle scan failure, usually better to ignore
                    console.log(`QR Code scan error: ${error}`);
                }
            );

            this.isScanning = true;
            document.getElementById('barcode-scanner').style.display = 'block';
            showMessage('Barcode scanner started. Position barcode in the frame.', 'info');
            
        } catch (error) {
            console.error('Error initializing scanner:', error);
            showMessage('Error initializing barcode scanner', 'error');
        }
    }

    // Handle successful scan for intake
    onIntakeScanSuccess(decodedText, decodedResult) {
        console.log(`Barcode scanned: ${decodedText}`);
        
        // Fill the barcode field
        document.getElementById('barcode').value = decodedText;
        
        // Stop scanning
        this.stopIntakeScanner();
        
        // Show success message
        showMessage(`Barcode scanned: ${decodedText}`, 'success');
        
        // Focus on the next field
        document.getElementById('shipper').focus();
    }

    // Stop intake scanner
    stopIntakeScanner() {
        if (this.html5QrcodeScanner) {
            this.html5QrcodeScanner.clear().then(() => {
                console.log('Scanner stopped successfully');
            }).catch(error => {
                console.error('Error stopping scanner:', error);
            });
            
            this.html5QrcodeScanner = null;
        }
        
        this.isScanning = false;
        document.getElementById('barcode-scanner').style.display = 'none';
    }

    // Initialize release barcode scanner
    initializeReleaseScanner() {
        if (this.isReleaseScanning) {
            this.stopReleaseScanner();
            return;
        }

        try {
            const config = {
                fps: APP_CONFIG.SCANNER.fps,
                qrbox: APP_CONFIG.SCANNER.qrbox,
                aspectRatio: APP_CONFIG.SCANNER.aspectRatio
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
                    // Handle scan failure
                    console.log(`QR Code scan error: ${error}`);
                }
            );

            this.isReleaseScanning = true;
            document.getElementById('release-scanner').style.display = 'block';
            showMessage('Release scanner started. Scan barcode to find shipment.', 'info');
            
        } catch (error) {
            console.error('Error initializing release scanner:', error);
            showMessage('Error initializing release scanner', 'error');
        }
    }

    // Handle successful scan for release
    async onReleaseScanSuccess(decodedText, decodedResult) {
        console.log(`Release barcode scanned: ${decodedText}`);
        
        // Stop scanning
        this.stopReleaseScanner();
        
        // Search for the shipment
        document.getElementById('releaseSearch').value = decodedText;
        
        try {
            showLoading(true);
            
            // Search for shipment by barcode
            const shipment = await dbManager.getShipmentByBarcode(decodedText);
            
            if (shipment && shipment.status === 'in') {
                // Display the shipment for release
                displayReleaseResults([shipment]);
                showMessage(`Shipment found: ${decodedText}`, 'success');
            } else if (shipment && shipment.status === 'out') {
                showMessage('This shipment has already been released', 'error');
            } else {
                showMessage('No active shipment found with this barcode', 'error');
                document.getElementById('releaseResults').innerHTML = '<p class="no-results">No shipment found with this barcode</p>';
            }
            
        } catch (error) {
            console.error('Error searching for shipment:', error);
            showMessage('Error searching for shipment', 'error');
        } finally {
            showLoading(false);
        }
    }

    // Stop release scanner
    stopReleaseScanner() {
        if (this.releaseScanner) {
            this.releaseScanner.clear().then(() => {
                console.log('Release scanner stopped successfully');
            }).catch(error => {
                console.error('Error stopping release scanner:', error);
            });
            
            this.releaseScanner = null;
        }
        
        this.isReleaseScanning = false;
        document.getElementById('release-scanner').style.display = 'none';
    }

    // Stop all scanners
    stopAllScanners() {
        this.stopIntakeScanner();
        this.stopReleaseScanner();
    }

    // Check if camera permission is available
    async checkCameraPermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (error) {
            console.error('Camera permission denied:', error);
            showMessage('Camera permission is required for barcode scanning', 'error');
            return false;
        }
    }
}

// Global scanner instance
let barcodeScanner = new BarcodeScanner();

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

// Clean up scanners when page is unloaded
window.addEventListener('beforeunload', () => {
    barcodeScanner.stopAllScanners();
});

// Handle visibility change to pause/resume scanning
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Page is hidden, pause scanning to save resources
        if (barcodeScanner.isScanning || barcodeScanner.isReleaseScanning) {
            console.log('Page hidden, pausing scanners');
        }
    } else {
        // Page is visible again
        if (barcodeScanner.isScanning || barcodeScanner.isReleaseScanning) {
            console.log('Page visible, resuming scanners');
        }
    }
});