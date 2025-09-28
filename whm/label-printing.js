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
    generatePreviewBarcodes(labels) {
        setTimeout(() => {
            labels.forEach(label => {
                const canvas = document.getElementById(`barcode-${label.id}`);
                if (canvas) {
                    this.generateBarcode(canvas, label);
                }
            });
        }, 100);
    }

    // Generate barcode on canvas
    generateBarcode(canvas, label) {
        try {
            if (this.barcodeType === 'qr') {
                // Generate QR Code
                if (window.QRCode) {
                    // Clear canvas
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    
                    // Generate QR code
                    QRCode.toCanvas(canvas, label.barcode, {
                        width: this.printFormat === 'thermal' ? 120 : 80,
                        margin: 1,
                        color: {
                            dark: '#000000',
                            light: '#FFFFFF'
                        }
                    });
                } else {
                    console.error('QRCode library not loaded');
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
                } else {
                    console.error('JsBarcode library not loaded');
                }
            }
        } catch (error) {
            console.error('Error generating barcode:', error);
            // Fallback: draw text
            const ctx = canvas.getContext('2d');
            ctx.font = '10px Arial';
            ctx.fillText(label.pieceId, 10, 20);
        }
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
            
            // Create print window
            const printWindow = window.open('', '_blank');
            const printContent = this.generatePrintHTML(this.currentLabels);
            
            printWindow.document.write(printContent);
            printWindow.document.close();
            
            // Wait for content to load
            setTimeout(() => {
                // Generate barcodes in print window
                this.generatePrintBarcodes(printWindow, this.currentLabels);
                
                // Print after barcodes are generated
                setTimeout(() => {
                    printWindow.focus();
                    printWindow.print();
                    
                    // Close modal after printing
                    this.closeLabelPreview();
                    showMessage(`${this.currentLabels.length} labels sent to printer`, 'success');
                }, 500);
            }, 200);
            
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
                <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
                <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
                <style>${printCSS}</style>
            </head>
            <body>
                <div class="print-container ${formatClass}">
        `;

        labels.forEach(label => {
            html += this.generateLabelHTML(label);
        });

        html += `
                </div>
            </body>
            </html>
        `;

        return html;
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
        labels.forEach(label => {
            const canvas = printWindow.document.getElementById(`barcode-${label.id}`);
            if (canvas) {
                if (this.barcodeType === 'qr') {
                    if (printWindow.QRCode) {
                        printWindow.QRCode.toCanvas(canvas, label.barcode, {
                            width: this.printFormat === 'thermal' ? 120 : 80,
                            margin: 1
                        });
                    }
                } else {
                    if (printWindow.JsBarcode) {
                        printWindow.JsBarcode(canvas, label.pieceId, {
                            format: "CODE128",
                            width: this.printFormat === 'thermal' ? 2 : 1.5,
                            height: this.printFormat === 'thermal' ? 60 : 40,
                            displayValue: false,
                            margin: 0
                        });
                    }
                }
            }
        });
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