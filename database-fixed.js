// Database Management Functions - FIXED VERSION
class DatabaseManager {
    constructor() {
        this.initialized = false;
    }

    // Initialize database tables
    async initializeDatabase() {
        if (this.initialized) return true;

        try {
            console.log('🔧 Initializing database...');
            
            // Check if tables exist and create them if necessary
            await this.ensureTablesExist();
            await this.ensureDefaultPricingSettings();
            
            this.initialized = true;
            console.log('✅ Database initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            showMessage('Database initialization failed: ' + error.message, 'error');
            return false;
        }
    }

    // Ensure all required tables exist
    async ensureTablesExist() {
        // Note: Tables should be created in Supabase dashboard
        // This function just validates they exist
        const tables = ['shipments', 'pricing_settings', 'invoices'];
        
        for (const table of tables) {
            try {
                const { data, error } = await supabase
                    .from(table)
                    .select('id')
                    .limit(1);
                
                if (error) {
                    console.error(`Table validation failed for ${table}:`, error);
                    throw new Error(`Table '${table}' access failed: ${error.message}. Please ensure tables are created in Supabase.`);
                }
                console.log(`✅ Table '${table}' is accessible`);
            } catch (error) {
                console.error(`Table validation failed for ${table}:`, error);
                throw error;
            }
        }
    }

    // Ensure default pricing settings exist
    async ensureDefaultPricingSettings() {
        try {
            const { data, error } = await supabase
                .from('pricing_settings')
                .select('*');
            
            if (error) {
                console.error('Error checking pricing settings:', error);
                return;
            }
            
            if (!data || data.length === 0) {
                console.log('Creating default pricing settings...');
                const defaultSettings = [
                    { setting_key: 'per_kg_day', setting_value: 0.50, is_enabled: true, description: 'Storage charge per kg per day' },
                    { setting_key: 'handling_fee', setting_value: 10.00, is_enabled: true, description: 'One-time handling fee' },
                    { setting_key: 'free_days', setting_value: 2, is_enabled: true, description: 'Number of free storage days' },
                    { setting_key: 'flat_rate', setting_value: 25.00, is_enabled: false, description: 'Flat rate storage charge' },
                    { setting_key: 'per_day_rate', setting_value: 3.00, is_enabled: false, description: 'Per day storage charge' }
                ];
                
                const { data: insertData, error: insertError } = await supabase
                    .from('pricing_settings')
                    .insert(defaultSettings)
                    .select();
                
                if (insertError) {
                    console.error('Error creating default pricing settings:', insertError);
                } else {
                    console.log('✅ Default pricing settings created');
                }
            }
        } catch (error) {
            console.error('Error ensuring default pricing settings:', error);
        }
    }

    // Shipment operations
    async createShipment(shipmentData) {
        try {
            console.log('Creating shipment with data:', shipmentData);
            
            const shipment = {
                barcode: shipmentData.barcode,
                shipper: shipmentData.shipper,
                consignee: shipmentData.consignee,
                weight: parseFloat(shipmentData.weight),
                pieces: parseInt(shipmentData.pieces),
                rack: shipmentData.rack,
                notes: shipmentData.notes || '',
                status: 'in',
                in_date: new Date().toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('shipments')
                .insert([shipment])
                .select();

            if (error) {
                console.error('Supabase error creating shipment:', error);
                throw error;
            }

            console.log('Shipment created successfully:', data[0]);
            return data[0];
        } catch (error) {
            console.error('Error creating shipment:', error);
            throw error;
        }
    }

    async generateUniqueBarcode() {
        try {
            const prefix = 'WH';
            const date = new Date();
            const year = date.getFullYear().toString().slice(-2);
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            
            let attempts = 0;
            let barcode;
            
            do {
                const randomNum = Math.floor(1000 + Math.random() * 9000);
                barcode = `${prefix}${year}${month}${day}${randomNum}`;
                
                const { data, error } = await supabase
                    .from('shipments')
                    .select('barcode')
                    .eq('barcode', barcode)
                    .limit(1);
                
                if (error) throw error;
                if (!data || data.length === 0) break;
                
                attempts++;
            } while (attempts < 10);
            
            if (attempts >= 10) {
                throw new Error('Unable to generate unique barcode after 10 attempts');
            }
            
            return barcode;
        } catch (error) {
            console.error('Error generating unique barcode:', error);
            throw error;
        }
    }

    async getShipmentByBarcode(barcode) {
        try {
            const { data, error } = await supabase
                .from('shipments')
                .select('*')
                .eq('barcode', barcode)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return data;
        } catch (error) {
            console.error('Error getting shipment by barcode:', error);
            return null;
        }
    }

    async searchShipments(query, status = 'all') {
        try {
            let queryBuilder = supabase
                .from('shipments')
                .select('*')
                .order('created_at', { ascending: false });

            if (status !== 'all') {
                queryBuilder = queryBuilder.eq('status', status);
            }

            if (query && query.trim() !== '') {
                queryBuilder = queryBuilder.or(`barcode.ilike.%${query}%,shipper.ilike.%${query}%,consignee.ilike.%${query}%,rack.ilike.%${query}%`);
            }

            const { data, error } = await queryBuilder;

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error searching shipments:', error);
            return [];
        }
    }

    async releaseShipment(shipmentId) {
        try {
            const { data, error } = await supabase
                .from('shipments')
                .update({ 
                    status: 'out',
                    out_date: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', shipmentId)
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            console.error('Error releasing shipment:', error);
            throw error;
        }
    }

    async getDashboardStats() {
        try {
            const { data: shipments, error } = await supabase
                .from('shipments')
                .select('*');

            if (error) throw error;

            const stats = {
                totalShipments: shipments.length,
                shipmentsIn: shipments.filter(s => s.status === 'in').length,
                shipmentsOut: shipments.filter(s => s.status === 'out').length,
                occupiedRacks: [...new Set(shipments.filter(s => s.status === 'in').map(s => s.rack))].length,
                totalWeight: shipments.filter(s => s.status === 'in').reduce((sum, s) => sum + parseFloat(s.weight || 0), 0),
                dailyRevenue: 0, // Will be calculated from invoices
                monthlyRevenue: 0 // Will be calculated from invoices
            };

            // Calculate revenue from invoices
            const { data: invoices, error: invoiceError } = await supabase
                .from('invoices')
                .select('total_charges, invoice_date');

            if (!invoiceError && invoices) {
                const today = new Date();
                const todayStr = today.toISOString().split('T')[0];
                const thisMonth = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0');

                stats.dailyRevenue = invoices
                    .filter(inv => inv.invoice_date.startsWith(todayStr))
                    .reduce((sum, inv) => sum + parseFloat(inv.total_charges || 0), 0);

                stats.monthlyRevenue = invoices
                    .filter(inv => inv.invoice_date.startsWith(thisMonth))
                    .reduce((sum, inv) => sum + parseFloat(inv.total_charges || 0), 0);
            }

            return stats;
        } catch (error) {
            console.error('Error getting dashboard stats:', error);
            return {
                totalShipments: 0,
                shipmentsIn: 0,
                shipmentsOut: 0,
                occupiedRacks: 0,
                totalWeight: 0,
                dailyRevenue: 0,
                monthlyRevenue: 0
            };
        }
    }

    // Pricing operations
    async getPricingSettings() {
        try {
            const { data, error } = await supabase
                .from('pricing_settings')
                .select('*')
                .order('setting_key');

            if (error) throw error;
            
            // Convert to object format for easier use
            const settings = {};
            if (data) {
                data.forEach(setting => {
                    settings[setting.setting_key] = setting.setting_value;
                    settings[setting.setting_key + '_enabled'] = setting.is_enabled;
                });
            }
            
            return settings;
        } catch (error) {
            console.error('Error fetching pricing settings:', error);
            // Return default values if error
            return {
                per_kg_day: 0.50,
                per_kg_day_enabled: true,
                handling_fee: 10.00,
                handling_fee_enabled: true,
                free_days: 2,
                free_days_enabled: true,
                flat_rate: 25.00,
                flat_rate_enabled: false,
                per_day_rate: 3.00,
                per_day_rate_enabled: false
            };
        }
    }

    async updatePricingSettings(settings) {
        try {
            console.log('Updating pricing settings:', settings);
            
            // Update each setting individually
            const updates = [];
            for (const [key, value] of Object.entries(settings)) {
                if (key.endsWith('_enabled')) {
                    // Handle boolean enabled flags
                    const settingKey = key.replace('_enabled', '');
                    const { data, error } = await supabase
                        .from('pricing_settings')
                        .update({ 
                            is_enabled: value,
                            updated_at: new Date().toISOString()
                        })
                        .eq('setting_key', settingKey)
                        .select();
                    
                    if (error) {
                        console.error(`Error updating ${settingKey} enabled status:`, error);
                    } else if (data && data[0]) {
                        updates.push(data[0]);
                    }
                } else {
                    // Handle value updates
                    const { data, error } = await supabase
                        .from('pricing_settings')
                        .update({ 
                            setting_value: parseFloat(value) || 0,
                            updated_at: new Date().toISOString()
                        })
                        .eq('setting_key', key)
                        .select();
                    
                    if (error) {
                        console.error(`Error updating ${key}:`, error);
                    } else if (data && data[0]) {
                        updates.push(data[0]);
                    }
                }
            }
            
            console.log('Pricing settings updated successfully:', updates);
            return updates;
        } catch (error) {
            console.error('Error updating pricing settings:', error);
            throw error;
        }
    }

    // Invoice operations
    async createInvoice(invoiceData) {
        try {
            console.log('Creating invoice with data:', invoiceData);
            
            // Generate unique invoice number
            const invoiceNumber = 'INV' + Date.now() + Math.floor(Math.random() * 1000);
            
            const invoiceRecord = {
                invoice_number: invoiceNumber,
                shipment_id: invoiceData.shipment_id,
                barcode: invoiceData.barcode,
                storage_days: parseInt(invoiceData.storage_days) || 0,
                chargeable_days: parseInt(invoiceData.chargeable_days) || 0,
                storage_charges: parseFloat(invoiceData.storage_charges) || 0,
                handling_charges: parseFloat(invoiceData.handling_charges) || 0,
                other_charges: parseFloat(invoiceData.other_charges) || 0,
                total_charges: parseFloat(invoiceData.total_charges) || 0,
                invoice_date: new Date().toISOString(),
                created_at: new Date().toISOString()
            };
            
            const { data, error } = await supabase
                .from('invoices')
                .insert([invoiceRecord])
                .select();

            if (error) {
                console.error('Supabase error creating invoice:', error);
                throw error;
            }
            
            console.log('Invoice created successfully:', data[0]);
            return data[0];
        } catch (error) {
            console.error('Error creating invoice:', error);
            throw error;
        }
    }

    calculateStorageCharges(shipment, pricingSettings) {
        try {
            const inDate = new Date(shipment.in_date);
            const outDate = shipment.out_date ? new Date(shipment.out_date) : new Date();
            const storageDays = Math.ceil((outDate - inDate) / (1000 * 60 * 60 * 24));
            
            const freeDays = parseInt(pricingSettings.free_days) || 0;
            const chargeableDays = Math.max(0, storageDays - freeDays);
            
            let storageCharges = 0;
            let handlingCharges = 0;
            
            // Calculate storage charges based on enabled pricing model
            if (pricingSettings.flat_rate_enabled) {
                storageCharges = parseFloat(pricingSettings.flat_rate) || 0;
            } else if (pricingSettings.per_day_rate_enabled) {
                storageCharges = chargeableDays * (parseFloat(pricingSettings.per_day_rate) || 0);
            } else if (pricingSettings.per_kg_day_enabled) {
                const perKgDay = parseFloat(pricingSettings.per_kg_day) || 0;
                const weight = parseFloat(shipment.weight) || 0;
                storageCharges = chargeableDays * weight * perKgDay;
            }
            
            // Add handling charges if enabled
            if (pricingSettings.handling_fee_enabled) {
                handlingCharges = parseFloat(pricingSettings.handling_fee) || 0;
            }
            
            const totalCharges = storageCharges + handlingCharges;
            
            return {
                storageDays: storageDays,
                chargeableDays: chargeableDays,
                storageCharges: Math.round(storageCharges * 100) / 100,
                handlingCharges: Math.round(handlingCharges * 100) / 100,
                totalCharges: Math.round(totalCharges * 100) / 100
            };
        } catch (error) {
            console.error('Error calculating storage charges:', error);
            return {
                storageDays: 0,
                chargeableDays: 0,
                storageCharges: 0,
                handlingCharges: 0,
                totalCharges: 0
            };
        }
    }
}

// Initialize database manager
const db = new DatabaseManager();