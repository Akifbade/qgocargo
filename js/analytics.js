// Analytics Module
let analyticsData = {};

// Show analytics dashboard
function showAnalytics() {
    if (window.authModule.getUserRole() !== 'admin') {
        showNotification('Access denied. Admin privileges required.', 'error');
        return;
    }
    
    document.getElementById('analytics-container').style.display = 'block';
    document.getElementById('main-container').style.display = 'none';
    loadAnalyticsData();
}

// Hide analytics dashboard
function hideAnalytics() {
    document.getElementById('analytics-container').style.display = 'none';
    document.getElementById('main-container').style.display = 'block';
}

// Load analytics data
async function loadAnalyticsData() {
    try {
        const jobFilesSnapshot = await firebase.firestore().collection('jobFiles').get();
        const deliverySnapshot = await firebase.firestore().collection('delivery_requests').get();
        
        // Process job files data
        const jobFiles = [];
        const statusCounts = { pending: 0, approved: 0, rejected: 0, checked: 0 };
        const monthlyData = {};
        
        jobFilesSnapshot.forEach(doc => {
            const data = doc.data();
            jobFiles.push({ id: doc.id, ...data });
            
            // Count by status
            const status = data.status || 'pending';
            statusCounts[status] = (statusCounts[status] || 0) + 1;
            
            // Monthly data
            if (data.createdAt) {
                const date = data.createdAt.toDate();
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
            }
        });
        
        // Process delivery data
        const deliveryRequests = [];
        const deliveryStatusCounts = { assigned: 0, in_transit: 0, delivered: 0 };
        
        deliverySnapshot.forEach(doc => {
            const data = doc.data();
            deliveryRequests.push({ id: doc.id, ...data });
            
            const status = data.status || 'assigned';
            deliveryStatusCounts[status] = (deliveryStatusCounts[status] || 0) + 1;
        });
        
        analyticsData = {
            jobFiles,
            deliveryRequests,
            statusCounts,
            deliveryStatusCounts,
            monthlyData,
            totalFiles: jobFiles.length,
            totalDeliveries: deliveryRequests.length
        };
        
        renderAnalytics();
        
    } catch (error) {
        console.error('Error loading analytics:', error);
        showNotification('Error loading analytics data', 'error');
    }
}

