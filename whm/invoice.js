// Invoice Generation and Management
class InvoiceManager {
    constructor() {
        this.currentInvoiceData = null;
    }

    // Generate invoice for a shipment
    async generateInvoice(shipment) {
        try {
            // Get pricing settings
            const pricingSettings = await dbManager.getPricingSettings();
            
            // Calculate charges
            const charges = dbManager.calculateStorageCharges(shipment, pricingSettings);
            
            // Ensure we have valid numbers for all charges
            const safeCharges = {
                storageDays: charges?.storageDays || charges?.storage_days || 0,
                chargeableDays: charges?.chargeableDays || charges?.chargeable_days || 0,
                storageCharges: parseFloat(charges?.storageCharges || charges?.storage_charges || 0),
                handlingCharges: parseFloat(charges?.handlingCharges || charges?.handling_charges || 0),
                totalCharges: parseFloat(charges?.totalCharges || charges?.total_charges || 0)
            };
            
            // Create invoice data
            const invoiceData = {
                shipment_id: shipment.id,
                barcode: shipment.barcode,
                shipper: shipment.shipper,
                consignee: shipment.consignee,
                weight: shipment.weight,
                pieces: shipment.pieces,
                rack: shipment.rack,
                in_date: shipment.in_date,
                out_date: new Date().toISOString(),
                storage_days: safeCharges.storageDays,
                chargeable_days: safeCharges.chargeableDays,
                storage_charges: safeCharges.storageCharges,
                handling_charges: safeCharges.handlingCharges,
                total_charges: safeCharges.totalCharges,
                invoice_number: this.generateInvoiceNumber(),
                invoice_date: new Date().toISOString()
            };
            
            // Store current invoice data for PDF generation
            this.currentInvoiceData = invoiceData;
            
            // Display invoice in modal
            this.displayInvoiceModal(invoiceData);
            
            // Save invoice to database
            await dbManager.createInvoice(invoiceData);
            
            return invoiceData;
            
        } catch (error) {
            console.error('Error generating invoice:', error);
            showMessage('Error generating invoice', 'error');
            throw error;
        }
    }

    // Generate unique invoice number
    generateInvoiceNumber() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const time = String(date.getTime()).slice(-6);
        
