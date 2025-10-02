// Custom Rack Manager - Your Warehouse Configuration
class CustomRackManager {
    constructor() {
        this.customRacks = [];
        this.initializeCustomRacks();
    }

    // Initialize with YOUR warehouse rack numbers
    initializeCustomRacks() {
        // Add your actual warehouse rack numbers here
        // Example format - replace with your real rack numbers
        
        const warehouseRacks = [
            // Ground Floor - Section A
            'A-001', 'A-002', 'A-003', 'A-004', 'A-005', 'A-006', 'A-007', 'A-008', 'A-009', 'A-010',
            'A-011', 'A-012', 'A-013', 'A-014', 'A-015', 'A-016', 'A-017', 'A-018', 'A-019', 'A-020',
            
            // Ground Floor - Section B
            'B-001', 'B-002', 'B-003', 'B-004', 'B-005', 'B-006', 'B-007', 'B-008', 'B-009', 'B-010',
            'B-011', 'B-012', 'B-013', 'B-014', 'B-015', 'B-016', 'B-017', 'B-018', 'B-019', 'B-020',
            
            // Second Floor - Section C
            'C-001', 'C-002', 'C-003', 'C-004', 'C-005', 'C-006', 'C-007', 'C-008', 'C-009', 'C-010',
            'C-011', 'C-012', 'C-013', 'C-014', 'C-015', 'C-016', 'C-017', 'C-018', 'C-019', 'C-020',
            
            // Add more sections as needed
            // 'D-001', 'D-002', etc.
            // 'E-001', 'E-002', etc.
        ];

        // Convert to rack objects with QR codes
        this.customRacks = warehouseRacks.map(rackId => ({
            id: rackId,
            qrCode: this.generateRackQR(rackId),
            status: 'available',
            section: rackId.split('-')[0],
            number: rackId.split('-')[1],
            location: this.getRackLocation(rackId)
        }));

        console.log(`✅ Initialized ${this.customRacks.length} custom warehouse racks`);
    }

    // Generate QR code for rack
    generateRackQR(rackId) {
        return `RACK_${rackId.replace(/-/g, '_')}`;
    }

    // Get human-readable location description
    getRackLocation(rackId) {
        const section = rackId.split('-')[0];
        const number = rackId.split('-')[1];
        
        const sectionNames = {
            'A': 'Ground Floor - Section A',
            'B': 'Ground Floor - Section B', 
            'C': 'Second Floor - Section C',
            'D': 'Second Floor - Section D',
            'E': 'Third Floor - Section E'
            // Add more as needed
        };

        return `${sectionNames[section] || `Section ${section}`} - Rack ${number}`;
    }

    // Get all racks
    getAllRacks() {
        return this.customRacks;
    }

    // Get racks by section
    getRacksBySection(section) {
        return this.customRacks.filter(rack => rack.section === section);
    }

    // Find rack by ID
    findRack(rackId) {
        return this.customRacks.find(rack => rack.id === rackId);
    }

    // Parse QR code back to rack ID
    parseRackQR(qrData) {
        if (!qrData.startsWith('RACK_')) return null;
        return qrData.replace('RACK_', '').replace(/_/g, '-');
    }

