-- Warehouse Storage Management System Database Schema
-- Execute these SQL commands in your Supabase SQL Editor

-- 1. Create Shipments Table
CREATE TABLE shipments (
    id SERIAL PRIMARY KEY,
    barcode VARCHAR(50) UNIQUE NOT NULL,
    shipper VARCHAR(255) NOT NULL,
    consignee VARCHAR(255) NOT NULL,
    weight DECIMAL(10,2) NOT NULL,
    pieces INTEGER NOT NULL DEFAULT 1,
    rack_location VARCHAR(50) NOT NULL,
    notes TEXT,
    in_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    out_date TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'released')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Pricing Settings Table
CREATE TABLE pricing_settings (
    id SERIAL PRIMARY KEY,
    per_kg_day DECIMAL(10,2) DEFAULT 0.50,
    handling_fee DECIMAL(10,2) DEFAULT 5.00,
    flat_rate DECIMAL(10,2) DEFAULT 20.00,
    free_days INTEGER DEFAULT 3,
    enable_per_kg_day BOOLEAN DEFAULT true,
    enable_handling_fee BOOLEAN DEFAULT true,
    enable_flat_rate BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Invoices Table
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    shipment_id INTEGER REFERENCES shipments(id) ON DELETE CASCADE,
    barcode VARCHAR(50) NOT NULL,
    total_charges DECIMAL(10,2) NOT NULL DEFAULT 0,
    charges_breakdown JSONB,
    storage_days INTEGER DEFAULT 0,
    chargeable_days INTEGER DEFAULT 0,
    release_date TIMESTAMPTZ,
    pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Indexes for better performance
CREATE INDEX idx_shipments_barcode ON shipments(barcode);
CREATE INDEX idx_shipments_status ON shipments(status);
CREATE INDEX idx_shipments_in_date ON shipments(in_date);
CREATE INDEX idx_shipments_rack_location ON shipments(rack_location);
CREATE INDEX idx_invoices_shipment_id ON invoices(shipment_id);
CREATE INDEX idx_invoices_barcode ON invoices(barcode);
CREATE INDEX idx_invoices_created_at ON invoices(created_at);

-- 5. Insert default pricing settings
INSERT INTO pricing_settings (
    per_kg_day,
    handling_fee,
    flat_rate,
    free_days,
    enable_per_kg_day,
    enable_handling_fee,
    enable_flat_rate
) VALUES (
    0.50,
    5.00,
    20.00,
    3,
    true,
    true,
    false
) ON CONFLICT DO NOTHING;

-- 6. Create update trigger for updated_at fields
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_shipments_updated_at 
    BEFORE UPDATE ON shipments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pricing_settings_updated_at 
    BEFORE UPDATE ON pricing_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Create Row Level Security (RLS) policies if needed
-- Enable RLS on tables
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Create policies (allowing all operations for authenticated users)
-- You may want to customize these based on your security requirements
CREATE POLICY "Allow all operations for authenticated users" ON shipments
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON pricing_settings
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users" ON invoices
    FOR ALL USING (auth.role() = 'authenticated');

-- Alternatively, for public access (less secure but simpler for demo):
-- CREATE POLICY "Allow public access" ON shipments FOR ALL USING (true);
-- CREATE POLICY "Allow public access" ON pricing_settings FOR ALL USING (true);
-- CREATE POLICY "Allow public access" ON invoices FOR ALL USING (true);

-- 8. Sample data for testing (optional)
-- Insert some sample shipments
INSERT INTO shipments (barcode, shipper, consignee, weight, pieces, rack_location, notes, in_date) VALUES
('WH20240001', 'ABC Company Ltd', 'XYZ Corp', 150.5, 3, 'A1', 'Fragile items', '2024-01-15 10:30:00'),
('WH20240002', 'Global Shipping Inc', 'Local Store Chain', 75.0, 1, 'B2', 'Electronics', '2024-01-20 14:15:00'),
('WH20240003', 'Import Export Co', 'Retail Solutions', 200.3, 5, 'C1', 'Bulk materials', '2024-01-25 09:45:00')
ON CONFLICT (barcode) DO NOTHING;

-- Views for common queries (optional)
CREATE VIEW active_shipments_with_days AS
SELECT 
    s.*,
    EXTRACT(DAY FROM (NOW() - s.in_date)) AS days_in_storage,
    CASE 
        WHEN EXTRACT(DAY FROM (NOW() - s.in_date)) > 30 THEN 'long_stay'
        WHEN EXTRACT(DAY FROM (NOW() - s.in_date)) > 14 THEN 'medium_stay'
        ELSE 'normal'
    END AS stay_category
FROM shipments s
WHERE s.status = 'active';

CREATE VIEW monthly_revenue AS
SELECT 
    DATE_TRUNC('month', created_at) AS month,
    COUNT(*) AS invoice_count,
    SUM(total_charges) AS total_revenue
FROM invoices
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- Comments for documentation
COMMENT ON TABLE shipments IS 'Main table storing all warehouse shipment records';
COMMENT ON TABLE pricing_settings IS 'Configuration table for storage pricing and fees';
COMMENT ON TABLE invoices IS 'Generated invoices for released shipments';
COMMENT ON COLUMN shipments.status IS 'Shipment status: active (in warehouse) or released';
COMMENT ON COLUMN shipments.in_date IS 'Date and time when shipment was received';
COMMENT ON COLUMN shipments.out_date IS 'Date and time when shipment was released';
COMMENT ON COLUMN invoices.charges_breakdown IS 'JSON object containing detailed charge breakdown';

-- Performance considerations
-- Consider adding partitioning for large datasets:
-- CREATE TABLE shipments_2024 PARTITION OF shipments 
-- FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- Regular maintenance (run periodically)
-- VACUUM ANALYZE shipments;
-- VACUUM ANALYZE invoices;
-- REINDEX INDEX CONCURRENTLY idx_shipments_barcode;