        return `INV${year}${month}${day}${time}`;
    }

    // Display invoice in modal
    displayInvoiceModal(invoiceData) {
        const modal = document.getElementById('invoiceModal');
        const content = document.getElementById('invoiceContent');
        
        content.innerHTML = this.generateInvoiceHTML(invoiceData);
        modal.style.display = 'block';
    }

    // Generate invoice HTML content
    generateInvoiceHTML(invoiceData) {
        const inDate = new Date(invoiceData.in_date);
        const outDate = new Date(invoiceData.out_date);
        const invoiceDate = new Date(invoiceData.invoice_date);
        
        const logoUrl = (window.warehouseApp && warehouseApp.siteSettings && warehouseApp.siteSettings.logoUrl) ? warehouseApp.siteSettings.logoUrl : 'http://qgocargo.com/logo.png';
        return `
            <div class="invoice-header">
                <div style="display:flex; align-items:center; gap:12px;">
                    <img src="${logoUrl}" alt="Company Logo" style="height:48px;" onerror="this.style.display='none'">
                    <h2 style="margin:0;">${APP_CONFIG.INVOICE.company_name}</h2>
                </div>
                <p>${APP_CONFIG.INVOICE.company_address}</p>
                <p>Phone: ${APP_CONFIG.INVOICE.company_phone} | Email: ${APP_CONFIG.INVOICE.company_email}</p>
                <hr style="margin: 1rem 0;">
                <h3>STORAGE INVOICE</h3>
                <p><strong>Invoice #:</strong> ${invoiceData.invoice_number}</p>
                <p><strong>Date:</strong> ${this.formatDate(invoiceDate)}</p>
            </div>

            <div class="invoice-details">
                <div class="invoice-section">
                    <h4>Shipment Details</h4>
                    <p><strong>Barcode:</strong> ${invoiceData.barcode}</p>
                    <p><strong>Shipper:</strong> ${invoiceData.shipper}</p>
                    <p><strong>Consignee:</strong> ${invoiceData.consignee}</p>
                    <p><strong>Weight:</strong> ${invoiceData.weight} kg</p>
                    <p><strong>Pieces:</strong> ${invoiceData.pieces}</p>
                    <p><strong>Rack/Location:</strong> ${invoiceData.rack}</p>
                </div>
                
                <div class="invoice-section">
                    <h4>Storage Period</h4>
                    <p><strong>Check-in:</strong> ${this.formatDate(inDate)}</p>
                    <p><strong>Check-out:</strong> ${this.formatDate(outDate)}</p>
                    <p><strong>Total Days:</strong> ${invoiceData.storage_days}</p>
                    <p><strong>Chargeable Days:</strong> ${invoiceData.chargeable_days}</p>
                </div>
            </div>

            <table class="invoice-table">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>Days</th>
                        <th>Weight (kg)</th>
                        <th>Rate</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Storage Charges</td>
                        <td>${invoiceData.chargeable_days}</td>
                        <td>${invoiceData.weight}</td>
                        <td>-</td>
                        <td>KD ${(Number(invoiceData.storage_charges || 0)).toFixed(3)}</td>
                    </tr>
                    ${invoiceData.handling_charges > 0 ? `
                    <tr>
                        <td>Handling Fee</td>
                        <td>-</td>
                        <td>-</td>
                        <td>-</td>
                        <td>KD ${(Number(invoiceData.handling_charges || 0)).toFixed(3)}</td>
                    </tr>
                    ` : ''}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="4" class="invoice-total"><strong>Total Amount:</strong></td>
                        <td class="invoice-total"><strong>KD ${(Number(invoiceData.total_charges || 0)).toFixed(3)}</strong></td>
                    </tr>
                </tfoot>
            </table>

            <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e5e7eb;">
                <p style="font-size: 0.9rem; color: #6b7280;">
                    <strong>Payment Terms:</strong> Payment is due upon receipt of this invoice.
                </p>
                <p style="font-size: 0.9rem; color: #6b7280; margin-top: 0.5rem;">
                    Thank you for using our warehouse services!
                </p>
            </div>
        `;
    }

    // Generate PDF invoice
    async generatePDF() {
        if (!this.currentInvoiceData) {
            showMessage('No invoice data available', 'error');
            return;
        }

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Set font
            doc.setFont('helvetica');
            
            // Header
            doc.setFontSize(20);
            doc.setTextColor(40);
            // Try draw logo (optional). Requires CORS-friendly image.
            try {
                const logo = new Image();
                logo.crossOrigin = 'Anonymous';
                logo.src = (window.warehouseApp && warehouseApp.siteSettings && warehouseApp.siteSettings.logoUrl) ? warehouseApp.siteSettings.logoUrl : 'http://qgocargo.com/logo.png';
                // Draw after load synchronously by using onload with a minimal await via Promise
                await new Promise((resolve, reject) => {
                    logo.onload = () => { try { doc.addImage(logo, 'PNG', 20, 15, 30, 30); } catch(e){} resolve(); };
                    logo.onerror = () => resolve();
                });
            } catch (e) { /* ignore */ }
            doc.text(APP_CONFIG.INVOICE.company_name, 55, 30);
            
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(APP_CONFIG.INVOICE.company_address, 20, 40);
            doc.text(`Phone: ${APP_CONFIG.INVOICE.company_phone} | Email: ${APP_CONFIG.INVOICE.company_email}`, 20, 48);
            
            // Invoice title
            doc.setFontSize(16);
            doc.setTextColor(40);
            doc.text('STORAGE INVOICE', 20, 65);
            
            // Invoice details
            doc.setFontSize(10);
            doc.text(`Invoice #: ${this.currentInvoiceData.invoice_number}`, 20, 75);
            doc.text(`Date: ${this.formatDate(new Date(this.currentInvoiceData.invoice_date))}`, 20, 85);
            
            // Shipment details
            doc.setFontSize(12);
            doc.setTextColor(40);
            doc.text('Shipment Details', 20, 105);
            
            doc.setFontSize(10);
            doc.setTextColor(100);
            let yPos = 115;
            const details = [
                `Barcode: ${this.currentInvoiceData.barcode}`,
                `Shipper: ${this.currentInvoiceData.shipper}`,
                `Consignee: ${this.currentInvoiceData.consignee}`,
                `Weight: ${this.currentInvoiceData.weight} kg`,
                `Pieces: ${this.currentInvoiceData.pieces}`,
                `Rack/Location: ${this.currentInvoiceData.rack}`
            ];
            
            details.forEach(detail => {
                doc.text(detail, 20, yPos);
                yPos += 8;
            });
            
            // Storage period
            doc.setFontSize(12);
            doc.setTextColor(40);
            doc.text('Storage Period', 110, 105);
            
            doc.setFontSize(10);
            doc.setTextColor(100);
            yPos = 115;
            const periodDetails = [
                `Check-in: ${this.formatDate(new Date(this.currentInvoiceData.in_date))}`,
                `Check-out: ${this.formatDate(new Date(this.currentInvoiceData.out_date))}`,
                `Total Days: ${this.currentInvoiceData.storage_days}`,
                `Chargeable Days: ${this.currentInvoiceData.chargeable_days}`
            ];
            
            periodDetails.forEach(detail => {
                doc.text(detail, 110, yPos);
                yPos += 8;
            });
            
            // Charges table
            yPos = 170;
            doc.setFontSize(12);
            doc.setTextColor(40);
            doc.text('Charges', 20, yPos);
            
            // Table headers
            yPos += 15;
            doc.setFontSize(10);
            doc.setTextColor(40);
            doc.text('Description', 20, yPos);
            doc.text('Amount', 150, yPos);
            
            // Table line
            yPos += 5;
            doc.line(20, yPos, 190, yPos);
            
            // Storage charges
            yPos += 10;
            doc.setTextColor(100);
            doc.text('Storage Charges', 20, yPos);
            doc.text(`KD ${(Number(this.currentInvoiceData.storage_charges || 0)).toFixed(3)}`, 150, yPos);
            
            // Handling charges
            if (this.currentInvoiceData.handling_charges > 0) {
                yPos += 8;
                doc.text('Handling Fee', 20, yPos);
                doc.text(`KD ${(Number(this.currentInvoiceData.handling_charges || 0)).toFixed(3)}`, 150, yPos);
            }
            
            // Total line
            yPos += 10;
            doc.line(140, yPos, 190, yPos);
            
            // Total
            yPos += 10;
            doc.setFontSize(12);
            doc.setTextColor(40);
            doc.text('Total Amount:', 20, yPos);
            doc.text(`KD ${(Number(this.currentInvoiceData.total_charges || 0)).toFixed(3)}`, 150, yPos);
            
            // Footer
            yPos += 20;
            doc.setFontSize(9);
            doc.setTextColor(100);
            doc.text('Payment Terms: Payment is due upon receipt of this invoice.', 20, yPos);
            doc.text('Thank you for using our warehouse services!', 20, yPos + 8);
            
            // Save the PDF
            const filename = `invoice-${this.currentInvoiceData.invoice_number}.pdf`;
            doc.save(filename);
            
            showMessage(`Invoice PDF downloaded: ${filename}`, 'success');
            
        } catch (error) {
            console.error('Error generating PDF:', error);
            showMessage('Error generating PDF invoice', 'error');
        }
    }

    // Format date for display
    formatDate(date) {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Close invoice modal
    closeModal() {
        const modal = document.getElementById('invoiceModal');
        modal.style.display = 'none';
        this.currentInvoiceData = null;
    }
}

// Global invoice manager instance
const invoiceManager = new InvoiceManager();
// Expose to window for cross-module access
window.invoiceManager = invoiceManager;

// Functions called from HTML
function closeInvoiceModal() {
    invoiceManager.closeModal();
}

function downloadInvoice() {
    invoiceManager.generatePDF();
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    const modal = document.getElementById('invoiceModal');
    if (event.target === modal) {
        invoiceManager.closeModal();
    }
});