    // Generate QR codes PDF for all racks
    async generateRackQRCodesPDF() {
        try {
            if (!window.jspdf) {
                throw new Error('PDF library not loaded');
            }

            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF();
            
            // Wait for QR libraries to be fully loaded
            await this.waitForQRLibraries();
            
            // Test QR generation first
            console.log('🧪 Testing QR generation before PDF creation...');
            await this.testQRGeneration();
            
            // Page settings
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 20;
            const qrSize = 40;
            const cols = 3;
            const rows = 4;
            const itemsPerPage = cols * rows;
            
            // Title page
            pdf.setFontSize(20);
            pdf.text('Warehouse Rack QR Codes', pageWidth/2, 30, { align: 'center' });
            pdf.setFontSize(12);
            pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth/2, 50, { align: 'center' });
            pdf.text(`Total Racks: ${this.customRacks.length}`, pageWidth/2, 70, { align: 'center' });

            let currentPage = 0;
            
            for (let i = 0; i < this.customRacks.length; i++) {
                if (i % itemsPerPage === 0) {
                    if (i > 0) pdf.addPage();
                    currentPage++;
                    
                    // Page header
                    pdf.setFontSize(14);
                    pdf.text(`Rack QR Codes - Page ${currentPage}`, pageWidth/2, 20, { align: 'center' });
                }
                
                const rack = this.customRacks[i];
                const positionOnPage = i % itemsPerPage;
                const col = positionOnPage % cols;
                const row = Math.floor(positionOnPage / cols);
                
                const x = margin + col * (qrSize + 20);
                const y = 40 + row * (qrSize + 30);
                
                // Draw border
                pdf.rect(x - 5, y - 5, qrSize + 10, qrSize + 25);
                
                // Generate QR code
                try {
                    await this.generateQRCodeForPDF(pdf, rack.qrCode, x, y, qrSize);
                } catch (qrError) {
                    console.warn('QR generation failed for', rack.qrCode, ':', qrError);
                    // Use text fallback
                    pdf.setFontSize(8);
                    pdf.text(rack.qrCode, x + qrSize/2, y + qrSize/2, { align: 'center' });
                }
                
                // Add labels
                pdf.setFontSize(10);
                pdf.text(rack.id, x + qrSize/2, y + qrSize + 10, { align: 'center' });
                pdf.setFontSize(8);
                pdf.text(rack.location, x + qrSize/2, y + qrSize + 20, { align: 'center' });
            }

            // Save the PDF
            pdf.save('warehouse-rack-qr-codes.pdf');
            return true;
            
        } catch (error) {
            console.error('Error generating PDF:', error);
            throw error;
        }
    }

    // Wait for QR libraries to load
    async waitForQRLibraries() {
        console.log('⏳ Waiting for QR libraries to load...');
        
        const maxWait = 5000; // 5 seconds max
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWait) {
            if (window.QRCode && typeof window.QRCode.toCanvas === 'function') {
                console.log('✅ QR libraries loaded successfully');
                return;
            }
            
            if (window.QRious && typeof window.QRious === 'function') {
                console.log('✅ QRious library loaded successfully');
                return;
            }
            
            // Wait 100ms before checking again
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.warn('⚠️ QR libraries may not be fully loaded, proceeding anyway...');
    }

    // Test QR generation capability
    async testQRGeneration() {
        console.log('🧪 Testing QR generation capability...');
        
        const testCanvas = document.createElement('canvas');
        testCanvas.width = 100;
        testCanvas.height = 100;
        
        try {
            if (window.QRCode && typeof window.QRCode.toCanvas === 'function') {
                await new Promise((resolve, reject) => {
                    window.QRCode.toCanvas(testCanvas, 'TEST_QR', {
                        width: 100,
                        margin: 1,
                        errorCorrectionLevel: 'M'
                    }, (error) => {
                        if (error) {
                            reject(error);
                        } else {
                            console.log('✅ QR generation test successful');
                            resolve();
                        }
                    });
                });
                return;
            }
            
            if (window.QRious) {
                new window.QRious({
                    element: testCanvas,
                    value: 'TEST_QR',
                    size: 100
                });
                console.log('✅ QRious generation test successful');
                return;
            }
            
            console.warn('⚠️ No QR generation method available, will use text fallback');
            
        } catch (error) {
            console.warn('⚠️ QR generation test failed:', error, '- will use text fallback');
        }
    }

    // Generate QR code for PDF (with improved fallback)
    async generateQRCodeForPDF(pdf, qrData, x, y, size) {
        return new Promise((resolve, reject) => {
            try {
                // Create a temporary canvas with higher resolution
                const canvas = document.createElement('canvas');
                const scale = 4; // Higher resolution for better quality
                canvas.width = size * scale;
                canvas.height = size * scale;
                
                // Try multiple QR libraries in order of preference
                const tryQRGeneration = () => {
                    // Method 1: Try window.QRCode (qrcode library)
                    if (window.QRCode && typeof window.QRCode.toCanvas === 'function') {
                        console.log('Using window.QRCode for', qrData);
                        window.QRCode.toCanvas(canvas, qrData, {
                            width: canvas.width,
                            height: canvas.height,
                            margin: 1,
                            errorCorrectionLevel: 'M',
                            color: {
                                dark: '#000000',
                                light: '#FFFFFF'
                            }
                        }, (error) => {
                            if (error) {
                                console.warn('QRCode.toCanvas failed:', error);
                                tryMethod2();
                            } else {
                                addCanvasToPDF();
                            }
                        });
                        return;
                    }
                    
                    // Method 2: Try QRious library
                    if (window.QRious) {
                        try {
                            console.log('Using QRious for', qrData);
                            const qr = new window.QRious({
                                element: canvas,
                                value: qrData,
                                size: canvas.width,
                                level: 'M'
                            });
                            addCanvasToPDF();
                            return;
                        } catch (e) {
                            console.warn('QRious failed:', e);
                        }
                    }
                    
                    // Method 3: Try qrcode-generator library
                    if (window.qrcode) {
                        try {
                            console.log('Using qrcode-generator for', qrData);
                            const qr = window.qrcode(4, 'M');
                            qr.addData(qrData);
                            qr.make();
                            
                            // Draw QR code manually on canvas
                            const ctx = canvas.getContext('2d');
                            const modules = qr.getModuleCount();
                            const cellSize = canvas.width / modules;
                            
                            ctx.fillStyle = '#FFFFFF';
                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                            ctx.fillStyle = '#000000';
                            
                            for (let row = 0; row < modules; row++) {
                                for (let col = 0; col < modules; col++) {
                                    if (qr.isDark(row, col)) {
                                        ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
                                    }
                                }
                            }
                            
                            addCanvasToPDF();
                            return;
                        } catch (e) {
                            console.warn('qrcode-generator failed:', e);
                        }
                    }
                    
                    // All methods failed, use text fallback
                    console.warn('All QR generation methods failed, using text fallback');
                    useTextFallback();
                };
                
                const tryMethod2 = () => {
                    // If first method fails, try alternatives
                    if (window.QRious) {
                        try {
                            const qr = new window.QRious({
                                element: canvas,
                                value: qrData,
                                size: canvas.width,
                                level: 'M'
                            });
                            addCanvasToPDF();
                        } catch (e) {
                            useTextFallback();
                        }
                    } else {
                        useTextFallback();
                    }
                };
                
                const addCanvasToPDF = () => {
                    try {
                        const imgData = canvas.toDataURL('image/png');
                        pdf.addImage(imgData, 'PNG', x, y, size, size);
                        resolve();
                    } catch (e) {
                        console.error('Failed to add canvas to PDF:', e);
                        useTextFallback();
                    }
                };
                
                const useTextFallback = () => {
                    console.log('Using text fallback for', qrData);
                    // Draw a simple border and text instead
                    pdf.rect(x, y, size, size);
                    pdf.setFontSize(8);
                    const lines = qrData.match(/.{1,12}/g) || [qrData];
                    lines.forEach((line, index) => {
                        pdf.text(line, x + 2, y + 10 + (index * 8));
                    });
                    resolve();
                };
                
                // Start QR generation process
                tryQRGeneration();
                
            } catch (error) {
                console.error('QR generation error:', error);
                reject(error);
            }
        });
    }

    // Generate HTML preview of all racks
    generateRackPreviewHTML() {
        const sections = [...new Set(this.customRacks.map(rack => rack.section))];
        
        let html = `
            <div class="rack-preview">
                <h2>Warehouse Rack Configuration</h2>
                <div class="rack-stats">
                    <div class="stat">
                        <strong>Total Racks:</strong> ${this.customRacks.length}
                    </div>
                    <div class="stat">
                        <strong>Sections:</strong> ${sections.join(', ')}
                    </div>
                </div>
        `;

        sections.forEach(section => {
            const sectionRacks = this.getRacksBySection(section);
            html += `
                <div class="section">
                    <h3>Section ${section} (${sectionRacks.length} racks)</h3>
                    <div class="rack-grid">
            `;
            
            sectionRacks.forEach(rack => {
                html += `
                    <div class="rack-item">
                        <div class="rack-id">${rack.id}</div>
                        <div class="rack-qr" data-qr="${rack.qrCode}">📱</div>
                        <div class="rack-location">${rack.location}</div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        });

        html += `
            </div>
            <style>
                .rack-preview { font-family: Arial, sans-serif; }
                .rack-stats { display: flex; gap: 20px; margin: 20px 0; }
                .stat { background: #f0f0f0; padding: 10px; border-radius: 5px; }
                .section { margin: 30px 0; }
                .rack-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; }
                .rack-item { border: 1px solid #ddd; padding: 15px; border-radius: 8px; text-align: center; }
                .rack-id { font-weight: bold; font-size: 16px; color: #333; }
                .rack-qr { font-size: 24px; margin: 10px 0; cursor: pointer; }
                .rack-location { font-size: 12px; color: #666; }
                .rack-item:hover { background: #f5f5f5; }
            </style>
        `;

        return html;
    }
}

// Initialize global custom rack manager
window.customRackManager = new CustomRackManager();
console.log('✅ Custom Rack Manager initialized');