// Render analytics dashboard
function renderAnalytics() {
    const container = document.getElementById('analytics-content');
    
    container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1.5rem; border-radius: 0.5rem;">
                <h3 style="margin: 0 0 0.5rem 0; font-size: 1.1rem;">Total Job Files</h3>
                <p style="margin: 0; font-size: 2rem; font-weight: bold;">${analyticsData.totalFiles}</p>
            </div>
            <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 1.5rem; border-radius: 0.5rem;">
                <h3 style="margin: 0 0 0.5rem 0; font-size: 1.1rem;">Total Deliveries</h3>
                <p style="margin: 0; font-size: 2rem; font-weight: bold;">${analyticsData.totalDeliveries}</p>
            </div>
            <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 1.5rem; border-radius: 0.5rem;">
                <h3 style="margin: 0 0 0.5rem 0; font-size: 1.1rem;">Approved Files</h3>
                <p style="margin: 0; font-size: 2rem; font-weight: bold;">${analyticsData.statusCounts.approved || 0}</p>
            </div>
            <div style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white; padding: 1.5rem; border-radius: 0.5rem;">
                <h3 style="margin: 0 0 0.5rem 0; font-size: 1.1rem;">Delivered Today</h3>
                <p style="margin: 0; font-size: 2rem; font-weight: bold;">${getDeliveredToday()}</p>
            </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
            <div style="background: white; padding: 1.5rem; border-radius: 0.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h3 style="margin: 0 0 1rem 0;">Job File Status Distribution</h3>
                ${renderStatusChart()}
            </div>
            <div style="background: white; padding: 1.5rem; border-radius: 0.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h3 style="margin: 0 0 1rem 0;">Delivery Status Distribution</h3>
                ${renderDeliveryStatusChart()}
            </div>
        </div>
        
        <div style="background: white; padding: 1.5rem; border-radius: 0.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h3 style="margin: 0 0 1rem 0;">Recent Job Files</h3>
            ${renderRecentJobFiles()}
        </div>
    `;
}

// Get delivered today count
function getDeliveredToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return analyticsData.deliveryRequests.filter(delivery => {
        if (delivery.status === 'delivered' && delivery.deliveredAt) {
            const deliveryDate = delivery.deliveredAt.toDate();
            deliveryDate.setHours(0, 0, 0, 0);
            return deliveryDate.getTime() === today.getTime();
        }
        return false;
    }).length;
}

// Render status chart
function renderStatusChart() {
    const total = analyticsData.totalFiles;
    if (total === 0) return '<p>No data available</p>';
    
    const statuses = [
        { name: 'Pending', count: analyticsData.statusCounts.pending || 0, color: '#fbbf24' },
        { name: 'Approved', count: analyticsData.statusCounts.approved || 0, color: '#10b981' },
        { name: 'Rejected', count: analyticsData.statusCounts.rejected || 0, color: '#ef4444' },
        { name: 'Checked', count: analyticsData.statusCounts.checked || 0, color: '#3b82f6' }
    ];
    
    return statuses.map(status => {
        const percentage = ((status.count / total) * 100).toFixed(1);
        return `
            <div style="margin-bottom: 0.5rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                    <span>${status.name}</span>
                    <span>${status.count} (${percentage}%)</span>
                </div>
                <div style="background: #e5e7eb; height: 8px; border-radius: 4px;">
                    <div style="background: ${status.color}; height: 100%; width: ${percentage}%; border-radius: 4px;"></div>
                </div>
            </div>
        `;
    }).join('');
}

// Render delivery status chart
function renderDeliveryStatusChart() {
    const total = analyticsData.totalDeliveries;
    if (total === 0) return '<p>No data available</p>';
    
    const statuses = [
        { name: 'Assigned', count: analyticsData.deliveryStatusCounts.assigned || 0, color: '#fbbf24' },
        { name: 'In Transit', count: analyticsData.deliveryStatusCounts.in_transit || 0, color: '#3b82f6' },
        { name: 'Delivered', count: analyticsData.deliveryStatusCounts.delivered || 0, color: '#10b981' }
    ];
    
    return statuses.map(status => {
        const percentage = ((status.count / total) * 100).toFixed(1);
        return `
            <div style="margin-bottom: 0.5rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                    <span>${status.name}</span>
                    <span>${status.count} (${percentage}%)</span>
                </div>
                <div style="background: #e5e7eb; height: 8px; border-radius: 4px;">
                    <div style="background: ${status.color}; height: 100%; width: ${percentage}%; border-radius: 4px;"></div>
                </div>
            </div>
        `;
    }).join('');
}

// Render recent job files
function renderRecentJobFiles() {
    const recentFiles = analyticsData.jobFiles
        .sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0))
        .slice(0, 10);
    
    if (recentFiles.length === 0) {
        return '<p>No job files found</p>';
    }
    
    return `
        <table class="analytics-table" style="width: 100%;">
            <thead>
                <tr>
                    <th>Job File No.</th>
                    <th>Client Name</th>
                    <th>Status</th>
                    <th>Created Date</th>
                    <th>Total Amount</th>
                </tr>
            </thead>
            <tbody>
                ${recentFiles.map(file => `
                    <tr>
                        <td>${file.jobFileNo || 'N/A'}</td>
                        <td>${file.clientName || 'N/A'}</td>
                        <td>
                            <span style="padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; font-weight: bold; 
                                background: ${getStatusColor(file.status)}; color: white;">
                                ${(file.status || 'pending').toUpperCase()}
                            </span>
                        </td>
                        <td>${file.createdAt ? file.createdAt.toDate().toLocaleDateString() : 'N/A'}</td>
                        <td>₹${file.totalAmount || '0'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Get status color
function getStatusColor(status) {
    const colors = {
        pending: '#fbbf24',
        approved: '#10b981',
        rejected: '#ef4444',
        checked: '#3b82f6'
    };
    return colors[status] || '#6b7280';
}

// Export analytics functions
window.analyticsModule = {
    showAnalytics,
    hideAnalytics,
    loadAnalyticsData
};