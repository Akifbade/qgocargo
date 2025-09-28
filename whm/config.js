// Supabase Configuration
// Replace these with your actual Supabase project credentials

const SUPABASE_CONFIG = {
    url: 'https://exovuqedyedhqzorajca.supabase.co', // Your Supabase project URL
    anon_key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4b3Z1cWVkeWVkaHF6b3JhamNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNzQyMTYsImV4cCI6MjA3NDY1MDIxNn0.zWyoLDRid9BmR9Ouw-zGGiQZevvXJ_P7ZTIo-VbrAso', // Your Supabase anon key
};

// Initialize Supabase client
let supabase;

// Initialize the Supabase client when the page loads
document.addEventListener('DOMContentLoaded', function() {
    try {
        console.log('🚀 Starting system initialization...');
        
        if (SUPABASE_CONFIG.url === 'YOUR_SUPABASE_URL' || SUPABASE_CONFIG.anon_key === 'YOUR_SUPABASE_ANON_KEY') {
            console.warn('⚠️ Please configure your Supabase credentials in config.js');
            alert('Please configure Supabase credentials in config.js');
            return;
        }
        
        // Initialize Supabase client
        supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anon_key);
        console.log('✅ Supabase client initialized successfully');
        
        // Test Supabase connection immediately
        testSupabaseConnection();
        
        // Wait a bit for all scripts to load, then initialize
        setTimeout(function() {
            if (typeof initializeApp === 'function') {
                initializeApp();
            } else {
                console.log('⏳ Waiting for app to be ready...');
                setTimeout(function() {
                    if (typeof initializeApp === 'function') {
                        initializeApp();
                    } else {
                        console.error('❌ App initialization function not found');
                        // Hide loading screen manually
                        const loading = document.getElementById('loadingOverlay');
                        if (loading) loading.style.display = 'none';
                        // Initialize basic functions anyway
                        initializeBasicFunctions();
                    }
                }, 1000);
            }
        }, 100);
        
    } catch (error) {
        console.error('❌ Error initializing Supabase:', error);
        alert('Error connecting to database: ' + error.message);
        // Hide loading screen
        const loading = document.getElementById('loadingOverlay');
        if (loading) loading.style.display = 'none';
    }
});

// Test Supabase connection
async function testSupabaseConnection() {
    try {
        console.log('🔍 Testing Supabase connection...');
        const { data, error } = await supabase
            .from('shipments')
            .select('id')
            .limit(1);
        
        if (error) {
            console.error('❌ Supabase connection test failed:', error);
            if (error.message.includes('relation "public.shipments" does not exist')) {
                console.warn('⚠️ Database tables need to be created. Please run the SQL setup scripts in Supabase.');
                alert('Database tables are missing. Please contact administrator to set up the database.');
            }
        } else {
            console.log('✅ Supabase connection test successful');
        }
    } catch (error) {
        console.error('❌ Supabase connection test error:', error);
    }
}

// Initialize basic functions if main app fails
function initializeBasicFunctions() {
    console.log('🔧 Initializing basic functions...');
    
    // Make sure warehouse manager is available
    if (typeof WarehouseManager !== 'undefined') {
        window.warehouseManager = new WarehouseManager();
        console.log('✅ Basic WarehouseManager initialized');
    } else {
        console.warn('⚠️ WarehouseManager class not available');
    }
    
    // Hide loading overlay
    const loading = document.getElementById('loadingOverlay');
    if (loading) {
        loading.style.display = 'none';
        console.log('✅ Loading screen hidden');
    }
}

// Configuration constants
const APP_CONFIG = {
    // Default pricing settings
    DEFAULT_PRICING: {
        per_kg_day: 0.50,
        handling_fee: 10.00,
        free_days: 7,
        flat_rate: 25.00,
        enable_per_kg_day: true,
        enable_handling: true,
        enable_flat_rate: false
    },
    
    // Date formats
    DATE_FORMAT: 'YYYY-MM-DD HH:mm:ss',
    DISPLAY_DATE_FORMAT: 'MMM DD, YYYY HH:mm',
    
    // Invoice settings
    INVOICE: {
        company_name: 'Warehouse Management System',
        company_address: '123 Warehouse Street, Storage City, SC 12345',
        company_phone: '+1 (555) 123-4567',
        company_email: 'billing@warehousems.com'
    },
    
    // Scanner settings
    SCANNER: {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
    }
};

// Export for use in other modules
window.APP_CONFIG = APP_CONFIG;