-- WAREHOUSE MANAGEMENT SYSTEM - COMPLETE DATABASE SETUP
-- Run this in your Supabase SQL Editor

-- 1. Create shipments table
CREATE TABLE IF NOT EXISTS public.shipments (
    id SERIAL PRIMARY KEY,
    barcode VARCHAR(255) UNIQUE NOT NULL,
    shipper VARCHAR(255) NOT NULL,
    receiver VARCHAR(255) NOT NULL,
    weight DECIMAL(10,2) NOT NULL,
    dimensions VARCHAR(255),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    released_at TIMESTAMP WITH TIME ZONE,
    invoiced BOOLEAN DEFAULT false,
    invoice_id VARCHAR(255),
    total_cost DECIMAL(10,2) DEFAULT 0.00
);

-- 2. Create pricing_settings table
CREATE TABLE IF NOT EXISTS public.pricing_settings (
    id SERIAL PRIMARY KEY,
    per_kg_day DECIMAL(8,3) DEFAULT 0.500,
    handling_fee DECIMAL(8,2) DEFAULT 10.00,
    free_days INTEGER DEFAULT 7,
    flat_rate DECIMAL(8,2) DEFAULT 25.00,
    enable_per_kg_day BOOLEAN DEFAULT true,
    enable_handling BOOLEAN DEFAULT true,
    enable_flat_rate BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(255) UNIQUE NOT NULL,
    shipment_ids TEXT[] NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create warehouse_racks table (NEW - for rack management)
CREATE TABLE IF NOT EXISTS public.warehouse_racks (
    id VARCHAR(50) PRIMARY KEY,
    zone VARCHAR(10) NOT NULL,
    row_number INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'free',
    shipment_id INTEGER REFERENCES public.shipments(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Insert default pricing settings
INSERT INTO public.pricing_settings (per_kg_day, handling_fee, free_days, flat_rate, enable_per_kg_day, enable_handling, enable_flat_rate)
SELECT 0.500, 10.00, 7, 25.00, true, true, false
WHERE NOT EXISTS (SELECT 1 FROM public.pricing_settings);

-- 6. Initialize warehouse racks (A-T zones, 1-10 rows each = 200 racks)
INSERT INTO public.warehouse_racks (id, zone, row_number, status)
SELECT 
    CONCAT(zone_letter, '-', LPAD(row_num::text, 2, '0'), '-01') as id,
    zone_letter as zone,
    row_num as row_number,
    'free' as status
FROM 
    (SELECT unnest(ARRAY['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T']) as zone_letter) zones
    CROSS JOIN
    (SELECT generate_series(1, 10) as row_num) rows
WHERE NOT EXISTS (
    SELECT 1 FROM public.warehouse_racks 
    WHERE id = CONCAT(zone_letter, '-', LPAD(row_num::text, 2, '0'), '-01')
);

-- 7. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shipments_status ON public.shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_created_at ON public.shipments(created_at);
CREATE INDEX IF NOT EXISTS idx_shipments_barcode ON public.shipments(barcode);
CREATE INDEX IF NOT EXISTS idx_warehouse_racks_status ON public.warehouse_racks(status);
CREATE INDEX IF NOT EXISTS idx_warehouse_racks_zone ON public.warehouse_racks(zone);

-- 8. Enable Row Level Security (RLS) - Optional but recommended
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_racks ENABLE ROW LEVEL SECURITY;

-- 9. Create policies for public access (adjust as needed for your security requirements)
CREATE POLICY "Enable all operations for authenticated users" ON public.shipments
    FOR ALL USING (true);

CREATE POLICY "Enable all operations for authenticated users" ON public.pricing_settings
    FOR ALL USING (true);

CREATE POLICY "Enable all operations for authenticated users" ON public.invoices
    FOR ALL USING (true);

CREATE POLICY "Enable all operations for authenticated users" ON public.warehouse_racks
    FOR ALL USING (true);

-- 10. Create some sample data for testing (optional)
-- Uncomment the following to add sample data:

/*
INSERT INTO public.shipments (barcode, shipper, receiver, weight, dimensions, notes) VALUES
('WH001234567890', 'ABC Company', 'XYZ Corp', 25.50, '50x30x20 cm', 'Fragile items'),
('WH001234567891', 'Global Shipping', 'Local Store', 12.75, '30x20x15 cm', 'Electronics'),
('WH001234567892', 'Express Delivery', 'Home User', 8.00, '25x15x10 cm', 'Books');
*/

-- Verification queries - Run these to check if everything was created correctly:
SELECT 'shipments' as table_name, count(*) as record_count FROM public.shipments
UNION ALL
SELECT 'pricing_settings', count(*) FROM public.pricing_settings  
UNION ALL
SELECT 'invoices', count(*) FROM public.invoices
UNION ALL
SELECT 'warehouse_racks', count(*) FROM public.warehouse_racks;

-- Show sample rack data
SELECT zone, count(*) as rack_count, 
       sum(case when status = 'free' then 1 else 0 end) as free_racks,
       sum(case when status = 'occupied' then 1 else 0 end) as occupied_racks
FROM public.warehouse_racks 
GROUP BY zone 
ORDER BY zone
LIMIT 5;

COMMENT ON TABLE public.shipments IS 'Main shipments tracking table';
COMMENT ON TABLE public.pricing_settings IS 'Pricing configuration settings';
COMMENT ON TABLE public.invoices IS 'Generated invoices';
COMMENT ON TABLE public.warehouse_racks IS 'Warehouse rack management and occupancy';