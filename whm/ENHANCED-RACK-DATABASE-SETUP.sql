-- Enhanced Rack Management Database Table
-- Run this in Supabase SQL Editor to create the warehouse_racks table

-- Create warehouse_racks table for enhanced rack management
CREATE TABLE IF NOT EXISTS public.warehouse_racks (
    id VARCHAR(50) PRIMARY KEY,
    section VARCHAR(20) NOT NULL,
    rack_number VARCHAR(10) NOT NULL,
    qr_code VARCHAR(100) NOT NULL UNIQUE,
    capacity INTEGER NOT NULL DEFAULT 4 CHECK (capacity > 0),
    current_occupancy INTEGER NOT NULL DEFAULT 0 CHECK (current_occupancy >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance', 'full')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_warehouse_racks_section ON warehouse_racks (section);
CREATE INDEX IF NOT EXISTS idx_warehouse_racks_status ON warehouse_racks (status);
CREATE INDEX IF NOT EXISTS idx_warehouse_racks_qr_code ON warehouse_racks (qr_code);

-- Add RLS (Row Level Security) policies if needed
ALTER TABLE warehouse_racks ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all racks
CREATE POLICY "Allow authenticated users to read racks" ON warehouse_racks
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to insert racks
CREATE POLICY "Allow authenticated users to insert racks" ON warehouse_racks
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to update racks
CREATE POLICY "Allow authenticated users to update racks" ON warehouse_racks
    FOR UPDATE
    TO authenticated
    USING (true);

-- Allow authenticated users to delete racks
CREATE POLICY "Allow authenticated users to delete racks" ON warehouse_racks
    FOR DELETE
    TO authenticated
    USING (true);

-- Create function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_warehouse_racks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_warehouse_racks_updated_at ON warehouse_racks;
CREATE TRIGGER trigger_update_warehouse_racks_updated_at
    BEFORE UPDATE ON warehouse_racks
    FOR EACH ROW
    EXECUTE FUNCTION update_warehouse_racks_updated_at();

-- Insert some sample data (optional)
INSERT INTO warehouse_racks (id, section, rack_number, qr_code, capacity, description) VALUES
('R1-A-001', 'R1', '001', 'RACK_R1_A_001', 4, 'Section R1 Rack A-001'),
('R1-A-002', 'R1', '002', 'RACK_R1_A_002', 4, 'Section R1 Rack A-002'),
('R1-A-003', 'R1', '003', 'RACK_R1_A_003', 4, 'Section R1 Rack A-003')
ON CONFLICT (id) DO NOTHING;

-- Verify the table was created
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'warehouse_racks' 
ORDER BY ordinal_position;