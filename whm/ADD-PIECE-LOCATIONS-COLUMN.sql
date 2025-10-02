-- ADD PIECE LOCATIONS COLUMN TO SHIPMENTS TABLE
-- Run this in Supabase SQL Editor to add the missing piece_locations column

-- Add piece_locations column to store individual piece location data
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS piece_locations JSONB DEFAULT '{}';

-- Add some indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shipments_piece_locations 
ON shipments USING GIN (piece_locations);

-- Update existing records to have empty piece_locations if they don't
UPDATE shipments 
SET piece_locations = '{}' 
WHERE piece_locations IS NULL;

-- Add comment to explain the column
COMMENT ON COLUMN shipments.piece_locations IS 'JSON object storing individual piece locations: {"piece_1": {"rackId": "A-01-01", "assignedAt": "2024-10-02T10:30:00Z", "assignedBy": "worker@example.com"}}';

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'shipments' 
AND column_name = 'piece_locations';