-- Warehouse Management System Database Schema
-- Execute these SQL commands in your Supabase SQL Editor

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret-here';

-- Create shipments table
CREATE TABLE IF NOT EXISTS public.shipments (
    id BIGSERIAL PRIMARY KEY,
    barcode VARCHAR(255) NOT NULL UNIQUE,
    shipper VARCHAR(255) NOT NULL,
    consignee VARCHAR(255) NOT NULL,
    weight DECIMAL(10,2) NOT NULL CHECK (weight > 0),
    pieces INTEGER NOT NULL CHECK (pieces > 0),
    rack VARCHAR(100) NOT NULL,
    notes TEXT,
    in_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    out_date TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'in' CHECK (status IN ('in', 'out')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create pricing_settings table
CREATE TABLE IF NOT EXISTS public.pricing_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    per_kg_day DECIMAL(10,2) NOT NULL DEFAULT 0.50,
    handling_fee DECIMAL(10,2) NOT NULL DEFAULT 10.00,
    free_days INTEGER NOT NULL DEFAULT 7,
    flat_rate DECIMAL(10,2) NOT NULL DEFAULT 25.00,
    enable_per_kg_day BOOLEAN NOT NULL DEFAULT true,
    enable_handling BOOLEAN NOT NULL DEFAULT true,
    enable_flat_rate BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT single_pricing_settings CHECK (id = 1)
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
    id BIGSERIAL PRIMARY KEY,
    shipment_id BIGINT NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
    barcode VARCHAR(255) NOT NULL,
    shipper VARCHAR(255) NOT NULL,
    consignee VARCHAR(255) NOT NULL,
    weight DECIMAL(10,2) NOT NULL,
    storage_days INTEGER NOT NULL,
    storage_charges DECIMAL(10,2) NOT NULL DEFAULT 0,
    handling_charges DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_charges DECIMAL(10,2) NOT NULL DEFAULT 0,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shipments_barcode ON public.shipments(barcode);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON public.shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_in_date ON public.shipments(in_date);
CREATE INDEX IF NOT EXISTS idx_shipments_rack ON public.shipments(rack);
CREATE INDEX IF NOT EXISTS idx_shipments_shipper ON public.shipments(shipper);
CREATE INDEX IF NOT EXISTS idx_shipments_consignee ON public.shipments(consignee);
CREATE INDEX IF NOT EXISTS idx_invoices_shipment_id ON public.invoices(shipment_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update updated_at columns
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.shipments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.pricing_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Insert default pricing settings
INSERT INTO public.pricing_settings (
    id,
    per_kg_day,
    handling_fee,
    free_days,
    flat_rate,
    enable_per_kg_day,
    enable_handling,
    enable_flat_rate
) VALUES (
    1,
    0.50,
    10.00,
    7,
    25.00,
    true,
    true,
    false
) ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security (RLS) - Optional, for production use
-- ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.pricing_settings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (uncomment for production)
-- CREATE POLICY "Enable read access for all users" ON public.shipments FOR SELECT USING (true);
-- CREATE POLICY "Enable insert access for all users" ON public.shipments FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Enable update access for all users" ON public.shipments FOR UPDATE USING (true);
-- CREATE POLICY "Enable delete access for all users" ON public.shipments FOR DELETE USING (true);

-- CREATE POLICY "Enable read access for all users" ON public.pricing_settings FOR SELECT USING (true);
-- CREATE POLICY "Enable update access for all users" ON public.pricing_settings FOR UPDATE USING (true);

-- CREATE POLICY "Enable read access for all users" ON public.invoices FOR SELECT USING (true);
-- CREATE POLICY "Enable insert access for all users" ON public.invoices FOR INSERT WITH CHECK (true);

-- Create view for dashboard statistics
CREATE OR REPLACE VIEW public.dashboard_stats AS
SELECT 
    (SELECT COUNT(*) FROM public.shipments WHERE status = 'in') as total_active_shipments,
    (SELECT COUNT(DISTINCT rack) FROM public.shipments WHERE status = 'in') as occupied_racks,
    (SELECT COALESCE(SUM(total_charges), 0) FROM public.invoices WHERE DATE(created_at) = CURRENT_DATE) as daily_revenue,
    (SELECT COALESCE(SUM(total_charges), 0) FROM public.invoices WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)) as monthly_revenue;

-- Create function to get storage duration
CREATE OR REPLACE FUNCTION public.get_storage_duration(in_date TIMESTAMPTZ, out_date TIMESTAMPTZ DEFAULT NULL)
RETURNS INTEGER AS $$
BEGIN
    RETURN EXTRACT(DAYS FROM (COALESCE(out_date, NOW()) - in_date))::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate storage charges
CREATE OR REPLACE FUNCTION public.calculate_storage_charges(
    shipment_weight DECIMAL,
    storage_days INTEGER,
    settings_row public.pricing_settings
) RETURNS TABLE(
    storage_charges DECIMAL,
    handling_charges DECIMAL,
    total_charges DECIMAL
) AS $$
DECLARE
    chargeable_days INTEGER;
    calc_storage_charges DECIMAL := 0;
    calc_handling_charges DECIMAL := 0;
BEGIN
    -- Calculate chargeable days (subtract free days)
    chargeable_days := GREATEST(0, storage_days - settings_row.free_days);
    
    -- Calculate storage charges
    IF settings_row.enable_flat_rate THEN
        calc_storage_charges := settings_row.flat_rate;
    ELSIF settings_row.enable_per_kg_day AND chargeable_days > 0 THEN
        calc_storage_charges := chargeable_days * shipment_weight * settings_row.per_kg_day;
    END IF;
    
    -- Calculate handling charges
    IF settings_row.enable_handling THEN
        calc_handling_charges := settings_row.handling_fee;
    END IF;
    
    RETURN QUERY SELECT 
        calc_storage_charges,
        calc_handling_charges,
        calc_storage_charges + calc_handling_charges;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT USAGE ON SCHEMA public TO anon, authenticated;
-- GRANT ALL ON public.shipments TO anon, authenticated;
-- GRANT ALL ON public.pricing_settings TO anon, authenticated;
-- GRANT ALL ON public.invoices TO anon, authenticated;
-- GRANT SELECT ON public.dashboard_stats TO anon, authenticated;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;