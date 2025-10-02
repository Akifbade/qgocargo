// Barcode Label Printing Module
class LabelPrintingManager {
    constructor() {
        this.currentLabels = [];
        this.printFormat = 'sticker'; // 'sticker' or 'thermal'
        this.barcodeType = 'code128'; // 'code128' or 'qr'
        this.labelsPerRow = 3;
        this.labelsPerPage = 24; // 3x8 grid
        this.labelWidth = 70; // mm
        this.labelHeight = 35; // mm
        this.thermalWidth = 100; // mm
        this.thermalHeight = 150; // mm
        this._qrLibLoading = null; // promise guard for dynamic QR lib loading
        this._jsBarcodeLoading = null; // promise guard for dynamic JsBarcode loading
        this.renderedBarcodes = new Map(); // labelId -> dataURL
    }

    // Ensure QRCode library is available; check already loaded library first
    async ensureQRCodeLib(targetWindow = window) {
        try {
            // Check all possible QR library references
            const QR = targetWindow.QRCode || targetWindow.qrcode || targetWindow.QR;
            
            // Check if the library is functional
            if (QR && (typeof QR.toCanvas === 'function' || typeof QR.toDataURL === 'function')) {
                console.log('QR Code library found and functional');
                return true;
            }

            // Wait a moment and check again (library might still be loading)
            await new Promise(resolve => setTimeout(resolve, 500));
            const QR2 = targetWindow.QRCode || targetWindow.qrcode || targetWindow.QR;
            if (QR2 && (typeof QR2.toCanvas === 'function' || typeof QR2.toDataURL === 'function')) {
                console.log('QR Code library loaded after wait');
                return true;
            }

            console.log('QR Code library not found, attempting to load...');
            
            // Only try to load if not already loading
            if (!this._qrLibLoading) {
                this._qrLibLoading = this.loadQRCodeLibrary(targetWindow);
            }
            
            await this._qrLibLoading;
            return true;
        } catch (e) {
            console.error('Failed to ensure QRCode library:', e);
            // reset so future attempts can retry
            this._qrLibLoading = null;
            
            // Check one more time if library is available despite the error
            const QR = targetWindow.QRCode || targetWindow.qrcode || targetWindow.QR;
            if (QR && (typeof QR.toCanvas === 'function' || typeof QR.toDataURL === 'function')) {
                console.log('QR Code library found despite error');
                return true;
            }
            
            return false;
        }
    }

    // Separate method to load QR library
    async loadQRCodeLibrary(targetWindow = window) {
        return new Promise((resolve, reject) => {
            const doc = targetWindow.document;
            
            // Check if script tag already exists
            const existing = Array.from(doc.querySelectorAll('script[src*="qrcode"]')).find(s => 
                s.src.includes('qrcode') && !s.hasAttribute('data-failed')
            );
            
            if (existing) {
                // Script already exists, wait for it to load
                console.log('QR script tag found, waiting for load...');
                setTimeout(() => {
                    const QR = targetWindow.QRCode || targetWindow.qrcode || targetWindow.QR;
                    if (QR) {
                        resolve(true);
                    } else {
                        reject(new Error('QR library script loaded but QRCode not available'));
                    }
                }, 1000);
                return;
            }

            // Try different CDN sources
            const sources = [
                'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js',
                'https://unpkg.com/qrcode@1.5.3/build/qrcode.min.js',
                'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js'
            ];

            let currentIndex = 0;

            function tryNext() {
                if (currentIndex >= sources.length) {
                    reject(new Error('All QR library sources failed to load'));
                    return;
                }

                const src = sources[currentIndex];
                const script = doc.createElement('script');
                script.src = src;
                script.async = true;
                script.defer = true;
                
                script.onload = () => {
                    console.log('QR library loaded from:', src);
                    // Wait a moment for library to initialize
                    setTimeout(() => {
                        const QR = targetWindow.QRCode || targetWindow.qrcode || targetWindow.QR;
                        if (QR) {
                            resolve(true);
                        } else {
                            console.warn('QR script loaded but library not available');
                            currentIndex++;
                            tryNext();
                        }
                    }, 200);
                };
                
                script.onerror = () => {
                    console.warn('Failed to load QR library from:', src);
                    script.setAttribute('data-failed', 'true');
                    currentIndex++;
                    tryNext();
                };
                
                doc.head.appendChild(script);
            }

            tryNext();
        });
    }

