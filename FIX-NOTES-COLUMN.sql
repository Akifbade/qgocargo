-- ===================================================
-- FIX MISSING 'NOTES' COLUMN - QUICK REPAIR SCRIPT
-- ===================================================
-- Copy and paste this into Supabase SQL Editor to fix the error

-- Add missing 'notes' column to shipments table
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS notes TEXT;

-- Verify the table structure is correct
DO $$
BEGIN
    -- Check if all required columns exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shipments' AND column_name = 'notes'
    ) THEN
        RAISE NOTICE 'Adding notes column...';
        ALTER TABLE shipments ADD COLUMN notes TEXT;
    END IF;
    
    RAISE NOTICE 'Table structure verified successfully!';
END $$;

-- Show current table structure for verification
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'shipments'
ORDER BY ordinal_position;

-- Test query to ensure everything works
SELECT 'Database repair completed successfully! ✅' as status;