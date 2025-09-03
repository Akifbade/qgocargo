// Driver Dashboard Module
let driverAssignments = [];
let currentAssignment = null;

// Load driver dashboard
async function loadDriverDashboard() {
    const currentUser = window.authModule.getCurrentUser();
    if (!currentUser) return;
    
    try {
        // Load driver assignments
        const snapshot = await firebase.firestore()
            .collection('delivery_requests')
            .where('driverId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .get();
        
        driverAssignments = [];
        snapshot.forEach(doc => {
            driverAssignments.push({ id: doc.id, ...doc.data() });
        });
        
        renderDriverStats();
        renderDriverAssignments();
        
    } catch (error) {
        console.error('Error loading driver assignments:', error);
        showNotification('Error loading assignments', 'error');
    }
}

// Render driver statistics
function renderDriverStats() {
    const pending = driverAssignments.filter(a => a.status === 'assigned').length;
    const inTransit = driverAssignments.filter(a => a.status === 'in_transit').length;
    const deliveredToday = getDeliveredTodayCount();
    const totalDelivered = driverAssignments.filter(a => a.status === 'delivered').length;
    
    document.getElementById('driver-stats').innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
            <div style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: white; padding: 1.5rem; border-radius: 0.5rem; text-align: center;">
                <h3 style="margin: 0 0 0.5rem 0;">Pending</h3>
                <p style="margin: 0; font-size: 2rem; font-weight: bold;">${pending}</p>
            </div>
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 1.5rem; border-radius: 0.5rem; text-align: center;">
                <h3 style="margin: 0 0 0.5rem 0;">In Transit</h3>
                <p style="margin: 0; font-size: 2rem; font-weight: bold;">${inTransit}</p>
            </div>
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 1.5rem; border-radius: 0.5rem; text-align: center;">
                <h3 style="margin: 0 0 0.5rem 0;">Delivered Today</h3>
                <p style="margin: 0; font-size: 2rem; font-weight: bold;">${deliveredToday}</p>
            </div>
            <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 1.5rem; border-radius: 0.5rem; text-align: center;">
                <h3 style="margin: 0 0 0.5rem 0;">Total Delivered</h3>
                <p style="margin: 0; font-size: 2rem; font-weight: bold;">${totalDelivered}</p>
            </div>
        </div>
    `;
}

// Get delivered today count
function getDeliveredTodayCount() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return driverAssignments.filter(assignment => {
        if (assignment.status === 'delivered' && assignment.deliveredAt) {
            const deliveryDate = assignment.deliveredAt.toDate();
            deliveryDate.setHours(0, 0, 0, 0);
            return deliveryDate.getTime() === today.getTime();
        }
        return false;
    }).length;
}

// Render driver assignments
function renderDriverAssignments() {
    const container = document.getElementById('driver-assignments');
    
    if (driverAssignments.length === 0) {
        container.innerHTML = '<p>No assignments found</p>';
        return;
    }
    
    container.innerHTML = driverAssignments.map(assignment => `
        <div style="background: white; padding: 1.5rem; border-radius: 0.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 1rem;">
            <div style="display: flex; justify-content: between; align-items: start; margin-bottom: 1rem;">
                <div>
                    <h3 style="margin: 0 0 0.5rem 0;">Job File: ${assignment.jobFileNo || 'N/A'}</h3>
                    <p style="margin: 0; color: #6b7280;">Client: ${assignment.clientName || 'N/A'}</p>
                </div>
                <span style="padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.75rem; font-weight: bold; 
                    background: ${getDeliveryStatusColor(assignment.status)}; color: white;">
                    ${(assignment.status || 'assigned').toUpperCase()}
                </span>
            </div>
            
            <div style="margin-bottom: 1rem;">
                <p style="margin: 0 0 0.25rem 0;"><strong>Address:</strong> ${assignment.deliveryAddress || 'N/A'}</p>
                <p style="margin: 0 0 0.25rem 0;"><strong>Contact:</strong> ${assignment.deliveryContact || 'N/A'}</p>
                <p style="margin: 0 0 0.25rem 0;"><strong>Type:</strong> ${assignment.deliveryType || 'Standard'}</p>
                ${assignment.scheduledDate ? `<p style="margin: 0 0 0.25rem 0;"><strong>Scheduled:</strong> ${assignment.scheduledDate} ${assignment.scheduledTime || ''}</p>` : ''}
                ${assignment.specialInstructions ? `<p style="margin: 0 0 0.25rem 0;"><strong>Instructions:</strong> ${assignment.specialInstructions}</p>` : ''}
            </div>
            
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                ${assignment.status === 'assigned' ? `
                    <button onclick="startDelivery('${assignment.id}')" 
                            style="background: #3b82f6; color: white; padding: 0.5rem 1rem; border: none; border-radius: 0.25rem; cursor: pointer;">
                        Start Delivery
                    </button>
                ` : ''}
                
                ${assignment.status === 'in_transit' ? `
                    <button onclick="completeDelivery('${assignment.id}')" 
                            style="background: #10b981; color: white; padding: 0.5rem 1rem; border: none; border-radius: 0.25rem; cursor: pointer;">
                        Complete Delivery
                    </button>
                ` : ''}
                
                ${assignment.status === 'delivered' ? `
                    <button onclick="viewReceipt('${assignment.id}')" 
                            style="background: #8b5cf6; color: white; padding: 0.5rem 1rem; border: none; border-radius: 0.25rem; cursor: pointer;">
                        View Receipt
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// Start delivery
async function startDelivery(assignmentId) {
    try {
        await firebase.firestore().collection('delivery_requests').doc(assignmentId).update({
            status: 'in_transit',
            startedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showNotification('Delivery started!', 'success');
        loadDriverDashboard();
        
    } catch (error) {
        console.error('Error starting delivery:', error);
        showNotification('Error starting delivery', 'error');
    }
}

// Complete delivery - show POD modal
function completeDelivery(assignmentId) {
    currentAssignment = driverAssignments.find(a => a.id === assignmentId);
    if (!currentAssignment) return;
    
    document.getElementById('pod-modal').style.display = 'flex';
    
    // Clear previous signature
    const canvas = document.getElementById('signature-canvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Clear form
    document.getElementById('recipient-name').value = '';
    document.getElementById('recipient-id').value = '';
    document.getElementById('delivery-notes').value = '';
}

// Initialize signature canvas
function initializeSignatureCanvas() {
    const canvas = document.getElementById('signature-canvas');
    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    // Touch events for mobile
    canvas.addEventListener('touchstart', handleTouch);
    canvas.addEventListener('touchmove', handleTouch);
    canvas.addEventListener('touchend', stopDrawing);
    
    function startDrawing(e) {
        isDrawing = true;
        draw(e);
    }
    
    function draw(e) {
        if (!isDrawing) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#000';
        
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    }
    
    function stopDrawing() {
        if (isDrawing) {
            isDrawing = false;
            ctx.beginPath();
        }
    }
    
    function handleTouch(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 
                                        e.type === 'touchmove' ? 'mousemove' : 'mouseup', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
    }
}

// Clear signature
function clearSignature() {
    const canvas = document.getElementById('signature-canvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Submit POD
async function submitPOD() {
    const recipientName = document.getElementById('recipient-name').value;
    const recipientId = document.getElementById('recipient-id').value;
    const deliveryNotes = document.getElementById('delivery-notes').value;
    
    if (!recipientName) {
        showNotification('Please enter recipient name', 'error');
        return;
    }
    
    // Get signature data
    const canvas = document.getElementById('signature-canvas');
    const signatureData = canvas.toDataURL();
    
    // Check if signature is empty
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const isEmpty = !imageData.data.some(channel => channel !== 0);
    
    if (isEmpty) {
        showNotification('Please provide signature', 'error');
        return;
    }
    
    try {
        // Update delivery request
        await firebase.firestore().collection('delivery_requests').doc(currentAssignment.id).update({
            status: 'delivered',
            deliveredAt: firebase.firestore.FieldValue.serverTimestamp(),
            recipientName: recipientName,
            recipientId: recipientId,
            deliveryNotes: deliveryNotes,
            signature: signatureData
        });
        
        showNotification('Delivery completed successfully!', 'success');
        
        // Hide POD modal
        document.getElementById('pod-modal').style.display = 'none';
        
        // Show receipt
        generateDeliveryReceipt(currentAssignment.id);
        
        // Refresh dashboard
        loadDriverDashboard();
        
    } catch (error) {
        console.error('Error completing delivery:', error);
        showNotification('Error completing delivery', 'error');
    }
}

// Generate delivery receipt
async function generateDeliveryReceipt(assignmentId) {
    try {
        const doc = await firebase.firestore().collection('delivery_requests').doc(assignmentId).get();
        if (!doc.exists) return;
        
        const assignment = doc.data();
        const receiptId = `RCP-${Date.now()}`;
        
        // Generate QR code data
        const qrData = `Receipt ID: ${receiptId}\nJob File: ${assignment.jobFileNo}\nDelivered: ${new Date().toLocaleString()}`;
        
        // Show receipt modal
        document.getElementById('receipt-modal').style.display = 'flex';
        document.getElementById('receipt-content').innerHTML = `
            <div style="text-align: center; padding: 2rem; background: white;">
                <h2 style="color: #1f2937; margin-bottom: 1rem;">Delivery Receipt</h2>
                <div id="qr-code" style="margin: 1rem 0;"></div>
                
                <div style="text-align: left; margin: 1.5rem 0;">
                    <p><strong>Receipt ID:</strong> ${receiptId}</p>
                    <p><strong>Job File No:</strong> ${assignment.jobFileNo}</p>
                    <p><strong>Client:</strong> ${assignment.clientName}</p>
                    <p><strong>Delivered To:</strong> ${assignment.recipientName}</p>
                    <p><strong>Delivery Address:</strong> ${assignment.deliveryAddress}</p>
                    <p><strong>Delivered At:</strong> ${new Date().toLocaleString()}</p>
                    <p><strong>Driver:</strong> ${assignment.driverName}</p>
                </div>
                
                <div style="margin-top: 2rem;">
                    <button onclick="printReceipt()" style="background: #3b82f6; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 0.25rem; cursor: pointer; margin-right: 0.5rem;">
                        Print Receipt
                    </button>
                    <button onclick="shareReceipt()" style="background: #10b981; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 0.25rem; cursor: pointer;">
                        Share PDF
                    </button>
                </div>
            </div>
        `;
        
        // Generate QR code
        if (typeof QRCode !== 'undefined') {
            new QRCode(document.getElementById('qr-code'), {
                text: qrData,
                width: 128,
                height: 128
            });
        }
        
    } catch (error) {
        console.error('Error generating receipt:', error);
        showNotification('Error generating receipt', 'error');
    }
}

// View existing receipt
function viewReceipt(assignmentId) {
    generateDeliveryReceipt(assignmentId);
}

// Print receipt
function printReceipt() {
    window.print();
}

// Share receipt (placeholder for PDF generation)
function shareReceipt() {
    showNotification('PDF sharing feature will be implemented with a PDF service', 'info');
}

// Get delivery status color
function getDeliveryStatusColor(status) {
    const colors = {
        assigned: '#fbbf24',
        in_transit: '#3b82f6',
        delivered: '#10b981'
    };
    return colors[status] || '#6b7280';
}

// Initialize driver module
function initializeDriverModule() {
    // Initialize signature canvas when DOM is loaded
    if (document.getElementById('signature-canvas')) {
        initializeSignatureCanvas();
    }
}

// Export driver functions
window.driverModule = {
    loadDriverDashboard,
    startDelivery,
    completeDelivery,
    submitPOD,
    clearSignature,
    viewReceipt,
    printReceipt,
    shareReceipt,
    initializeDriverModule
};