    // Ensure JsBarcode library is available; dynamically load if missing
    async ensureJsBarcodeLib(targetWindow = window) {
        try {
            if (targetWindow.JsBarcode) return true;
            if (!this._jsBarcodeLoading) {
                const sources = [
                    'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js',
                    'https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.5/JsBarcode.all.min.js',
                    'https://unpkg.com/jsbarcode@3.11.5/dist/JsBarcode.all.min.js'
                ];

                this._jsBarcodeLoading = new Promise((resolve, reject) => {
                    const doc = targetWindow.document;
                    const existing = Array.from(doc.querySelectorAll('script[src]')).find(s => /jsbarcode(.*)\.min\.js/i.test(s.src));
                    if (existing) {
                        existing.addEventListener('load', () => resolve(true));
                        existing.addEventListener('error', () => loadNext(0));
                        setTimeout(() => { if (targetWindow.JsBarcode) resolve(true); else loadNext(0); }, 300);
                        return;
                    }

                    function loadNext(idx) {
                        if (idx >= sources.length) {
                            reject(new Error('Failed to load JsBarcode library'));
                            return;
                        }
                        const src = sources[idx];
                        const script = doc.createElement('script');
                        script.src = src;
                        script.async = true;
                        script.defer = true;
                        script.setAttribute('data-autoload', 'jsbarcode-lib');
                        script.onload = () => resolve(true);
                        script.onerror = () => loadNext(idx + 1);
                        doc.head.appendChild(script);
                    }

                    loadNext(0);
                });
            }
            await this._jsBarcodeLoading;
            return true;
        } catch (e) {
            console.error('Failed to ensure JsBarcode library:', e);
            this._jsBarcodeLoading = null;
            return false;
        }
    }

    // Generate labels for a shipment
    async generateLabels(shipment) {
        try {
            const labels = [];
            const pieces = parseInt(shipment.pieces);

            for (let i = 1; i <= pieces; i++) {
                const pieceId = `${shipment.barcode}-${String(i).padStart(3, '0')}`;
                
                const label = {
                    id: `label-${shipment.id}-${i}`,
                    shipmentId: shipment.id,
                    barcode: shipment.barcode,
                    pieceId: pieceId,
                    shipper: shipment.shipper,
                    consignee: shipment.consignee,
                    rack: shipment.rack,
                    weight: shipment.weight,
                    pieceNumber: i,
                    totalPieces: pieces,
                    createdAt: new Date().toISOString()
                };

                labels.push(label);
            }

            this.currentLabels = labels;
            return labels;
        } catch (error) {
            console.error('Error generating labels:', error);
            throw error;
        }
    }

    // Generate piece QR code labels for new dual QR system
    async generatePieceQRLabels(shipment, pieceQRCodes) {
        try {
            const labels = [];

            for (let i = 0; i < pieceQRCodes.length; i++) {
                const pieceQR = pieceQRCodes[i];
                
                const label = {
                    id: `qrlabel-${shipment.id}-${pieceQR.pieceNumber}`,
                    shipmentId: shipment.id,
                    barcode: shipment.barcode,
                    pieceQR: pieceQR.qrCode,
                    pieceNumber: pieceQR.pieceNumber,
                    totalPieces: shipment.pieces,
                    shipper: shipment.shipper,
                    consignee: shipment.consignee,
                    weight: shipment.weight,
                    type: 'piece_qr',
                    createdAt: new Date().toISOString()
                };

                labels.push(label);
            }

            return labels;
        } catch (error) {
            console.error('Error generating piece QR labels:', error);
            throw error;
        }
    }

    // Show label preview modal
    showLabelPreview(labels, shipment) {
        this.currentLabels = labels;
        
        const modal = document.getElementById('labelPreviewModal');
        const content = document.getElementById('labelPreviewContent');
        
        // Update modal title
        document.getElementById('labelModalTitle').textContent = 
            `Label Preview - ${labels.length} labels for ${shipment.barcode}`;
        
        // Generate preview HTML
        content.innerHTML = this.generatePreviewHTML(labels);
        
        // Generate barcodes for preview
        this.generatePreviewBarcodes(labels);
        
        modal.style.display = 'block';
    }

    // Show piece QR code preview modal
    showPieceQRPreview(labels, shipment) {
        this.currentLabels = labels;
        
        const modal = document.getElementById('labelPreviewModal');
        const content = document.getElementById('labelPreviewContent');
        
        // Update modal title
        document.getElementById('labelModalTitle').textContent = 
            `Piece QR Codes - ${labels.length} QR codes for ${shipment.barcode}`;
        
        // Generate piece QR preview HTML
        content.innerHTML = this.generatePieceQRPreviewHTML(labels);
        
        // Generate QR codes for preview
        this.generatePieceQRCodes(labels);
        
        modal.style.display = 'block';
    }

