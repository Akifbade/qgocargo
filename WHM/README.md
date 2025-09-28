# Warehouse Storage Management System

A complete warehouse storage tracking and billing system built with HTML, CSS, JavaScript, and Supabase backend.

## 🚀 Features

### 📦 Shipment Management
- **Barcode Scanning**: Use camera to scan barcodes with `html5-qrcode` library
- **Shipment Intake**: Register new shipments with comprehensive details
- **Release Processing**: Quick release with automatic charge calculation
- **Real-time Tracking**: Monitor shipment status and storage duration

### 💰 Dynamic Pricing
- **Flexible Billing**: Per kg/day, flat rate, or handling fee options
- **Configurable Settings**: Admin panel to adjust rates and toggles
- **Free Storage Days**: Grace period before charges apply
- **Real-time Calculator**: Preview charges before processing

### 📊 Dashboard & Analytics
- **Live Statistics**: Active shipments, revenue, rack occupancy
- **Alert System**: Long-staying shipments and capacity warnings
- **Quick Actions**: Search, release, and management tools
- **Responsive Design**: Works on desktop and mobile devices

### 🧾 Invoice Generation
- **PDF Generation**: Professional invoices using `jsPDF`
- **HTML Preview**: Print-ready invoice templates
- **Automatic Calculation**: Accurate billing based on storage time
- **Download & Print**: Multiple output options

## 🛠️ Technology Stack

- **Frontend**: Pure HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Supabase (PostgreSQL database, REST API)
- **Barcode**: html5-qrcode library for camera scanning
- **PDF**: jsPDF for invoice generation
- **UI**: Custom CSS with responsive design

## 📋 Setup Instructions

### 1. Supabase Setup

1. Create a new project at [Supabase](https://supabase.com)
2. Go to SQL Editor and execute the commands from `database_setup.sql`
3. Copy your project URL and anon key from Settings > API

### 2. Configuration

1. Open `assets/js/api.js`
2. Replace the placeholder values:
```javascript
this.SUPABASE_URL = 'https://your-project.supabase.co';
this.SUPABASE_ANON_KEY = 'your-anon-key-here';
```

### 3. Local Development

1. Clone or download the project files
2. Use a local web server (not file:// protocol):

**Option 1 - Python:**
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

**Option 2 - Node.js:**
```bash
npx http-server
# or
npm install -g live-server
live-server
```

**Option 3 - VS Code:**
- Install "Live Server" extension
- Right-click `index.html` → "Open with Live Server"

3. Open your browser to `http://localhost:8000`

## 📂 Project Structure

```
warehouse-management/
├── index.html              # Dashboard page
├── intake.html             # Shipment intake form
├── release.html            # Release & invoice page
├── settings.html           # Pricing configuration
├── database_setup.sql      # Supabase database schema
├── assets/
│   ├── css/
│   │   └── main.css        # Main stylesheet
│   └── js/
│       ├── api.js          # Supabase API functions
│       ├── barcode.js      # Barcode scanning logic
│       ├── dashboard.js    # Dashboard functionality
│       ├── intake.js       # Intake form logic
│       ├── invoice.js      # PDF invoice generation
│       ├── release.js      # Release processing
│       └── settings.js     # Pricing settings
└── README.md
```

## 🔧 Configuration Options

### Pricing Settings
- **Per kg/day Rate**: Charge per kilogram per day
- **Handling Fee**: One-time processing fee
- **Flat Rate**: Fixed fee regardless of weight/time
- **Free Days**: Grace period before charges apply
- **Enable/Disable**: Toggle each pricing component

### Database Tables
- **shipments**: Main shipment records
- **pricing_settings**: Configuration settings
- **invoices**: Generated billing records

## 📱 Usage Guide

### 1. Adding Shipments
1. Go to "Shipment Intake" page
2. Click "Start Scanner" or enter barcode manually
3. Fill in shipment details (shipper, consignee, weight, etc.)
4. Select rack location
5. Click "Register Shipment"

### 2. Releasing Shipments
1. Go to "Release & Invoice" page
2. Scan barcode or search manually
3. Review shipment details and calculated charges
4. Adjust release date if needed
5. Click "Process Release"
6. Download or print invoice

### 3. Configuring Pricing
1. Go to "Pricing Settings" page
2. Toggle on/off different charge types
3. Set rates and fees
4. Use calculator to preview charges
5. Save settings

### 4. Dashboard Monitoring
- View active shipments and statistics
- Check alerts for long-staying items
- Quick search and release actions
- Monitor revenue and occupancy

## 🔒 Security Considerations

### Row Level Security (RLS)
The database setup includes RLS policies. For production:
- Implement proper authentication
- Restrict API access based on user roles
- Use environment variables for sensitive keys

### HTTPS Requirements
- Camera/barcode scanning requires HTTPS in production
- Use SSL certificate for live deployment
- Test locally with `http://localhost` (allowed by browsers)

## 🚀 Deployment

### Static Hosting (Recommended)
- **Netlify**: Drag and drop the project folder
- **Vercel**: Connect GitHub repository
- **GitHub Pages**: Enable in repository settings

### Traditional Hosting
- Upload files to web server
- Ensure HTTPS is enabled for camera access
- Update Supabase CORS settings if needed

## 🔍 Troubleshooting

### Camera/Scanner Issues
- Ensure HTTPS in production
- Check camera permissions in browser
- Try different browsers (Chrome recommended)
- Use manual barcode entry as fallback

### API Errors
- Verify Supabase URL and key
- Check network connectivity
- Review browser console for errors
- Ensure database tables exist

### PDF Generation Issues
- Check browser compatibility
- Ensure jsPDF library loads properly
- Try different PDF download methods

## 📈 Future Enhancements

- **User Authentication**: Multi-user access control
- **Advanced Reporting**: Export capabilities and analytics
- **Mobile App**: Native mobile application
- **Inventory Integration**: Stock level management
- **Email Notifications**: Automated alerts and invoices
- **Backup System**: Automated data backup

## 🆘 Support

For issues and questions:
1. Check browser console for errors
2. Verify Supabase configuration
3. Review database schema and data
4. Test with sample data

## 📄 License

This project is open source and available under the [MIT License](https://opensource.org/licenses/MIT).

---

**Built with ❤️ for efficient warehouse management**