// Mobile Warehouse Scanner Application
class MobileWarehouseScanner {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.scanner = null;
        this.isScanning = false;
        this.scanningStep = 1; // 1 = package, 2 = rack
        this.pendingShipment = null;
        this.recentScans = [];
        
        // Audio context for beep sounds
        this.audioContext = null;
        this.initializeAudio();
        
        this.initializeApp();
    }

    // Initialize audio context for beep sounds
    initializeAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('Audio context initialized for beep sounds');
        } catch (error) {
            console.warn('Audio context not supported:', error);
            this.audioContext = null;
        }
    }

    // Play beep sound(s)
    playBeep(count = 1, frequency = 800, duration = 200) {
        if (!this.audioContext) {
            console.warn('Audio context not available for beeps');
            return;
        }

        // Resume audio context if suspended (required by some browsers)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);

                oscillator.frequency.value = frequency;
                oscillator.type = 'square'; // Square wave for sharp beep

                gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration / 1000);

                oscillator.start(this.audioContext.currentTime);
                oscillator.stop(this.audioContext.currentTime + duration / 1000);
            }, i * (duration + 100)); // 100ms gap between beeps
        }
    }

    // Show popup success notification
    showSuccessPopup(title, message) {
        // Create popup overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        // Create popup content
        const popup = document.createElement('div');
        popup.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 15px;
            text-align: center;
            max-width: 90%;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            animation: popupBounce 0.3s ease-out;
        `;

        popup.innerHTML = `
            <style>
                @keyframes popupBounce {
                    0% { transform: scale(0.7); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }
            </style>
            <div style="font-size: 48px; margin-bottom: 15px;">✅</div>
            <h2 style="color: #059669; margin: 0 0 15px 0; font-size: 24px;">${title}</h2>
            <p style="color: #374151; margin: 0; font-size: 18px; line-height: 1.4;">${message}</p>
            <button id="popupClose" style="
                margin-top: 20px;
                padding: 12px 24px;
                background: #059669;
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
            ">OK</button>
        `;

        overlay.appendChild(popup);
        document.body.appendChild(overlay);

        // Auto close after 3 seconds or on button click
        const closePopup = () => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        };

        document.getElementById('popupClose').addEventListener('click', closePopup);
        setTimeout(closePopup, 3000);

        return overlay;
    }

    async initializeApp() {
        try {
            console.log('Initializing mobile scanner app...');
            
            // Direct config check - should be available immediately
            if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
                console.error('Supabase config missing');
                console.log('Available config:', {
                    url: window.SUPABASE_URL,
                    key: window.SUPABASE_ANON_KEY ? 'Present' : 'Missing',
                    config: window.SUPABASE_CONFIG
                });
                this.showMessage('Configuration missing. Please check setup.', 'error');
                return;
            }
            
            console.log('Config found, initializing Supabase...');
            console.log('Using URL:', window.SUPABASE_URL);
            
            // Initialize Supabase directly
            if (!window.supabase || !window.supabase.createClient) {
                console.error('Supabase library not available');
                this.showMessage('Supabase library not loaded. Please refresh the page.', 'error');
                return;
            }

            this.supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
            console.log('Supabase client created successfully');

            // Test connection
            try {
                const { data, error } = await this.supabase.auth.getSession();
                console.log('Connection test successful');
                
                if (data.session) {
                    console.log('User already logged in');
                    this.handleLoginSuccess(data.session.user);
                }
            } catch (testError) {
                console.error('Connection test failed:', testError);
                this.showMessage('Connection test failed. Check your internet connection.', 'error');
                return;
            }

            // Setup auth listener
            this.supabase.auth.onAuthStateChange((event, session) => {
                console.log('Auth state changed:', event);
                if (event === 'SIGNED_IN') {
                    this.handleLoginSuccess(session.user);
                } else if (event === 'SIGNED_OUT') {
                    this.handleLogout();
                }
            });

            console.log('Mobile scanner app initialized successfully');
            this.showMessage('System ready. You can now login.', 'success');
            
        } catch (error) {
            console.error('Error initializing app:', error);
            this.showMessage('Failed to initialize: ' + error.message, 'error');
        }
    }

    async workerLogin() {
        try {
            const email = document.getElementById('workerEmail').value.trim();
            const password = document.getElementById('workerPassword').value;

            if (!email || !password) {
                this.showMessage('Please enter email and password', 'error');
                return;
            }

            // Enable audio context on user interaction
            if (this.audioContext && this.audioContext.state === 'suspended') {
                try {
                    await this.audioContext.resume();
                    console.log('Audio context resumed for beeps');
                } catch (error) {
                    console.warn('Could not resume audio context:', error);
                }
            }

            if (!this.supabase) {
                console.error('Supabase client not initialized');
                this.showMessage('System not ready. Please refresh the page and try again.', 'error');
                return;
            }

            console.log('Attempting login for:', email);
            this.showMessage('Logging in...', 'info');

            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                console.error('Login error:', error);
                throw error;
            }

            console.log('Login successful:', data);
            this.showMessage('Login successful!', 'success');
            
        } catch (error) {
            console.error('Login error:', error);
            let errorMessage = 'Login failed: ';
            
            if (error.message.includes('Invalid login credentials')) {
                errorMessage += 'Invalid email or password';
            } else if (error.message.includes('Email not confirmed')) {
                errorMessage += 'Please confirm your email address';
            } else {
                errorMessage += error.message;
            }
            
            this.showMessage(errorMessage, 'error');
        }
    }

    handleLoginSuccess(user) {
        this.currentUser = user;
        
        // Update UI
        document.getElementById('userInfo').textContent = `Welcome, ${user.email}`;
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('scannerInterface').style.display = 'block';
        document.querySelector('.logout-btn').classList.remove('hidden');

        // Load recent scans
        this.loadRecentScans();

        this.showMessage('Welcome! Ready to scan packages.', 'success');
    }

    async logout() {
        try {
            await this.supabase.auth.signOut();
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    handleLogout() {
        this.currentUser = null;
        this.stopScanning();
        
        // Reset UI
        document.getElementById('userInfo').textContent = '';
        document.getElementById('scannerInterface').style.display = 'none';
        document.getElementById('loginScreen').classList.remove('hidden');
        document.querySelector('.logout-btn').classList.add('hidden');
        
        // Clear form
        document.getElementById('workerEmail').value = '';
        document.getElementById('workerPassword').value = '';
        
        this.showMessage('Logged out successfully', 'info');
    }

    async startScanning() {
        try {
            if (this.isScanning) {
                this.stopScanning();
                return;
            }

            // Check camera permission
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop());

            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
                facingMode: "environment"
            };

            this.scanner = new Html5QrcodeScanner("mobileReader", config, false);
            
            this.scanner.render(
                (decodedText, decodedResult) => {
                    this.handleScanSuccess(decodedText, decodedResult);
                },
                (error) => {
                    // Improved error handling - only log significant errors
                    if (error && !error.includes('No MultiFormat Readers') && !error.includes('NotFoundException')) {
                        console.warn('Scan error:', error);
                    }
                    // Don't show error messages for normal scanning failures
                }
            );

            this.isScanning = true;
            document.getElementById('startScanBtn').classList.add('hidden');
            document.getElementById('stopScanBtn').classList.remove('hidden');
            
            this.updateScannerStatus('📷 Camera active - Point at QR code');

        } catch (error) {
            console.error('Error starting scanner:', error);
            this.showMessage('Camera access denied. Please allow camera permission.', 'error');
        }
    }

    stopScanning() {
        if (this.scanner) {
            this.scanner.clear();
            this.scanner = null;
        }
        
        this.isScanning = false;
        document.getElementById('startScanBtn').classList.remove('hidden');
        document.getElementById('stopScanBtn').classList.add('hidden');
        
        this.updateScannerStatus('Scanner stopped. Click "Start Scanning" to resume.');
    }

    async handleScanSuccess(decodedText, decodedResult) {
        try {
            const qrData = decodedText.trim();
            
            // Enhanced QR code validation
            if (qrData.length < 5) {
                console.warn('QR code too short:', qrData);
                this.showMessage('❌ Invalid QR code - too short', 'error');
                return;
            }

            console.log('✅ QR scanned:', qrData);

            // Vibrate if available
            if (navigator.vibrate) {
                navigator.vibrate(100);
            }

            if (this.scanningStep === 1) {
                // Step 1: Scan package QR - Accept multiple formats
                if (qrData.startsWith('PIECE_')) {
                    // Full piece QR format: PIECE_WH2510029740_001
                    await this.handlePackageScan(qrData);
                } else if (qrData.match(/^WH\d{10}$/)) {
                    // Just barcode format: WH2510029740 - convert to piece format
                    const pieceQR = `PIECE_${qrData}_001`; // Assume piece 1
                    console.log('📦 Converting barcode to piece QR:', pieceQR);
                    await this.handlePackageScan(pieceQR);
                } else if (qrData.startsWith('RACK_')) {
                    this.showMessage('❌ Please scan a PACKAGE QR code first, not a rack QR code', 'error');
                    return;
                } else {
                    this.showMessage('❌ Invalid package QR code. Please scan a shipment barcode or PIECE QR code.', 'error');
                    return;
                }
            } else if (this.scanningStep === 2) {
                // Step 2: Scan rack QR
                if (!qrData.startsWith('RACK_')) {
                    this.showMessage('❌ Please scan a RACK QR code now (starts with RACK_)', 'error');
                    return;
                }
                await this.handleRackScan(qrData);
            }

        } catch (error) {
            console.error('Error handling scan:', error);
            this.showMessage('Error processing scan: ' + error.message, 'error');
        }
    }

    async handlePackageScan(qrData) {
        try {
            console.log('🔍 Package scan received:', qrData);
            
            // Check if it's a regular shipment barcode (not piece QR)
            if (!qrData.startsWith('PIECE_') && qrData.match(/^WH\d{10}$/)) {
                // This is a shipment barcode, help user create piece QR
                const pieces = prompt(`📦 You scanned shipment barcode: ${qrData}\n\nThis will COPY ALL PIECES in the shipment.\nHow many pieces are in this shipment?`, '1');
                
                if (!pieces || isNaN(pieces) || pieces < 1) {
                    this.showMessage('❌ Invalid piece count. Please try again.', 'error');
                    return;
                }
                
                const pieceCount = parseInt(pieces);
                const pieceOptions = [];
                for (let i = 1; i <= pieceCount; i++) {
                    pieceOptions.push(`${i}. PIECE_${qrData}_${String(i).padStart(3, '0')}`);
                }
                
                const choice = prompt(`Select ANY piece to COPY ALL ${pieceCount} pieces:\n\n${pieceOptions.join('\n')}\n\nEnter piece number (1-${pieceCount}):`);
                
                if (!choice || isNaN(choice) || choice < 1 || choice > pieceCount) {
                    this.showMessage('❌ Invalid piece selection. Please try again.', 'error');
                    return;
                }
                
                const selectedPiece = parseInt(choice);
                const pieceQR = `PIECE_${qrData}_${String(selectedPiece).padStart(3, '0')}`;
                
                console.log('🔄 Converting barcode to piece QR (will copy ALL pieces):', pieceQR);
                return this.handlePackageScan(pieceQR); // Recursive call with piece QR
            }
            
            // Validate package QR format
            if (!qrData.startsWith('PIECE_')) {
                this.showMessage(`❌ Invalid QR code format. Scanned: "${qrData}"\n\n💡 Expected formats:\n• PIECE_WH2510029866_001 (piece QR)\n• WH2510029866 (will convert to piece QR)`, 'error');
                return;
            }

            // Parse piece QR - Updated regex to be more flexible
            const match = qrData.match(/^PIECE_([A-Z0-9]+)_(\d{3})$/);
            if (!match) {
                // Show more detailed error with what was expected vs received
                this.showMessage(`❌ Invalid package QR format. Scanned: "${qrData}". Expected format: "PIECE_BARCODE_001"`, 'error');
                console.log('❌ QR format mismatch:', {
                    scanned: qrData,
                    expected: 'PIECE_BARCODE_001',
                    regex: '^PIECE_([A-Z0-9]+)_(\\d{3})$'
                });
                return;
            }

            const barcode = match[1];
            const pieceNumber = parseInt(match[2]);
            
            console.log('✅ QR parsed successfully:', { barcode, pieceNumber });

            // Find shipment in database
            const { data: shipment, error } = await this.supabase
                .from('shipments')
                .select('*')
                .eq('barcode', barcode)
                .single();

            if (error || !shipment) {
                this.showMessage('❌ Package not found in system', 'error');
                return;
            }

            // Check if shipment is ready for location assignment (exclude only problematic statuses)
            const excludedStatuses = ['out', 'released', 'cancelled', 'deleted'];
            if (excludedStatuses.includes(shipment.status)) {
                this.showMessage(`❌ Package status "${shipment.status}" cannot be assigned to location. This shipment has already been processed.`, 'error');
                return;
            }

            console.log(`✅ Shipment status "${shipment.status}" is valid for location assignment`);

            // Store pending shipment (COPY ALL PIECES OPERATION)
            // When scanning any piece QR, copy ALL pieces of the shipment
            const allPieces = [];
            for (let i = 1; i <= shipment.pieces; i++) {
                allPieces.push({
                    pieceNumber: i,
                    pieceQR: `PIECE_${barcode}_${String(i).padStart(3, '0')}`,
                    isCurrentlyScanned: i === pieceNumber
                });
            }
            
            this.pendingShipment = {
                shipment: shipment,
                allPieces: allPieces,
                scannedPieceQR: qrData,
                scannedPieceNumber: pieceNumber,
                barcode: barcode,
                totalPieces: shipment.pieces
            };

            // Update UI with COPY ALL PIECES messaging
            this.updateSteps(1, 'completed');
            this.updateSteps(2, 'active');
            this.scanningStep = 2;

            // Show shipment info with ALL PIECES COPIED messaging
            this.displayShipmentInfo(shipment, pieceNumber);
            this.updateScannerStatus(`📋 COPIED ALL ${shipment.pieces} PIECES: ${shipment.sender_name}\n🎯 Now SCAN RACK to PASTE all pieces there!`);

            this.showMessage(`📋 ALL PIECES COPIED TO MEMORY!\n\n📦 ${shipment.sender_name}\n🔢 ALL ${shipment.pieces} pieces (scanned piece ${pieceNumber})\n💼 ${barcode}\n\n🎯 Next: Scan rack QR to PASTE ALL pieces`, 'success');

            // 🔊 COPY SUCCESS: 1 LOUD BEEP + POPUP
            this.playBeep(1, 800, 300); // 1 beep, 800Hz, 300ms duration
            this.showSuccessPopup(
                'PACKAGE COPIED!', 
                `📋 ${shipment.pieces} pieces copied to memory\n\n📦 ${shipment.sender_name}\n\n🎯 Now scan rack QR to paste all pieces`
            );

            // Vibrate for additional feedback
            if (navigator.vibrate) {
                navigator.vibrate([200, 100, 200]);
            }

        } catch (error) {
            console.error('Error handling package scan:', error);
            this.showMessage('Error processing package scan: ' + error.message, 'error');
        }
    }

    async handleRackScan(qrData) {
        try {
            if (!this.pendingShipment) {
                this.showMessage('❌ Please COPY a package first by scanning package QR code', 'error');
                return;
            }

            // Validate rack QR format
            if (!qrData.startsWith('RACK_')) {
                this.showMessage('❌ Invalid rack QR code. Please scan a rack QR code.', 'error');
                return;
            }

            // Parse rack QR
            const rackId = qrData.replace('RACK_', '').replace(/_/g, '-');
            
            // Show PASTE operation feedback
            this.showMessage(`📋➡️📍 PASTING ALL ${this.pendingShipment.totalPieces} PIECES to rack ${rackId}...`, 'info');

            // Stop scanning immediately to prevent multiple scans
            this.stopScanning();

            // Assign ALL pieces to rack (PASTE ALL OPERATION)
            await this.assignAllPiecesToRack(this.pendingShipment, rackId, qrData);

        } catch (error) {
            console.error('Error handling rack scan:', error);
            this.showMessage('Error processing rack scan: ' + error.message, 'error');
            
            // Stop scanning on error too
            this.stopScanning();
        }
    }

    async assignAllPiecesToRack(shipmentData, rackId, rackQR) {
        try {
            const { shipment, allPieces, scannedPieceNumber, totalPieces } = shipmentData;

            // Get current piece locations - with fallback for missing column
            let { data: existingData, error: fetchError } = await this.supabase
                .from('shipments')
                .select('rack, piece_locations')
                .eq('id', shipment.id)
                .single();

            // If piece_locations column doesn't exist, fall back to simpler approach
            if (fetchError && fetchError.code === '42703') {
                console.warn('piece_locations column not found, using fallback approach');
                
                // Simple fallback: just update the main rack field
                const { error: updateError } = await this.supabase
                    .from('shipments')
                    .update({
                        rack: rackId,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', shipment.id);

                if (updateError) throw updateError;

                console.log('✅ Fallback: Updated main rack field only');
                
            } else {
                // Full approach with piece_locations
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

                // Assign ALL pieces to the same rack
                allPieces.forEach(piece => {
                    pieceLocations[`piece_${piece.pieceNumber}`] = {
                        rackId: rackId,
                        assignedAt: new Date().toISOString(),
                        pieceQR: piece.pieceQR,
                        assignedBy: this.currentUser.email,
                        assignedVia: piece.isCurrentlyScanned ? 'direct_scan' : 'bulk_assign'
                    };
                });

                // Set main rack for the shipment
                const mainRack = rackId;

                // Update database with ALL pieces assigned
                const { error: updateError } = await this.supabase
                    .from('shipments')
                    .update({
                        rack: mainRack,
                        piece_locations: JSON.stringify(pieceLocations),
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', shipment.id);

                if (updateError) throw updateError;

                console.log('✅ Full approach: Updated with piece locations');
            }

            // Success! (ALL PIECES PASTED) - STOP SCANNING
            this.stopScanning();
            this.updateSteps(2, 'completed');
            this.updateSteps(3, 'active');

            const assignmentRecord = {
                barcode: shipment.barcode,
                totalPieces: totalPieces,
                scannedPiece: scannedPieceNumber,
                rackId: rackId,
                shipper: shipment.shipper,
                consignee: shipment.consignee,
                timestamp: new Date()
            };

            this.addToRecentScans(assignmentRecord);
            this.updateScannerStatus('✅ ALL PIECES PASTED! Ready for next COPY operation.');

            this.showMessage(`✅ ALL PIECES PASTED SUCCESSFULLY!\n\n📦 ${shipment.sender_name}\n🔢 ALL ${totalPieces} pieces assigned\n📍 Rack ${rackId}\n\n🎯 Ready to COPY next shipment!`, 'success');

            // 🔊 PASTE SUCCESS: 3 LOUD BEEPS + POPUP
            this.playBeep(3, 1000, 400); // 3 beeps, 1000Hz, 400ms duration each
            this.showSuccessPopup(
                'ALL PIECES PASTED!',
                `✅ ${totalPieces} pieces successfully assigned\n\n📦 ${shipment.sender_name}\n📍 Rack ${rackId}\n\n🎯 Ready for next COPY operation!`
            );

            // Enhanced vibrate for success
            if (navigator.vibrate) {
                navigator.vibrate([200, 100, 200, 100, 200, 100, 200]);
            }

            // Reset for next scan after 3 seconds
            setTimeout(() => {
                this.resetForNextScan();
            }, 3000);

        } catch (error) {
            console.error('Error assigning all pieces to rack:', error);
            this.showMessage('Error assigning all pieces: ' + error.message, 'error');
            
            // Stop scanning on error too
            this.stopScanning();
        }
    }

    // Stop the QR scanner
    stopScanning() {
        if (this.scanner && this.isScanning) {
            try {
                this.scanner.stop();
                console.log('📱 Scanner stopped successfully');
            } catch (error) {
                console.warn('Error stopping scanner:', error);
            }
            this.isScanning = false;
        }
    }

    // Reset for next scanning session
    resetForNextScan() {
        // Clear pending shipment data
        this.pendingShipment = null;
        this.scanningStep = 1;
        
        // Reset UI
        this.updateSteps(1, 'active');
        this.updateSteps(2, '');
        this.updateSteps(3, '');
        
        // Reset scanner status
        this.updateScannerStatus('Ready to scan package QR code...');
        
        console.log('🔄 Reset for next scan');
    }

    // Keep the old method for backward compatibility (but not used anymore)
    async assignPackageToRack(shipmentData, rackId, rackQR) {
        try {
            const { shipment, pieceQR, pieceNumber } = shipmentData;

            // Get current piece locations
            const { data: existingData, error: fetchError } = await this.supabase
                .from('shipments')
                .select('rack, piece_locations')
                .eq('id', shipment.id)
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
            pieceLocations[`piece_${pieceNumber}`] = {
                rackId: rackId,
                assignedAt: new Date().toISOString(),
                pieceQR: pieceQR,
                assignedBy: this.currentUser.email
            };

            // Update main rack if this is the first piece
            let mainRack = existingData.rack;
            if (!mainRack || mainRack === 'UNASSIGNED') {
                mainRack = rackId;
            }

            // Update database
            const { error: updateError } = await this.supabase
                .from('shipments')
                .update({
                    rack: mainRack,
                    piece_locations: JSON.stringify(pieceLocations),
                    updated_at: new Date().toISOString()
                })
                .eq('id', shipment.id);

            if (updateError) throw updateError;

            // Success! (PASTE COMPLETED)
            this.updateSteps(2, 'completed');
            this.updateSteps(3, 'active');

            const assignmentRecord = {
                barcode: shipment.barcode,
                pieceNumber: pieceNumber,
                rackId: rackId,
                shipper: shipment.shipper,
                consignee: shipment.consignee,
                timestamp: new Date()
            };

            this.addToRecentScans(assignmentRecord);
            this.updateScannerStatus('✅ PASTE COMPLETE! Ready for next COPY operation.');

            this.showMessage(`✅ PASTED SUCCESSFULLY!\n\n📦 ${shipment.sender_name}\n🔢 Piece ${pieceNumber}\n📍 Rack ${rackId}\n\n🎯 Ready to COPY next shipment!`, 'success');

            // Vibrate for success
            if (navigator.vibrate) {
                navigator.vibrate([100, 50, 100]);
            }

            // Reset for next scan after 3 seconds
            setTimeout(() => {
                this.resetForNextScan();
            }, 3000);

        } catch (error) {
            console.error('Error assigning package to rack:', error);
            this.showMessage('Error assigning package: ' + error.message, 'error');
        }
    }

    updateSteps(stepNumber, status) {
        const step = document.getElementById(`step${stepNumber}`);
        step.className = 'step';
        if (status) {
            step.classList.add(status);
        }
    }

    displayShipmentInfo(shipment, pieceNumber) {
        document.getElementById('infoBarcode').textContent = shipment.barcode;
        document.getElementById('infoPiece').textContent = `${pieceNumber}/${shipment.pieces}`;
        document.getElementById('infoShipper').textContent = shipment.shipper;
        document.getElementById('infoConsignee').textContent = shipment.consignee;
        
        document.getElementById('shipmentInfo').classList.remove('hidden');
    }

    updateScannerStatus(message) {
        const statusEl = document.getElementById('scannerStatus');
        statusEl.innerHTML = `<strong>${message}</strong>`;
    }

    addToRecentScans(record) {
        this.recentScans.unshift(record);
        if (this.recentScans.length > 10) {
            this.recentScans = this.recentScans.slice(0, 10);
        }
        this.updateRecentScansDisplay();
    }

    updateRecentScansDisplay() {
        const container = document.getElementById('recentScansList');
        
        if (this.recentScans.length === 0) {
            container.innerHTML = '<p style="color: #6b7280; text-align: center; font-style: italic;">No recent assignments</p>';
            return;
        }

        container.innerHTML = this.recentScans.map(scan => `
            <div class="scan-item">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${scan.barcode}-${String(scan.pieceNumber).padStart(3, '0')}</strong>
                        <div style="font-size: 0.8rem; color: #6b7280;">
                            ${scan.shipper} → ${scan.consignee}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-weight: 600; color: #059669;">📍 ${scan.rackId}</div>
                        <div class="scan-time">${this.formatTime(scan.timestamp)}</div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async loadRecentScans() {
        // Load recent assignments from database if needed
        // For now, start with empty array
        this.recentScans = [];
        this.updateRecentScansDisplay();
    }

    formatTime(date) {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    showMessage(message, type = 'info') {
        const container = document.getElementById('messageContainer');
        
        const messageEl = document.createElement('div');
        messageEl.className = `message message-${type}`;
        messageEl.textContent = message;
        
        container.appendChild(messageEl);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 5000);
    }

    // Debug function to check system status
    debugSystem() {
        console.log('=== MOBILE SCANNER DEBUG ===');
        console.log('window.SUPABASE_CONFIG:', window.SUPABASE_CONFIG);
        console.log('window.SUPABASE_URL:', window.SUPABASE_URL);
        console.log('window.SUPABASE_ANON_KEY:', window.SUPABASE_ANON_KEY ? 'Present' : 'Missing');
        console.log('window.supabase:', typeof window.supabase);
        console.log('window.supabase.createClient:', typeof window.supabase?.createClient);
        console.log('this.supabase:', this.supabase ? 'Initialized' : 'Not initialized');
        console.log('Current user:', this.currentUser);
        
        let status = '🔧 System Status:\n\n';
        status += `Config object: ${window.SUPABASE_CONFIG ? '✅' : '❌'}\n`;
        status += `URL: ${window.SUPABASE_URL ? '✅' : '❌'}\n`;
        status += `Key: ${window.SUPABASE_ANON_KEY ? '✅' : '❌'}\n`;
        status += `Supabase library: ${window.supabase ? '✅' : '❌'}\n`;
        status += `createClient method: ${window.supabase?.createClient ? '✅' : '❌'}\n`;
        status += `Client initialized: ${this.supabase ? '✅' : '❌'}\n`;
        status += `User logged in: ${this.currentUser ? '✅' : '❌'}\n`;
        
        alert(status);
        
        if (!this.supabase && window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
            this.showMessage('Attempting to reinitialize system...', 'info');
            this.initializeApp();
        }
    }

    // Test with sample QR codes
    testSampleQR() {
        const sampleQRs = [
            'PIECE_WH2510029740_001',
            'WH2510029740',
            'RACK_A_01_01',
            'RACK_B_05_03'
        ];
        
        const choice = prompt(`Test QR codes:\n\n1. ${sampleQRs[0]} (Full piece QR)\n2. ${sampleQRs[1]} (Just barcode)\n3. ${sampleQRs[2]} (Rack QR)\n4. ${sampleQRs[3]} (Rack QR)\n\nEnter number (1-4) or type your own QR code:`);
        
        if (!choice) return;
        
        let testQR;
        const num = parseInt(choice);
        if (num >= 1 && num <= 4) {
            testQR = sampleQRs[num - 1];
        } else {
            testQR = choice;
        }
        
        console.log('🧪 Testing QR code:', testQR);
        this.handleScanSuccess(testQR, {});
    }

    // Test beep sounds
    testBeepSounds() {
        const choice = prompt('Test beep sounds:\n\n1. COPY beep (1 beep)\n2. PASTE beep (3 beeps)\n\nEnter number (1-2):');
        
        if (choice === '1') {
            this.playBeep(1, 800, 300);
            this.showSuccessPopup('COPY BEEP TEST', 'Testing 1 beep for COPY operation');
        } else if (choice === '2') {
            this.playBeep(3, 1000, 400);
            this.showSuccessPopup('PASTE BEEP TEST', 'Testing 3 beeps for PASTE operation');
        }
    }

    // Show QR code format requirements
    showQRFormats() {
        const formats = `📋 QR Code Formats:

📦 PACKAGE QR CODES (Any of these formats):
Format 1: PIECE_BARCODE_XXX
Example: PIECE_WH2510029740_001

Format 2: Just the barcode
Example: WH2510029740
(System will auto-convert to piece format)

🏢 RACK QR CODES:
Format: RACK_Z_XX_XX
Example: RACK_A_01_01
- Must start with "RACK_"
- Zone letter (A-T)
- Row number (01-10)
- Column number (01-10)

📱 SCANNING WORKFLOW:
1. Login to mobile scanner
2. Scan package QR or barcode first
3. Then scan rack QR
4. All pieces will be assigned automatically

💡 TIP: You can scan either the full PIECE QR code or just the shipment barcode!`;

        alert(formats);
    }
}

// Global functions for HTML onclick handlers
let mobileScanner;

function workerLogin() {
    mobileScanner.workerLogin();
}

function logout() {
    mobileScanner.logout();
}

function startScanning() {
    mobileScanner.startScanning();
}

function stopScanning() {
    mobileScanner.stopScanning();
}

function debugSystem() {
    mobileScanner.debugSystem();
}

function testBeepSounds() {
    mobileScanner.testBeepSounds();
}

function testSampleQR() {
    mobileScanner.testSampleQR();
}

function showQRFormats() {
    mobileScanner.showQRFormats();
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    mobileScanner = new MobileWarehouseScanner();
});

// Handle enter key in login form
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !document.getElementById('loginScreen').classList.contains('hidden')) {
        workerLogin();
    }
});