    // Generate preview HTML
    generatePreviewHTML(labels) {
        const formatClass = this.printFormat === 'thermal' ? 'thermal-preview' : 'sticker-preview';
        
        let html = `
            <div class="print-options">
                <div class="print-option-group">
                    <label>Print Format:</label>
                    <select id="printFormat" onchange="labelManager.updatePrintFormat(this.value)">
                        <option value="sticker" ${this.printFormat === 'sticker' ? 'selected' : ''}>A4 Sticker Sheet (3×8)</option>
                        <option value="thermal" ${this.printFormat === 'thermal' ? 'selected' : ''}>Thermal Printer (100×150mm)</option>
                    </select>
                </div>
                <div class="print-option-group">
                    <label>Barcode Type:</label>
                    <select id="barcodeType" onchange="labelManager.updateBarcodeType(this.value)">
                        <option value="code128" ${this.barcodeType === 'code128' ? 'selected' : ''}>Code128</option>
                        <option value="qr" ${this.barcodeType === 'qr' ? 'selected' : ''}>QR Code</option>
                    </select>
                </div>
            </div>
            <div class="labels-container ${formatClass}">
        `;

        labels.forEach(label => {
            html += this.generateLabelHTML(label);
        });

        html += `</div>`;
        return html;
    }

    // Generate individual label HTML
    generateLabelHTML(label) {
        const labelClass = this.printFormat === 'thermal' ? 'thermal-label' : 'sticker-label';
        
        return `
            <div class="${labelClass}" id="label-${label.id}">
                <div class="label-header">
                    <div class="label-title">WAREHOUSE LABEL</div>
                    <div class="piece-info">Piece ${label.pieceNumber} of ${label.totalPieces}</div>
                </div>
                <div class="barcode-container">
                    <canvas id="barcode-${label.id}" class="barcode-canvas"></canvas>
                    <div class="barcode-text">${this.barcodeType === 'qr' ? label.barcode : label.pieceId}</div>
                </div>
                <div class="label-info">
                    <div class="info-row">
                        <strong>From:</strong> <span class="shipper">${this.truncateText(label.shipper, 20)}</span>
                    </div>
                    <div class="info-row">
                        <strong>To:</strong> <span class="consignee">${this.truncateText(label.consignee, 20)}</span>
                    </div>
                    <div class="info-row">
                        <strong>Rack:</strong> <span class="rack">${label.rack}</span>
                        <strong>Weight:</strong> <span class="weight">${label.weight}kg</span>
                    </div>
                </div>
                <div class="label-footer">
                    <div class="piece-id">${label.pieceId}</div>
                    <div class="print-date">${new Date().toLocaleDateString()}</div>
                </div>
            </div>
        `;
    }

    // Generate barcodes for preview
    async generatePreviewBarcodes(labels) {
        // Ensure libs as needed
        if (this.barcodeType === 'qr') {
            await this.ensureQRCodeLib(window);
        } else {
            await this.ensureJsBarcodeLib(window);
        }
        // Render all and cache data URLs
        const tasks = labels.map(label => {
            const canvas = document.getElementById(`barcode-${label.id}`);
            if (!canvas) return Promise.resolve();
            return this.generateBarcode(canvas, label);
        });
        await Promise.all(tasks);
    }

    // Generate piece QR preview HTML
    generatePieceQRPreviewHTML(labels) {
        let html = `
            <div class="print-options">
                <div class="print-option-group">
                    <label>Print Format:</label>
                    <select id="printFormat" onchange="labelManager.updatePrintFormat(this.value)">
                        <option value="sticker" ${this.printFormat === 'sticker' ? 'selected' : ''}>A4 Sticker Sheet (3×3)</option>
                        <option value="thermal" ${this.printFormat === 'thermal' ? 'selected' : ''}>Thermal Printer (100×150mm)</option>
                    </select>
                </div>
                <div class="print-info">
                    <strong>📱 Piece QR Codes for Location Assignment</strong><br>
                    <small>These QR codes will be scanned along with rack QR codes to assign piece locations</small>
                </div>
            </div>
            <div class="qr-labels-container ${this.printFormat === 'thermal' ? 'thermal-preview' : 'sticker-preview'}">
        `;

        labels.forEach(label => {
            html += this.generatePieceQRLabelHTML(label);
        });

        html += `</div>`;
        return html;
    }

