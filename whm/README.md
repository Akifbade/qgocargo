# Warehouse Storage Management System

A comprehensive warehouse management system built with HTML, CSS, JavaScript, and Supabase backend. Features barcode scanning, dynamic pricing, invoice generation, and dashboard analytics.

## 🌟 Features

### Core Functionality
- **Shipment Intake**: Record incoming shipments with barcode scanning
- **Label Printing**: Auto-generate and print barcode labels for shipments
- **Storage Tracking**: Monitor how long each shipment stays in warehouse
- **Dynamic Pricing**: Configurable storage rates (per kg/day, flat rate, handling fees)
- **Shipment Release**: Process outgoing shipments with automatic invoice generation
- **Dashboard Analytics**: Real-time statistics and alerts
- **Search & Filter**: Find shipments by barcode, shipper, consignee, or rack location

### Technical Features
- **Barcode Scanning**: Uses html5-qrcode library for camera-based scanning
- **Label Printing**: JsBarcode (Code128) and QR code generation with print optimization
- **PDF Invoice Generation**: Automatic invoice creation with jsPDF
- **Print Layouts**: A4 sticker sheets (3×8 grid) and thermal printer support (100×150mm)
- **Real-time Data**: Live dashboard updates and notifications
- **Responsive Design**: Works on desktop and mobile devices
- **Database Integration**: Full CRUD operations with Supabase

## 🛠 Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Supabase (PostgreSQL database, REST API)
- **Libraries**: 
  - html5-qrcode (barcode scanning)
  - JsBarcode (Code128 barcode generation)
  - qrcode.js (QR code generation)
  - jsPDF (PDF generation)
  - Supabase JS SDK
- **Styling**: Custom CSS with modern design

## 📋 Prerequisites

