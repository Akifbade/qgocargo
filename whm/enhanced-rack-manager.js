// Enhanced Rack Management System with Sections and Capacity
class EnhancedRackManager {
    constructor() {
        this.rackSections = new Map();
        this.createdRacks = new Map();
        this.rackSettings = {
            defaultCapacity: 4, // Default 3-4 shipments per rack
            allowDuplicates: false,
            autoNumbering: true
        };
        this.supabase = null;
        
        this.initializeSystem();
    }

    async initializeSystem() {
        try {
            // Initialize Supabase connection
            if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
                this.supabase = window.supabase.createClient(
                    window.SUPABASE_URL,
                    window.SUPABASE_ANON_KEY
                );
            }

            // Load existing racks from database
            await this.loadExistingRacks();
            
            // Load rack settings and local data
            this.loadRackSettings();
            
            console.log('✅ Enhanced Rack Manager initialized');
        } catch (error) {
            console.error('❌ Error initializing rack manager:', error);
        }
    }

    // Load existing racks from database
    async loadExistingRacks() {
        try {
            if (!this.supabase) return;

            const { data: racks, error } = await this.supabase
                .from('warehouse_racks')
                .select('*')
                .order('created_at', { ascending: true });

            if (error && error.code !== '42P01') { // Ignore if table doesn't exist
                console.warn('Could not load existing racks:', error);
                return;
            }

            if (racks && racks.length > 0) {
                racks.forEach(rack => {
                    this.createdRacks.set(rack.id, {
                        id: rack.id,
                        section: rack.section,
                        rackNumber: rack.rack_number,
                        qrCode: rack.qr_code,
                        capacity: rack.capacity || this.rackSettings.defaultCapacity,
                        currentOccupancy: rack.current_occupancy || 0,
                        status: rack.status || 'available',
                        createdAt: rack.created_at,
                        description: rack.description
                    });

                    // Group by section
                    if (!this.rackSections.has(rack.section)) {
                        this.rackSections.set(rack.section, []);
                    }
                    this.rackSections.get(rack.section).push(rack.id);
                });

                console.log(`📦 Loaded ${racks.length} existing racks from database`);
            }
        } catch (error) {
            console.warn('Warning loading existing racks:', error);
        }
    }

    // Save rack to database
    async saveRackToDatabase(rack) {
        try {
            if (!this.supabase) return;

            const rackData = {
                id: rack.id,
                section: rack.section,
                rack_number: rack.rackNumber,
                qr_code: rack.qrCode,
                capacity: rack.capacity,
                current_occupancy: rack.currentOccupancy,
                status: rack.status,
                description: rack.description,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { error } = await this.supabase
                .from('warehouse_racks')
                .upsert(rackData, { onConflict: 'id' });

            if (error) {
                console.warn('Could not save rack to database:', error);
                // Continue without database - store locally only
            } else {
                console.log(`💾 Saved rack ${rack.id} to database`);
            }
        } catch (error) {
            console.warn('Warning saving rack:', error);
        }
    }

    // Create new section with racks
    async createRackSection(sectionName, startNumber, endNumber, prefix = '', capacity = null) {
        try {
            // Validate inputs
            if (!sectionName || !startNumber || !endNumber) {
                throw new Error('Section name, start number, and end number are required');
            }

            if (startNumber > endNumber) {
                throw new Error('Start number must be less than or equal to end number');
            }

            const rackCapacity = capacity || this.rackSettings.defaultCapacity;
            const newRacks = [];
            const duplicates = [];

            // Generate rack IDs
            for (let i = startNumber; i <= endNumber; i++) {
                const rackNumber = String(i).padStart(3, '0'); // 001, 002, etc.
                const rackId = prefix ? `${sectionName}-${prefix}-${rackNumber}` : `${sectionName}-${rackNumber}`;
                
                // Check for duplicates
                if (this.createdRacks.has(rackId) && !this.rackSettings.allowDuplicates) {
                    duplicates.push(rackId);
                    continue;
                }

                // Create rack object
                const rack = {
                    id: rackId,
                    section: sectionName,
                    rackNumber: rackNumber,
                    qrCode: `RACK_${rackId.replace(/-/g, '_')}`,
                    capacity: rackCapacity,
                    currentOccupancy: 0,
                    status: 'available',
                    description: `Section ${sectionName} Rack ${rackNumber}`,
                    createdAt: new Date().toISOString()
                };

                // Add to created racks
                this.createdRacks.set(rackId, rack);
                newRacks.push(rack);

                // Save to database
                await this.saveRackToDatabase(rack);
            }

            // Group by section
            if (!this.rackSections.has(sectionName)) {
                this.rackSections.set(sectionName, []);
            }
            
            newRacks.forEach(rack => {
                this.rackSections.get(sectionName).push(rack.id);
            });

            // Save settings
            this.saveRackSettings();

            console.log(`✅ Created ${newRacks.length} racks in section ${sectionName}`);
            
            if (duplicates.length > 0) {
                console.warn(`⚠️ Skipped ${duplicates.length} duplicate racks:`, duplicates);
            }

            return {
                success: true,
                created: newRacks.length,
                duplicates: duplicates.length,
                racks: newRacks,
                skipped: duplicates
            };

        } catch (error) {
            console.error('❌ Error creating rack section:', error);
            throw error;
        }
    }

    // Delete rack
    async deleteRack(rackId) {
        try {
            if (!this.createdRacks.has(rackId)) {
                throw new Error('Rack not found');
            }

            const rack = this.createdRacks.get(rackId);
            
            // Remove from database
            if (this.supabase) {
                const { error } = await this.supabase
                    .from('warehouse_racks')
                    .delete()
                    .eq('id', rackId);

                if (error) {
                    console.warn('Could not delete from database:', error);
                }
            }

            // Remove from local storage
            this.createdRacks.delete(rackId);
            
            // Remove from section
            if (this.rackSections.has(rack.section)) {
                const sectionRacks = this.rackSections.get(rack.section);
                const index = sectionRacks.indexOf(rackId);
                if (index > -1) {
                    sectionRacks.splice(index, 1);
                }
                
                // Remove section if empty
                if (sectionRacks.length === 0) {
                    this.rackSections.delete(rack.section);
                }
            }

            this.saveRackSettings();
            console.log(`🗑️ Deleted rack ${rackId}`);
            
            return true;
        } catch (error) {
            console.error('❌ Error deleting rack:', error);
            throw error;
        }
    }

    // Update rack capacity
    async updateRackCapacity(rackId, newCapacity) {
        try {
            if (!this.createdRacks.has(rackId)) {
                throw new Error('Rack not found');
            }

            const rack = this.createdRacks.get(rackId);
            rack.capacity = newCapacity;
            
            // Update in database
            await this.saveRackToDatabase(rack);
            
            this.saveRackSettings();
            console.log(`📝 Updated rack ${rackId} capacity to ${newCapacity}`);
            
            return true;
        } catch (error) {
            console.error('❌ Error updating rack capacity:', error);
            throw error;
        }
    }

    // Get all sections
    getSections() {
        return Array.from(this.rackSections.keys()).sort();
    }

    // Get racks in section
    getRacksInSection(sectionName) {
        const rackIds = this.rackSections.get(sectionName) || [];
        return rackIds.map(id => this.createdRacks.get(id)).filter(Boolean);
    }

    // Get all created racks
    getAllRacks() {
        return Array.from(this.createdRacks.values()).sort((a, b) => a.id.localeCompare(b.id));
    }

    // Get rack by ID
    getRack(rackId) {
        return this.createdRacks.get(rackId);
    }

    // Check if rack exists
    rackExists(rackId) {
        return this.createdRacks.has(rackId);
    }

    // Get statistics
    getStatistics() {
        const totalRacks = this.createdRacks.size;
        const sections = this.rackSections.size;
        let totalCapacity = 0;
        let totalOccupancy = 0;

        for (const rack of this.createdRacks.values()) {
            totalCapacity += rack.capacity;
            totalOccupancy += rack.currentOccupancy;
        }

        return {
            totalRacks,
            sections,
            totalCapacity,
            totalOccupancy,
            utilizationRate: totalCapacity > 0 ? (totalOccupancy / totalCapacity * 100).toFixed(1) : 0
        };
    }

    // Generate QR codes for section
    async generateSectionQRCodes(sectionName) {
        try {
            const racks = this.getRacksInSection(sectionName);
            if (racks.length === 0) {
                throw new Error('No racks found in section');
            }

            // Generate PDF with QR codes
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF();
            
            let y = 20;
            const pageHeight = pdf.internal.pageSize.height;
            const qrSize = 50;
            const margin = 20;

            pdf.setFontSize(16);
            pdf.text(`Section ${sectionName} - Rack QR Codes`, margin, y);
            y += 20;

            for (let i = 0; i < racks.length; i++) {
                const rack = racks[i];
                
                // Check if we need a new page
                if (y + qrSize + 30 > pageHeight) {
                    pdf.addPage();
                    y = 20;
                }

                // Try different QR libraries
                let qrGenerated = false;

                // Method 1: QRCode library
                if (window.QRCode && !qrGenerated) {
                    try {
                        const canvas = document.createElement('canvas');
                        QRCode.toCanvas(canvas, rack.qrCode, { width: 200 });
                        const qrDataUrl = canvas.toDataURL();
                        pdf.addImage(qrDataUrl, 'PNG', margin, y, qrSize, qrSize);
                        qrGenerated = true;
                    } catch (e) {
                        console.warn('QRCode library failed:', e);
                    }
                }

                // Method 2: QRious library
                if (window.QRious && !qrGenerated) {
                    try {
                        const qr = new QRious({
                            value: rack.qrCode,
                            size: 200
                        });
                        pdf.addImage(qr.toDataURL(), 'PNG', margin, y, qrSize, qrSize);
                        qrGenerated = true;
                    } catch (e) {
                        console.warn('QRious library failed:', e);
                    }
                }

                // Add rack information
                pdf.setFontSize(12);
                pdf.text(`Rack ID: ${rack.id}`, margin + qrSize + 10, y + 15);
                pdf.text(`QR Code: ${rack.qrCode}`, margin + qrSize + 10, y + 25);
                pdf.text(`Capacity: ${rack.capacity} shipments`, margin + qrSize + 10, y + 35);
                pdf.text(`Section: ${rack.section}`, margin + qrSize + 10, y + 45);

                if (!qrGenerated) {
                    pdf.setFontSize(10);
                    pdf.text('QR code generation failed', margin, y + 25);
                    pdf.text('Manual code: ' + rack.qrCode, margin, y + 35);
                }

                y += qrSize + 20;
            }

            // Save PDF
            const filename = `Section_${sectionName}_Rack_QR_Codes_${new Date().toISOString().split('T')[0]}.pdf`;
            pdf.save(filename);

            console.log(`✅ Generated QR codes PDF for section ${sectionName}`);
            return true;

        } catch (error) {
            console.error('❌ Error generating QR codes:', error);
            throw error;
        }
    }

    // Load rack settings
    loadRackSettings() {
        try {
            // Load from localStorage first
            const savedSettings = localStorage.getItem('enhanced_rack_settings');
            if (savedSettings) {
                this.rackSettings = { ...this.rackSettings, ...JSON.parse(savedSettings) };
            }

            // Load rack data from localStorage
            const savedData = localStorage.getItem('enhanced_rack_data');
            if (savedData) {
                const data = JSON.parse(savedData);
                
                // Restore sections
                if (data.sections) {
                    this.rackSections = new Map(data.sections);
                }
                
                // Restore racks
                if (data.racks) {
                    this.createdRacks = new Map(data.racks);
                }
                
                console.log(`📦 Loaded ${this.createdRacks.size} racks from localStorage`);
            }
        } catch (error) {
            console.warn('Could not load rack settings:', error);
        }
    }

    // Save rack settings
    saveRackSettings() {
        try {
            localStorage.setItem('enhanced_rack_settings', JSON.stringify(this.rackSettings));
            localStorage.setItem('enhanced_rack_data', JSON.stringify({
                sections: Array.from(this.rackSections.entries()),
                racks: Array.from(this.createdRacks.entries())
            }));
        } catch (error) {
            console.warn('Could not save rack settings:', error);
        }
    }

    // Update settings
    updateSettings(newSettings) {
        this.rackSettings = { ...this.rackSettings, ...newSettings };
        this.saveRackSettings();
    }

    // Export rack data
    exportRackData() {
        const data = {
            sections: Array.from(this.rackSections.entries()),
            racks: Array.from(this.createdRacks.entries()),
            settings: this.rackSettings,
            exportedAt: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `warehouse_racks_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// Global instance
let enhancedRackManager;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    enhancedRackManager = new EnhancedRackManager();
});