    // Generate individual piece QR label HTML
    generatePieceQRLabelHTML(label) {
        const qrSize = this.printFormat === 'thermal' ? 120 : 80;
        return `
            <div class="qr-label ${this.printFormat}">
                <div class="qr-header">
                    <div class="barcode-main">${label.barcode}</div>
                    <div class="piece-info">Piece ${label.pieceNumber}/${label.totalPieces}</div>
                </div>
                <div class="qr-code-container">
                    <canvas id="qr-${label.id}" width="${qrSize}" height="${qrSize}" class="qr-canvas"></canvas>
                </div>
                <div class="qr-footer">
                    <div class="qr-data">${label.pieceQR}</div>
                    <div class="shipper-consignee">
                        <div><strong>From:</strong> ${label.shipper}</div>
                        <div><strong>To:</strong> ${label.consignee}</div>
                    </div>
                </div>
            </div>
        `;
    }

    // Generate QR codes for piece labels
    async generatePieceQRCodes(labels) {
        await this.ensureQRCodeLib(window);
        
        const tasks = labels.map(label => {
            const canvas = document.getElementById(`qr-${label.id}`);
            if (!canvas) return Promise.resolve();
            return this.generatePieceQRCode(canvas, label);
        });
        await Promise.all(tasks);
    }

    // Generate individual piece QR code
    generatePieceQRCode(canvas, label) {
        return new Promise((resolve) => {
            try {
                const QR = window.QRCode || window.qrcode;
                if (QR && typeof QR.toCanvas === 'function') {
                    const opts = {
                        width: this.printFormat === 'thermal' ? 120 : 80,
                        margin: 1,
                        color: { dark: '#000000', light: '#FFFFFF' }
                    };
                    
                    QR.toCanvas(canvas, label.pieceQR, opts, (err) => {
                        if (err) console.error('QR generation error:', err);
                        try { 
                            this.renderedBarcodes.set(label.id, canvas.toDataURL('image/png')); 
                        } catch (e) {
                            console.error('Error caching QR code:', e);
                        }
                        resolve();
                    });
                } else {
                    // Fallback: draw text
                    const ctx = canvas.getContext('2d');
                    ctx.font = '10px Arial';
                    ctx.fillText(label.pieceQR, 10, 20);
                    try { 
                        this.renderedBarcodes.set(label.id, canvas.toDataURL('image/png')); 
                    } catch (e) {
                        console.error('Error with fallback QR:', e);
                    }
                    resolve();
                }
            } catch (error) {
                console.error('Error generating piece QR code:', error);
                resolve();
            }
        });
    }