1. **Supabase Account**: Create a free account at [supabase.com](https://supabase.com)
2. **Modern Web Browser**: Chrome, Firefox, Safari, or Edge
3. **HTTPS Environment**: Required for camera access (barcode scanning)

## 🚀 Setup Instructions

### 1. Supabase Setup

1. **Create New Project**:
   - Go to [supabase.com](https://supabase.com)
   - Click "New Project"
   - Choose organization, enter project name and password
   - Wait for project to be ready

2. **Get Project Credentials**:
   - Go to Project Settings > API
   - Copy your Project URL and anon public key
   - Save these for configuration

3. **Create Database Tables**:
   - Go to SQL Editor in your Supabase dashboard
   - Copy and paste the entire content of `database-setup.sql`
   - Click "Run" to execute all commands
   - Verify tables are created in Table Editor

### 2. Application Configuration

1. **Configure Supabase Credentials**:
   ```javascript
   // Edit config.js
   const SUPABASE_CONFIG = {
       url: 'YOUR_SUPABASE_PROJECT_URL',
       anon_key: 'YOUR_SUPABASE_ANON_KEY'
   };
   ```

2. **Update Company Information** (optional):
   ```javascript
   // In config.js, update INVOICE settings
   INVOICE: {
       company_name: 'Your Warehouse Company',
       company_address: 'Your Address',
       company_phone: 'Your Phone',
       company_email: 'Your Email'
   }
   ```

### 3. Deployment Options

#### Option A: Local Development Server
```powershell
# Navigate to project directory
cd "C:\Users\USER\Pictures\WHM\warehouse-system"

# Start Python HTTP server
python -m http.server 8080

# Access at: http://localhost:8080
```

#### Option B: Live Server (VS Code)
1. Install "Live Server" extension in VS Code
2. Right-click `index.html` → "Open with Live Server"

#### Option C: Web Hosting
- Upload all files to your web hosting provider
- Ensure HTTPS is enabled for barcode scanning

## 📊 Database Schema

### Tables Created

1. **shipments**
   - Stores all shipment records
   - Tracks in/out dates, status, and details

2. **pricing_settings**
   - Configurable pricing rules
   - Per kg/day rates, handling fees, free days

3. **invoices**
   - Generated invoice records
   - Links to shipments with calculated charges

### Key Relationships
```
shipments (1) ← (N) invoices
pricing_settings (1) → affects all calculations
```

## 🎯 Usage Guide

### 1. Dashboard
- View real-time statistics
- Monitor longest-staying shipments
- Track daily/monthly revenue
- See recent activities

### 2. Shipment Intake
- Click "📷 Scan Barcode" to use camera
- Or manually enter shipment details
- All fields marked with * are required
- System prevents duplicate barcodes
- **Auto-generates labels** equal to piece count
- Option to print labels immediately after registration

### 3. Pricing Configuration
- Set storage rates (per kg/day or flat rate)
- Configure handling fees
- Set free storage days
- Toggle features on/off

### 4. Shipment Release
- Scan barcode or search for shipment
- System calculates charges automatically
- Generate and download PDF invoice
- Updates shipment status to "out"

### 5. Search & Reports
- Search by any field (barcode, shipper, etc.)
- Filter by status (active/released)
- View complete shipment history
- **Bulk label printing** from search results
- Select multiple shipments for batch operations

### 6. Label Printing System
- **Auto-generation**: Labels created automatically after shipment intake
- **Multiple formats**: Code128 barcodes or QR codes (toggle option)
- **Print layouts**: 
  - A4 sticker sheets (3×8 grid, 70×35mm per label)
  - Thermal printer format (100×150mm)
- **Label content**: Barcode, shipper, consignee, rack, weight, piece X of N
- **Unique piece IDs**: Format `${barcode}-${sequence}` for individual pieces
- **Re-print capability**: Print labels from any shipment detail page
- **Bulk printing**: Select multiple shipments for batch label printing
- **Print optimization**: Zero margins, high-DPI support for thermal printers

## ⚙️ Configuration Options

### Default Pricing Settings
```javascript
DEFAULT_PRICING: {
   per_kg_day: 0.50,      // KD 0.500 per kg per day
   handling_fee: 10.00,   // KD 10.000 handling fee
   free_days: 7,          // 7 free storage days
   flat_rate: 25.00,      // KD 25.000 flat rate option
   enable_per_kg_day: true,
   enable_handling: true,
   enable_flat_rate: false
}
```

### Scanner Configuration
```javascript
SCANNER: {
    fps: 10,                              // Frames per second
    qrbox: { width: 250, height: 250 },   // Scan area size
    aspectRatio: 1.0                      // Camera aspect ratio
}
```

## 🔧 Troubleshooting

### Common Issues

1. **"Please configure Supabase credentials"**
   - Check config.js has correct URL and anon key
   - Verify credentials are not placeholder values

2. **Barcode scanner not working**
   - Ensure HTTPS is enabled
   - Grant camera permissions
   - Check browser compatibility

3. **Database connection failed**
   - Verify Supabase project is active
   - Check internet connection
   - Confirm database tables are created

4. **PDF download not working**
   - Check if jsPDF library loaded correctly
   - Verify browser allows downloads
   - Try different browser

### Database Troubleshooting
```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Verify sample data
SELECT COUNT(*) FROM shipments;
SELECT * FROM pricing_settings;
```

## 🔒 Security Considerations

### Production Deployment
1. **Enable Row Level Security (RLS)**:
   ```sql
   ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
   -- Add appropriate policies
   ```

2. **Authentication**:
   - Implement user authentication
   - Add role-based access control

3. **Data Validation**:
   - Server-side input validation
   - SQL injection protection (handled by Supabase)

## 📱 Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Core App | ✅ | ✅ | ✅ | ✅ |
| Barcode Scan | ✅ | ✅ | ✅ | ✅ |
| PDF Download | ✅ | ✅ | ✅ | ✅ |

## 🎨 Customization

### Styling
- Edit `styles.css` for visual customization
- Color scheme, fonts, layout modifications
- Responsive design adjustments

### Functionality
- Modify `app.js` for business logic changes
- Add new fields to forms
- Create custom reports and views

## 📈 Performance Tips

1. **Database Indexes**: Already included in setup SQL
2. **Image Optimization**: Use appropriate camera resolution
3. **Caching**: Browser caches static assets automatically
4. **Network**: Monitor Supabase usage limits

## 🆘 Support

### Resources
- [Supabase Documentation](https://supabase.com/docs)
- [html5-qrcode GitHub](https://github.com/mebjas/html5-qrcode)
- [jsPDF Documentation](https://artskydj.github.io/jsPDF/docs/)

### Getting Help
1. Check browser developer console for errors
2. Verify Supabase project status and quotas
3. Test with sample data
4. Check network connectivity

## 🔄 Version History

### v1.0.0 (Current)
- Initial release with all core features
- Barcode scanning integration
- PDF invoice generation
- Dashboard analytics
- Multi-device responsive design

## 📄 License

This project is provided as-is for educational and commercial use. Modify and distribute as needed.

## 🏗 Project Structure

```
warehouse-system/
├── index.html              # Main application file
├── styles.css              # All styling and responsive design
├── config.js               # Supabase and app configuration
├── database.js             # Database operations and management
├── barcode.js              # Barcode scanning functionality
├── label-printing.js       # Label generation and printing system
├── invoice.js              # PDF invoice generation
├── app.js                  # Main application logic
├── server.js               # Development server
├── database-setup.sql      # Supabase database schema
└── README.md               # This file
```

---

## 🚀 **DEPLOYMENT GUIDE**

### **1. FREE HOSTING OPTIONS**

#### **🌟 Netlify (Recommended)**
1. Create account at [netlify.com](https://netlify.com)
2. Drag & drop your project folder or connect GitHub
3. Get instant free URL: `yoursite.netlify.app`
4. Features: Auto-deploy, custom domain, SSL, 100GB/month

#### **🔥 Vercel**
1. Sign up at [vercel.com](https://vercel.com)
2. Install CLI: `npm install -g vercel`
3. Deploy: `vercel` (in project folder)
4. Features: Global CDN, serverless functions, unlimited projects

#### **🌐 GitHub Pages**
1. Upload code to GitHub repository
2. Go to Settings → Pages
3. Enable Pages from main branch
4. Access: `yourusername.github.io/repository-name`

#### **☁️ Surge.sh**
1. Install: `npm install -g surge`
2. Deploy: `surge` (in project folder)
3. Choose custom domain or use generated one

### **2. DEPLOYMENT PREPARATION**
- ✅ Supabase credentials configured in `config.js`
- ✅ Database tables created in Supabase
- ✅ Admin user role set up
- ✅ All files ready for production

### **3. POST-DEPLOYMENT**
1. Test login functionality
2. Verify database connections
3. Check mobile responsiveness
4. Test admin features
5. Configure custom domain (optional)

**Cost**: 100% FREE with generous limits!

---

**Ready to use!** Follow the setup instructions above and you'll have a fully functional warehouse management system running in minutes.