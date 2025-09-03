// UI Controller Module
let messageTimeout;

export function showMessage(message, type = 'info') {
    // Clear existing message timeout
    if (messageTimeout) {
        clearTimeout(messageTimeout);
    }

    // Remove existing messages
    const existingMessages = document.querySelectorAll('.alert-message');
    existingMessages.forEach(msg => msg.remove());

    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = `alert-message ${type === 'error' ? 'error-message' : 'success-message'} fade-in`;
    messageEl.textContent = message;

    // Insert at the top of the main container
    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(messageEl, container.firstChild);
    }

    // Auto-remove after 5 seconds
    messageTimeout = setTimeout(() => {
        messageEl.remove();
    }, 5000);
}

export function showLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'flex';
    }
}

export function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'none';
    }
}

export function updateStats(items) {
    const totalItems = items.length;
    const totalValue = items.reduce((sum, item) => {
        const price = parseFloat(item.price) || 0;
        const quantity = parseInt(item.quantity) || 1;
        return sum + (price * quantity);
    }, 0);
    
    const categories = new Set(items.map(item => item.category)).size;

    document.getElementById('total-items').textContent = totalItems;
    document.getElementById('total-value').textContent = `$${totalValue.toFixed(2)}`;
    document.getElementById('total-categories').textContent = categories;
}

export function resetForm() {
    const form = document.getElementById('dataForm');
    form.reset();
    
    // Reset form to add mode
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Add Item';
    submitBtn.className = 'btn btn-primary';
    
    // Remove editing ID
    delete form.dataset.editingId;
}

export function toggleAuthForms() {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    
    if (loginForm.style.display === 'none') {
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
    } else {
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
    }
}