    // Generate barcode on canvas; returns a Promise that resolves when drawn and cached
    generateBarcode(canvas, label) {
        return new Promise((resolve) => {
        try {
            if (this.barcodeType === 'qr') {
                // Generate QR Code
                const QR = window.QRCode || window.qrcode;
                if (QR) {
                    // Clear canvas
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    
                    // Generate QR code
                    // Support both function API and object API
                    const opts = {
                        width: this.printFormat === 'thermal' ? 120 : 80,
                        margin: 1,
                        color: { dark: '#000000', light: '#FFFFFF' }
                    };
                    if (typeof QR.toCanvas === 'function') {
                        // toCanvas can accept a callback
                        try {
                            QR.toCanvas(canvas, label.barcode, opts, (err) => {
                                if (err) console.error('QR toCanvas callback error:', err);
                                try { this.renderedBarcodes.set(label.id, canvas.toDataURL('image/png')); } catch {}
                                resolve();
                            });
                        } catch (e) {
                            // Some builds lack callback; do synchronous call and resolve
                            QR.toCanvas(canvas, label.barcode, opts);
                            try { this.renderedBarcodes.set(label.id, canvas.toDataURL('image/png')); } catch {}
                            resolve();
                        }
                    } else if (typeof QR === 'function') {
                        // Some builds expose a function that returns a promise
                        try {
                            const result = QR(label.barcode, opts);
                            if (result && result.then) {
                                // If returns Promise, draw when ready using toCanvas again
                                result.then(url => {
                                    const img = new Image();
                                    img.onload = () => {
                                        canvas.width = img.width;
                                        canvas.height = img.height;
                                        ctx.drawImage(img, 0, 0);
                                        try { this.renderedBarcodes.set(label.id, canvas.toDataURL('image/png')); } catch {}
                                        resolve();
                                    };
                                    img.src = url;
                                });
                            } else {
                                // If result is immediate URL
                                const img = new Image();
                                img.onload = () => {
                                    canvas.width = img.width;
                                    canvas.height = img.height;
                                    ctx.drawImage(img, 0, 0);
                                    try { this.renderedBarcodes.set(label.id, canvas.toDataURL('image/png')); } catch {}
                                    resolve();
                                };
                                img.src = result;
                            }
                        } catch (e) {
                            console.error('QR generation (function API) failed:', e);
                            // fallback to text
                            ctx.font = '10px Arial';
                            ctx.fillText(label.barcode, 10, 20);
                            try { this.renderedBarcodes.set(label.id, canvas.toDataURL('image/png')); } catch {}
                            resolve();
                        }
                    } else if (typeof QR === 'object' && 'CorrectLevel' in QR && typeof window.QRCode === 'function') {
                        // Compatibility: older qrcodejs library exposes a QRCode constructor that injects DOM
                        try {
                            const temp = document.createElement('div');
                            temp.style.position = 'absolute';
                            temp.style.left = '-9999px';
                            document.body.appendChild(temp);
                            const inst = new window.QRCode(temp, { width: opts.width, height: opts.width, correctLevel: window.QRCode.CorrectLevel.L });
                            if (inst && typeof inst.makeCode === 'function') inst.makeCode(label.barcode);
                            // Extract produced image/canvas and draw onto our canvas
                            const outCanvas = temp.querySelector('canvas');
                            const outImg = temp.querySelector('img');
                            if (outCanvas) {
                                canvas.width = outCanvas.width;
                                canvas.height = outCanvas.height;
                                ctx.drawImage(outCanvas, 0, 0);
                                try { this.renderedBarcodes.set(label.id, canvas.toDataURL('image/png')); } catch {}
                                document.body.removeChild(temp);
                                resolve();
                            } else if (outImg) {
                                const img = new Image();
                                img.onload = () => {
                                    canvas.width = img.width;
                                    canvas.height = img.height;
                                    ctx.drawImage(img, 0, 0);
                                    try { this.renderedBarcodes.set(label.id, canvas.toDataURL('image/png')); } catch {}
                                    document.body.removeChild(temp);
                                    resolve();
                                };
                                img.src = outImg.src;
                            } else {
                                document.body.removeChild(temp);
                                ctx.font = '10px Arial';
                                ctx.fillText(label.barcode, 10, 20);
                                try { this.renderedBarcodes.set(label.id, canvas.toDataURL('image/png')); } catch {}
                                resolve();
                            }
                        } catch (e) {
                            console.error('QR generation (constructor API) failed:', e);
                            const ctx2 = canvas.getContext('2d');
                            ctx2.font = '10px Arial';
                            ctx2.fillText(label.barcode, 10, 20);
                            try { this.renderedBarcodes.set(label.id, canvas.toDataURL('image/png')); } catch {}
                            resolve();
                        }
                    }
                } else {
                    console.warn('QRCode library not loaded; falling back to text');
                    // Network fallback: use an online QR image if available
                    try {
                        const size = this.printFormat === 'thermal' ? 240 : 160;
                        const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(label.barcode)}`;
                        // Cache the URL for print embedding (even if canvas can't draw due to CORS)
                        this.renderedBarcodes.set(label.id, url);
                        // Try to draw it in preview canvas for UX
                        const img = new Image();
                        img.crossOrigin = 'anonymous';
                        img.onload = () => {
                            try {
                                canvas.width = img.width;
                                canvas.height = img.height;
                                const ctx = canvas.getContext('2d');
                                ctx.drawImage(img, 0, 0);
                            } catch {}
                            resolve();
                        };
                        img.onerror = () => {
                            // Final fallback: draw text
                            const ctx = canvas.getContext('2d');
                            ctx.font = '10px Arial';
                            ctx.fillText(label.barcode, 10, 20);
                            try { this.renderedBarcodes.set(label.id, canvas.toDataURL('image/png')); } catch {}
                            resolve();
                        };
                        img.src = url;
                    } catch {
                        // Final fallback: draw text
                        const ctx = canvas.getContext('2d');
                        ctx.font = '10px Arial';
                        ctx.fillText(label.barcode, 10, 20);
                        try { this.renderedBarcodes.set(label.id, canvas.toDataURL('image/png')); } catch {}
                        resolve();
                    }
                }
            } else {
                // Generate Code128
                if (window.JsBarcode) {
                    JsBarcode(canvas, label.pieceId, {
                        format: "CODE128",
                        width: this.printFormat === 'thermal' ? 2 : 1.5,
                        height: this.printFormat === 'thermal' ? 60 : 40,
                        displayValue: false,
                        margin: 0,
                        background: "#ffffff",
                        lineColor: "#000000"
                    });
                    try { this.renderedBarcodes.set(label.id, canvas.toDataURL('image/png')); } catch {}
                    resolve();
                } else {
                    console.error('JsBarcode library not loaded');
                    const ctx = canvas.getContext('2d');
                    ctx.font = '10px Arial';
                    ctx.fillText(label.pieceId, 10, 20);
                    try { this.renderedBarcodes.set(label.id, canvas.toDataURL('image/png')); } catch {}
                    resolve();
                }
            }
        } catch (error) {
            console.error('Error generating barcode:', error);
            // Fallback: draw text
            const ctx = canvas.getContext('2d');
            ctx.font = '10px Arial';
            ctx.fillText(this.barcodeType === 'qr' ? label.barcode : label.pieceId, 10, 20);
            try { this.renderedBarcodes.set(label.id, canvas.toDataURL('image/png')); } catch {}
            resolve();
        }
        });
    }

    // Update print format
    updatePrintFormat(format) {
        this.printFormat = format;
        if (this.currentLabels.length > 0) {
            this.refreshPreview();
        }
    }

    // Update barcode type
    updateBarcodeType(type) {
        this.barcodeType = type;
        if (this.currentLabels.length > 0) {
            this.refreshPreview();
        }
    }

    // Refresh preview
    refreshPreview() {
        const content = document.getElementById('labelPreviewContent');
        content.innerHTML = this.generatePreviewHTML(this.currentLabels);
        this.generatePreviewBarcodes(this.currentLabels);
    }

    // Print labels
    async printLabels() {
        try {
            showMessage('Preparing labels for printing...', 'info');
            // Ensure barcodes are rendered and cached
            await this.ensureBarcodesRendered(this.currentLabels);
            
            // Create print window
            const printWindow = window.open('', '_blank');
            const printContent = this.generatePrintHTML(this.currentLabels);
            
            printWindow.document.write(printContent);
            printWindow.document.close();
            
            // Wait a moment for images to load then print
            setTimeout(() => {
                printWindow.focus();
                printWindow.print();
                // Close modal after printing
                this.closeLabelPreview();
                showMessage(`${this.currentLabels.length} labels sent to printer`, 'success');
            }, 300);
            
        } catch (error) {
            console.error('Error printing labels:', error);
            showMessage('Error printing labels', 'error');
        }
    }

    // Generate print HTML
    generatePrintHTML(labels) {
        const printCSS = this.generatePrintCSS();
        const formatClass = this.printFormat === 'thermal' ? 'thermal-print' : 'sticker-print';
        
        let html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Warehouse Labels</title>
                <style>${printCSS}</style>
            </head>
            <body>
                <div class="print-container ${formatClass}">
        `;

        labels.forEach(label => {
            html += this.generatePrintLabelHTML(label);
        });

        html += `
                </div>
            </body>
            </html>
        `;

        return html;
    }

    // Generate label HTML for printing with embedded image
    generatePrintLabelHTML(label) {
        const labelClass = this.printFormat === 'thermal' ? 'thermal-label' : 'sticker-label';
        const imgSrc = this.renderedBarcodes.get(label.id) || '';
        const codeText = this.barcodeType === 'qr' ? label.barcode : label.pieceId;
        return `
            <div class="${labelClass}" id="label-${label.id}">
                <div class="label-header">
                    <div class="label-title">WAREHOUSE LABEL</div>
                    <div class="piece-info">Piece ${label.pieceNumber} of ${label.totalPieces}</div>
                </div>
                <div class="barcode-container">
                    <img src="${imgSrc}" alt="barcode" style="max-width:100%;height:auto;"/>
                    <div class="barcode-text">${codeText}</div>
                </div>
                <div class="label-info">
                    <div class="info-row">
                        <strong>From:</strong> <span class="shipper">${this.truncateText(label.shipper, 20)}</span>
                    </div>
                    <div class="info-row">
                        <strong>To:</strong> <span class="consignee">${this.truncateText(label.consignee, 20)}</span>
                    </div>
                    <div class="info-row">
                        <strong>Rack:</strong> <span class="rack">${label.rack}</span>
                        <strong>Weight:</strong> <span class="weight">${label.weight}kg</span>
                    </div>
                </div>
                <div class="label-footer">
                    <div class="piece-id">${label.pieceId}</div>
                    <div class="print-date">${new Date().toLocaleDateString()}</div>
                </div>
            </div>
        `;
    }

    // Ensure all barcodes are rendered and cached as images
    async ensureBarcodesRendered(labels) {
        if (!labels || labels.length === 0) return;
        // Ensure libs loaded for the selected type
        if (this.barcodeType === 'qr') await this.ensureQRCodeLib(window); else await this.ensureJsBarcodeLib(window);
        const tasks = [];
        labels.forEach(label => {
            if (!this.renderedBarcodes.has(label.id)) {
                // Create offscreen canvas and render
                const canvas = document.createElement('canvas');
                canvas.width = this.printFormat === 'thermal' ? 240 : 160;
                canvas.height = this.printFormat === 'thermal' ? 240 : 160;
                tasks.push(this.generateBarcode(canvas, label));
            }
        });
        if (tasks.length) await Promise.all(tasks);
    }

    // Generate print CSS
    generatePrintCSS() {
        return `
            @page {
                size: A4;
                margin: 0;
            }
            
            * {
                box-sizing: border-box;
            }
            
            body {
                margin: 0;
                padding: 0;
                font-family: 'Arial', sans-serif;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            
            .print-container {
                width: 100%;
                height: 100%;
            }
            
            /* Sticker Sheet Layout (A4 3×8 grid) */
            .sticker-print {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                grid-template-rows: repeat(8, 1fr);
                gap: 2mm;
                padding: 5mm;
                width: 210mm;
                height: 297mm;
            }
            
            .sticker-label {
                width: 68mm;
                height: 35mm;
                border: 1px solid #ccc;
                padding: 2mm;
                font-size: 8pt;
                line-height: 1.2;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                background: white;
                page-break-inside: avoid;
            }
            
            /* Thermal Printer Layout */
            .thermal-print {
                width: 100mm;
            }
            
            .thermal-label {
                width: 100mm;
                height: 150mm;
                border: none;
                padding: 5mm;
                font-size: 12pt;
                line-height: 1.3;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                background: white;
                page-break-after: always;
                margin-bottom: 10mm;
            }
            
            .label-header {
                text-align: center;
                border-bottom: 1px solid #000;
                padding-bottom: 1mm;
                margin-bottom: 2mm;
            }
            
            .label-title {
                font-weight: bold;
                font-size: ${this.printFormat === 'thermal' ? '14pt' : '9pt'};
            }
            
            .piece-info {
                font-size: ${this.printFormat === 'thermal' ? '10pt' : '7pt'};
                color: #666;
            }
            
            .barcode-container {
                text-align: center;
                margin: ${this.printFormat === 'thermal' ? '3mm 0' : '2mm 0'};
                flex-grow: 1;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
            }
            
            .barcode-canvas {
                max-width: 100%;
                height: auto;
            }
            
            .barcode-text {
                font-size: ${this.printFormat === 'thermal' ? '10pt' : '7pt'};
                font-weight: bold;
                margin-top: 1mm;
                word-break: break-all;
            }
            
            .label-info {
                font-size: ${this.printFormat === 'thermal' ? '10pt' : '7pt'};
                line-height: 1.3;
            }
            
            .info-row {
                margin-bottom: 1mm;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .info-row strong {
                font-weight: bold;
                min-width: ${this.printFormat === 'thermal' ? '20mm' : '15mm'};
            }
            
            .shipper, .consignee {
                flex-grow: 1;
                text-align: right;
                margin-left: 2mm;
            }
            
            .rack, .weight {
                margin-left: 2mm;
            }
            
            .label-footer {
                border-top: 1px solid #ccc;
                padding-top: 1mm;
                margin-top: 2mm;
                display: flex;
                justify-content: space-between;
                font-size: ${this.printFormat === 'thermal' ? '8pt' : '6pt'};
                color: #666;
            }
            
            .piece-id {
                font-weight: bold;
            }
            
            .print-date {
                text-align: right;
            }
            
            @media print {
                body {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                
                .thermal-print {
                    page-break-inside: avoid;
                }
                
                .sticker-print {
                    page-break-inside: avoid;
                }
            }
        `;
    }

    // Generate barcodes in print window
    generatePrintBarcodes(printWindow, labels) {
        const attempt = async (tries = 0) => {
            // Ensure libs exist in print window
            if (this.barcodeType === 'qr') {
                await this.ensureQRCodeLib(printWindow);
            } else {
                await this.ensureJsBarcodeLib(printWindow);
            }

            const QR = printWindow.QRCode || printWindow.qrcode;
            const hasQR = !!(QR && (typeof QR.toCanvas === 'function' || typeof QR === 'function'));
            const hasJs = !!printWindow.JsBarcode;

            // If still missing, retry a few times (scripts might still be parsing)
            if ((this.barcodeType === 'qr' && !hasQR) || (this.barcodeType !== 'qr' && !hasJs)) {
                if (tries < 5) {
                    return setTimeout(() => attempt(tries + 1), 150);
                }
                console.warn('Barcode libraries not ready in print window after retries');
            }

            labels.forEach(label => {
                const canvas = printWindow.document.getElementById(`barcode-${label.id}`);
                if (!canvas) return;
                if (this.barcodeType === 'qr') {
                    if (QR && typeof QR.toCanvas === 'function') {
                        QR.toCanvas(canvas, label.barcode, {
                            width: this.printFormat === 'thermal' ? 120 : 80,
                            margin: 1
                        });
                    } else if (QR && typeof QR === 'object' && 'CorrectLevel' in QR && typeof printWindow.QRCode === 'function') {
                        try {
                            const temp = printWindow.document.createElement('div');
                            temp.style.position = 'absolute';
                            temp.style.left = '-9999px';
                            printWindow.document.body.appendChild(temp);
                            const inst = new printWindow.QRCode(temp, { width: this.printFormat === 'thermal' ? 120 : 80, height: this.printFormat === 'thermal' ? 120 : 80, correctLevel: printWindow.QRCode.CorrectLevel.L });
                            if (inst && typeof inst.makeCode === 'function') inst.makeCode(label.barcode);
                            const outCanvas = temp.querySelector('canvas');
                            const outImg = temp.querySelector('img');
                            const ctx = canvas.getContext('2d');
                            if (outCanvas) {
                                canvas.width = outCanvas.width;
                                canvas.height = outCanvas.height;
                                ctx.drawImage(outCanvas, 0, 0);
                            } else if (outImg) {
                                const img = new Image();
                                img.onload = () => {
                                    canvas.width = img.width;
                                    canvas.height = img.height;
                                    ctx.drawImage(img, 0, 0);
                                };
                                img.src = outImg.src;
                            }
                            printWindow.document.body.removeChild(temp);
                        } catch (e) {
                            console.error('Print QR (constructor API) failed:', e);
                        }
                    }
                } else if (printWindow.JsBarcode) {
                    printWindow.JsBarcode(canvas, label.pieceId, {
                        format: "CODE128",
                        width: this.printFormat === 'thermal' ? 2 : 1.5,
                        height: this.printFormat === 'thermal' ? 60 : 40,
                        displayValue: false,
                        margin: 0
                    });
                }
            });
        };
        attempt(0);
    }

    // Bulk print for selected shipments
    async bulkPrintLabels(shipments) {
        try {
            showLoading(true);
            let allLabels = [];

            for (const shipment of shipments) {
                const labels = await this.generateLabels(shipment);
                allLabels = allLabels.concat(labels);
            }

            this.currentLabels = allLabels;
            
            // Show preview for bulk print
            const modal = document.getElementById('labelPreviewModal');
            document.getElementById('labelModalTitle').textContent = 
                `Bulk Label Preview - ${allLabels.length} labels for ${shipments.length} shipments`;
            
            const content = document.getElementById('labelPreviewContent');
            content.innerHTML = this.generatePreviewHTML(allLabels);
            this.generatePreviewBarcodes(allLabels);
            
            modal.style.display = 'block';
            
        } catch (error) {
            console.error('Error in bulk print:', error);
            showMessage('Error preparing bulk labels', 'error');
        } finally {
            showLoading(false);
        }
    }

    // Close label preview modal
    closeLabelPreview() {
        const modal = document.getElementById('labelPreviewModal');
        modal.style.display = 'none';
        this.currentLabels = [];
    }

    // Utility function to truncate text
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }

    // Save labels to database (optional for reprinting)
    async saveLabelsToDatabase(labels, shipmentId) {
        // This could be implemented to save label data for reprinting
        // For now, labels are generated on-demand
        console.log('Labels generated for shipment:', shipmentId);
    }
}

// Global label manager instance
window.labelManager = new LabelPrintingManager();

// Functions called from HTML
function showLabelPreview(labels, shipment) {
    labelManager.showLabelPreview(labels, shipment);
}

function printCurrentLabels() {
    labelManager.printLabels();
}

function closeLabelPreview() {
    labelManager.closeLabelPreview();
}

function updatePrintFormat(format) {
    labelManager.updatePrintFormat(format);
}

function updateBarcodeType(type) {
    labelManager.updateBarcodeType(type);
}