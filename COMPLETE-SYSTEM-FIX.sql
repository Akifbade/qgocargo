-- ===================================================
-- COMPLETE SYSTEM FIX - ALL ERRORS RESOLVED
-- ===================================================
-- Copy and paste this ENTIRE script into Supabase SQL Editor

-- 1. DROP ALL EXISTING TABLES AND START FRESH
-- ===================================================
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS pricing_settings CASCADE;
DROP TABLE IF EXISTS shipments CASCADE;

-- 2. CREATE SHIPMENTS TABLE (CORRECT VERSION)
-- ===================================================
CREATE TABLE shipments (
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

-- 3. CREATE PRICING SETTINGS TABLE (CORRECT VERSION)
-- ===================================================
CREATE TABLE pricing_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value DECIMAL(10,4) NOT NULL CHECK (setting_value >= 0),
    is_enabled BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CREATE INVOICES TABLE (CORRECT VERSION)
-- ===================================================
CREATE TABLE invoices (
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

-- 5. INSERT CORRECT PRICING SETTINGS
-- ===================================================
INSERT INTO pricing_settings (setting_key, setting_value, is_enabled, description) VALUES
    ('per_kg_day', 0.50, true, 'Storage charge per kg per day in USD'),
    ('handling_fee', 10.00, true, 'One-time handling fee in USD'),
    ('free_days', 2, true, 'Number of free storage days'),
    ('flat_rate', 25.00, false, 'Flat rate storage charge in USD'),
    ('per_day_rate', 3.00, false, 'Per day storage charge in USD');

-- 6. CREATE ALL REQUIRED INDEXES
-- ===================================================
CREATE INDEX idx_shipments_barcode ON shipments(barcode);
CREATE INDEX idx_shipments_status ON shipments(status);
CREATE INDEX idx_shipments_in_date ON shipments(in_date);
CREATE INDEX idx_shipments_shipper ON shipments(shipper);
CREATE INDEX idx_shipments_consignee ON shipments(consignee);
CREATE INDEX idx_shipments_rack ON shipments(rack);
CREATE INDEX idx_invoices_barcode ON invoices(barcode);
CREATE INDEX idx_invoices_date ON invoices(invoice_date);
CREATE INDEX idx_invoices_shipment ON invoices(shipment_id);
CREATE INDEX idx_pricing_key ON pricing_settings(setting_key);

-- 7. CREATE UPDATED_AT TRIGGER FUNCTION
-- ===================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. CREATE ALL TRIGGERS
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

-- 9. CREATE ROW LEVEL SECURITY POLICIES
-- ===================================================
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for development
DROP POLICY IF EXISTS "Allow all operations on shipments" ON shipments;
CREATE POLICY "Allow all operations on shipments" ON shipments FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all operations on pricing_settings" ON pricing_settings;
CREATE POLICY "Allow all operations on pricing_settings" ON pricing_settings FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all operations on invoices" ON invoices;
CREATE POLICY "Allow all operations on invoices" ON invoices FOR ALL USING (true);

-- 10. CREATE HELPER FUNCTIONS FOR SYSTEM OPERATIONS
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
RETURNS JSON AS $$
DECLARE
    v_per_kg_day DECIMAL := 0.50;
    v_handling_fee DECIMAL := 10.00;
    v_free_days INTEGER := 2;
    v_storage_days INTEGER;
    v_chargeable_days INTEGER;
    v_storage_charges DECIMAL;
    v_handling_charges DECIMAL;
    v_total_charges DECIMAL;
    v_result JSON;
BEGIN
    -- Get pricing settings
    SELECT COALESCE(
        (SELECT setting_value FROM pricing_settings WHERE setting_key = 'per_kg_day' AND is_enabled = true),
        0.50
    ) INTO v_per_kg_day;
    
    SELECT COALESCE(
        (SELECT setting_value FROM pricing_settings WHERE setting_key = 'handling_fee' AND is_enabled = true),
        10.00
    ) INTO v_handling_fee;
    
    SELECT COALESCE(
        (SELECT setting_value::INTEGER FROM pricing_settings WHERE setting_key = 'free_days' AND is_enabled = true),
        2
    ) INTO v_free_days;
    
    -- Calculate days
    v_storage_days := CEIL(EXTRACT(EPOCH FROM (p_out_date - p_in_date)) / 86400);
    v_chargeable_days := GREATEST(0, v_storage_days - v_free_days);
    
    -- Calculate charges
    v_storage_charges := v_chargeable_days * p_weight * v_per_kg_day;
    v_handling_charges := v_handling_fee;
    v_total_charges := v_storage_charges + v_handling_charges;
    
    -- Build result JSON
    v_result := json_build_object(
        'storage_days', v_storage_days,
        'chargeable_days', v_chargeable_days,
        'storage_charges', v_storage_charges,
        'handling_charges', v_handling_charges,
        'total_charges', v_total_charges,
        'per_kg_day_rate', v_per_kg_day,
        'free_days', v_free_days
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    invoice_num VARCHAR(50);
BEGIN
    invoice_num := 'INV' || TO_CHAR(NOW(), 'YYYYMMDDHH24MISS') || LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0');
    RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;

-- 11. CREATE VIEWS FOR EASIER DATA ACCESS
-- ===================================================

-- View for dashboard statistics
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT 
    COUNT(*) as total_shipments,
    COUNT(*) FILTER (WHERE status = 'in') as shipments_in,
    COUNT(*) FILTER (WHERE status = 'out') as shipments_out,
    COUNT(DISTINCT rack) as occupied_racks,
    COALESCE(SUM(total_charges), 0) as total_revenue
FROM shipments s
LEFT JOIN invoices i ON s.id = i.shipment_id;

-- View for shipment details with calculated charges
CREATE OR REPLACE VIEW shipment_details AS
SELECT 
    s.*,
    CASE 
        WHEN s.status = 'out' AND s.out_date IS NOT NULL THEN
            (calculate_storage_charges(s.weight, s.in_date, s.out_date))->>'total_charges'
        ELSE 
            (calculate_storage_charges(s.weight, s.in_date, NOW()))->>'total_charges'
    END::DECIMAL as current_charges,
    CASE 
        WHEN s.out_date IS NOT NULL THEN
            CEIL(EXTRACT(EPOCH FROM (s.out_date - s.in_date)) / 86400)
        ELSE
            CEIL(EXTRACT(EPOCH FROM (NOW() - s.in_date)) / 86400)
    END as storage_days
FROM shipments s;

-- 12. INSERT SAMPLE DATA FOR TESTING
-- ===================================================
INSERT INTO shipments (barcode, shipper, consignee, weight, pieces, rack, notes) VALUES
    ('WH' || TO_CHAR(NOW(), 'YYMMDD') || '0001', 'Sample Shipper', 'Sample Consignee', 2.5, 1, 'A-01-01', 'Test shipment for verification');

-- 13. VERIFY EVERYTHING WORKS
-- ===================================================

-- Test barcode generation
SELECT generate_unique_barcode() as test_barcode;

-- Test charge calculation
SELECT calculate_storage_charges(5.5, NOW() - INTERVAL '5 days', NOW()) as test_charges;

-- Test pricing settings
SELECT * FROM pricing_settings ORDER BY setting_key;

-- Test shipments view
SELECT * FROM shipment_details ORDER BY created_at DESC LIMIT 5;

-- Test dashboard stats
SELECT * FROM dashboard_stats;

-- Final success message
SELECT '🎉 ALL SYSTEMS FIXED AND READY! 🎉' as status,
       'Database rebuild completed successfully!' as message,
       'All functions, triggers, and views created!' as details;