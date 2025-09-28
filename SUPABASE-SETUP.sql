-- ===================================================
-- WAREHOUSE MANAGEMENT SYSTEM - DATABASE SETUP SQL
-- ===================================================
-- Copy and paste this entire script into Supabase SQL Editor
-- Go to: https://exovuqedyedhqzorajca.supabase.co → SQL Editor → New Query

-- 1. CREATE SHIPMENTS TABLE
-- ===================================================
CREATE TABLE IF NOT EXISTS shipments (
    id SERIAL PRIMARY KEY,
    barcode VARCHAR(50) UNIQUE NOT NULL,
    shipper VARCHAR(255) NOT NULL,
    consignee VARCHAR(255) NOT NULL,
    weight DECIMAL(10,2) NOT NULL CHECK (weight > 0),
    pieces INTEGER NOT NULL CHECK (pieces > 0),
    rack VARCHAR(100) NOT NULL,
    notes TEXT,
    in_date TIMESTAMPTZ DEFAULT NOW(),
    out_date TIMESTAMPTZ NULL,
    status VARCHAR(20) DEFAULT 'in' CHECK (status IN ('in', 'out')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CREATE PRICING SETTINGS TABLE
-- ===================================================
CREATE TABLE IF NOT EXISTS pricing_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value DECIMAL(10,4) NOT NULL CHECK (setting_value >= 0),
    is_enabled BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CREATE INVOICES TABLE
-- ===================================================
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    shipment_id INTEGER REFERENCES shipments(id) ON DELETE CASCADE,
    barcode VARCHAR(50) NOT NULL,
    storage_days INTEGER NOT NULL CHECK (storage_days >= 0),
    chargeable_days INTEGER NOT NULL CHECK (chargeable_days >= 0),
    storage_charges DECIMAL(10,2) DEFAULT 0 CHECK (storage_charges >= 0),
    handling_charges DECIMAL(10,2) DEFAULT 0 CHECK (handling_charges >= 0),
    other_charges DECIMAL(10,2) DEFAULT 0 CHECK (other_charges >= 0),
    total_charges DECIMAL(10,2) NOT NULL CHECK (total_charges >= 0),
    invoice_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. INSERT DEFAULT PRICING SETTINGS
-- ===================================================
INSERT INTO pricing_settings (setting_key, setting_value, is_enabled, description) VALUES
    ('per_kg_day', 0.50, true, 'Storage charge per kg per day in USD'),
    ('handling_fee', 10.00, true, 'One-time handling fee in USD'),
    ('free_days', 2, true, 'Number of free storage days'),
    ('flat_rate', 25.00, false, 'Flat rate storage charge in USD (alternative pricing)'),
    ('per_day_rate', 3.00, false, 'Per day storage charge in USD (alternative pricing)')
ON CONFLICT (setting_key) DO NOTHING;

-- 5. CREATE INDEXES FOR PERFORMANCE
-- ===================================================
CREATE INDEX IF NOT EXISTS idx_shipments_barcode ON shipments(barcode);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_in_date ON shipments(in_date);
CREATE INDEX IF NOT EXISTS idx_shipments_shipper ON shipments(shipper);
CREATE INDEX IF NOT EXISTS idx_shipments_consignee ON shipments(consignee);
CREATE INDEX IF NOT EXISTS idx_invoices_barcode ON invoices(barcode);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_shipment ON invoices(shipment_id);

-- 6. CREATE UPDATED_AT TRIGGER FUNCTION
-- ===================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. CREATE TRIGGERS FOR AUTO-UPDATING TIMESTAMPS
-- ===================================================
DROP TRIGGER IF EXISTS update_shipments_updated_at ON shipments;
CREATE TRIGGER update_shipments_updated_at
    BEFORE UPDATE ON shipments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pricing_settings_updated_at ON pricing_settings;
CREATE TRIGGER update_pricing_settings_updated_at
    BEFORE UPDATE ON pricing_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 8. ENABLE ROW LEVEL SECURITY (OPTIONAL - FOR PRODUCTION)
-- ===================================================
-- Uncomment these lines for production security
-- ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE pricing_settings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- 9. CREATE PUBLIC ACCESS POLICIES (FOR DEMO/DEVELOPMENT)
-- ===================================================
-- These allow full access - modify for production use
DROP POLICY IF EXISTS "Allow all operations on shipments" ON shipments;
CREATE POLICY "Allow all operations on shipments" ON shipments FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all operations on pricing_settings" ON pricing_settings;
CREATE POLICY "Allow all operations on pricing_settings" ON pricing_settings FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all operations on invoices" ON invoices;
CREATE POLICY "Allow all operations on invoices" ON invoices FOR ALL USING (true);

-- 10. CREATE HELPER FUNCTIONS
-- ===================================================

-- Function to generate unique barcodes
CREATE OR REPLACE FUNCTION generate_unique_barcode()
RETURNS VARCHAR(50) AS $$
DECLARE
    new_barcode VARCHAR(50);
    barcode_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate barcode: WH + YYMMDD + 4-digit random number
        new_barcode := 'WH' || 
                      TO_CHAR(NOW(), 'YYMMDD') || 
                      LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        
        -- Check if barcode exists
        SELECT EXISTS(SELECT 1 FROM shipments WHERE barcode = new_barcode) INTO barcode_exists;
        
        -- Exit loop if barcode is unique
        IF NOT barcode_exists THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN new_barcode;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate storage charges
CREATE OR REPLACE FUNCTION calculate_storage_charges(
    p_weight DECIMAL,
    p_in_date TIMESTAMPTZ,
    p_out_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE(
    storage_days INTEGER,
    chargeable_days INTEGER,
    storage_charges DECIMAL,
    handling_charges DECIMAL,
    total_charges DECIMAL
) AS $$
DECLARE
    v_per_kg_day DECIMAL;
    v_handling_fee DECIMAL;
    v_free_days INTEGER;
    v_storage_days INTEGER;
    v_chargeable_days INTEGER;
    v_storage_charges DECIMAL;
    v_handling_charges DECIMAL;
    v_total_charges DECIMAL;
BEGIN
    -- Get pricing settings
    SELECT setting_value INTO v_per_kg_day FROM pricing_settings 
    WHERE setting_key = 'per_kg_day' AND is_enabled = true;
    
    SELECT setting_value INTO v_handling_fee FROM pricing_settings 
    WHERE setting_key = 'handling_fee' AND is_enabled = true;
    
    SELECT setting_value::INTEGER INTO v_free_days FROM pricing_settings 
    WHERE setting_key = 'free_days' AND is_enabled = true;
    
    -- Default values if settings not found
    v_per_kg_day := COALESCE(v_per_kg_day, 0.50);
    v_handling_fee := COALESCE(v_handling_fee, 10.00);
    v_free_days := COALESCE(v_free_days, 2);
    
    -- Calculate days
    v_storage_days := CEIL(EXTRACT(EPOCH FROM (p_out_date - p_in_date)) / 86400);
    v_chargeable_days := GREATEST(0, v_storage_days - v_free_days);
    
    -- Calculate charges
    v_storage_charges := v_chargeable_days * p_weight * v_per_kg_day;
    v_handling_charges := v_handling_fee;
    v_total_charges := v_storage_charges + v_handling_charges;
    
    -- Return results
    storage_days := v_storage_days;
    chargeable_days := v_chargeable_days;
    storage_charges := v_storage_charges;
    handling_charges := v_handling_charges;
    total_charges := v_total_charges;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- ===================================================
-- SETUP COMPLETE!
-- ===================================================
-- Your database is now ready for the Warehouse Management System
-- 
-- Tables Created:
-- ✅ shipments - Store shipment information
-- ✅ pricing_settings - Configure pricing rules
-- ✅ invoices - Store billing information
-- 
-- Features Ready:
-- ✅ Automatic barcode generation
-- ✅ Storage charge calculations
-- ✅ Invoice generation
-- ✅ Search and filtering
-- ✅ Performance optimizations
-- 
-- Next Steps:
-- 1. Your system is now ready to use!
-- 2. Go to http://localhost:8080
-- 3. Test by creating a shipment
-- 4. Generate labels and invoices
-- ===================================================

SELECT 'Database setup completed successfully! 🎉' as status;