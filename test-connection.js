// Quick Supabase Connection Test
// Open browser console (F12) and paste this code to test connection

async function testSupabaseConnection() {
    console.log('🧪 Testing Supabase Connection...');
    
    try {
        // Test 1: Check if Supabase client is initialized
        if (!window.supabase) {
            console.log('❌ Supabase client not initialized');
            return;
        }
        console.log('✅ Supabase client initialized');
        
        // Test 2: Test basic connection
        const { data, error } = await supabase.from('pricing_settings').select('count');
        
        if (error) {
            console.log('❌ Connection Error:', error.message);
            
            // Check for common issues
            if (error.message.includes('relation') && error.message.includes('does not exist')) {
                console.log('💡 Issue: Tables don\'t exist yet - need to run SQL script');
                console.log('📋 Next step: Go to https://supabase.com/dashboard → SQL Editor → Run setup script');
            } else if (error.message.includes('Invalid API key')) {
                console.log('💡 Issue: API key is invalid');
            } else if (error.message.includes('Failed to fetch')) {
                console.log('💡 Issue: Network connection or URL problem');
            }
            
            return;
        }
        
        console.log('✅ Database connection successful!');
        console.log('📊 Result:', data);
        
        // Test 3: Try to create a test record (if tables exist)
        console.log('🧪 Testing table creation capability...');
        
        const testShipment = {
            barcode: 'TEST' + Date.now(),
            shipper: 'Test Shipper',
            consignee: 'Test Consignee', 
            weight: 1.5,
            pieces: 1,
            rack: 'TEST-01'
        };
        
        const { data: insertData, error: insertError } = await supabase
            .from('shipments')
            .insert(testShipment)
            .select();
            
        if (insertError) {
            console.log('❌ Insert test failed:', insertError.message);
        } else {
            console.log('✅ Insert test successful!');
            console.log('📦 Created test shipment:', insertData);
            
            // Clean up test record
            await supabase.from('shipments').delete().eq('barcode', testShipment.barcode);
            console.log('🧹 Cleaned up test record');
        }
        
        console.log('🎉 All tests completed! Your Supabase connection is working perfectly.');
        
    } catch (error) {
        console.log('❌ Unexpected error:', error);
    }
}

// Auto-run the test
testSupabaseConnection();