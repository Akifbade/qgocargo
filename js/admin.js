// Admin Panel Module
let allUsers = [];

// Show admin panel
function showAdminPanel() {
    if (window.authModule.getUserRole() !== 'admin') {
        showNotification('Access denied. Admin privileges required.', 'error');
        return;
    }
    
    document.getElementById('admin-modal').style.display = 'flex';
    loadUsers();
}

// Hide admin panel
function hideAdminPanel() {
    document.getElementById('admin-modal').style.display = 'none';
}

// Load all users
async function loadUsers() {
    try {
        const snapshot = await firebase.firestore().collection('users').get();
        allUsers = [];
        
        snapshot.forEach(doc => {
            allUsers.push({ id: doc.id, ...doc.data() });
        });
        
        renderUsersList();
        
    } catch (error) {
        console.error('Error loading users:', error);
        showNotification('Error loading users', 'error');
    }
}

// Render users list
function renderUsersList() {
    const container = document.getElementById('users-list');
    
    if (allUsers.length === 0) {
        container.innerHTML = '<p>No users found</p>';
        return;
    }
    
    container.innerHTML = `
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="background: #f3f4f6;">
                    <th style="padding: 0.75rem; text-align: left; border: 1px solid #d1d5db;">Name</th>
                    <th style="padding: 0.75rem; text-align: left; border: 1px solid #d1d5db;">Email</th>
                    <th style="padding: 0.75rem; text-align: left; border: 1px solid #d1d5db;">Role</th>
                    <th style="padding: 0.75rem; text-align: left; border: 1px solid #d1d5db;">Actions</th>
                </tr>
            </thead>
            <tbody>
                ${allUsers.map(user => `
                    <tr>
                        <td style="padding: 0.75rem; border: 1px solid #d1d5db;">${user.name || 'N/A'}</td>
                        <td style="padding: 0.75rem; border: 1px solid #d1d5db;">${user.email}</td>
                        <td style="padding: 0.75rem; border: 1px solid #d1d5db;">
                            <select onchange="updateUserRole('${user.id}', this.value)" 
                                    style="padding: 0.25rem; border: 1px solid #d1d5db; border-radius: 0.25rem;">
                                <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                                <option value="checker" ${user.role === 'checker' ? 'selected' : ''}>Checker</option>
                                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                                <option value="driver" ${user.role === 'driver' ? 'selected' : ''}>Driver</option>
                            </select>
                        </td>
                        <td style="padding: 0.75rem; border: 1px solid #d1d5db;">
                            <button onclick="deleteUser('${user.id}')" 
                                    style="background: #ef4444; color: white; padding: 0.25rem 0.5rem; border: none; border-radius: 0.25rem; cursor: pointer;">
                                Delete
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Update user role
async function updateUserRole(userId, newRole) {
    try {
        await firebase.firestore().collection('users').doc(userId).update({
            role: newRole,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showNotification(`User role updated to ${newRole}`, 'success');
        loadUsers(); // Refresh the list
        
    } catch (error) {
        console.error('Error updating user role:', error);
        showNotification('Error updating user role', 'error');
    }
}

// Delete user
async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) {
        return;
    }
    
    try {
        await firebase.firestore().collection('users').doc(userId).delete();
        showNotification('User deleted successfully', 'success');
        loadUsers(); // Refresh the list
        
    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification('Error deleting user', 'error');
    }
}

// Add new user
async function addNewUser() {
    const name = document.getElementById('new-user-name').value;
    const email = document.getElementById('new-user-email').value;
    const password = document.getElementById('new-user-password').value;
    const role = document.getElementById('new-user-role').value;
    
    if (!name || !email || !password) {
        showNotification('Please fill in all fields', 'error');
        return;
    }
    
    try {
        // Create user account
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        
        // Create user document
        await firebase.firestore().collection('users').doc(userCredential.user.uid).set({
            name: name,
            email: email,
            role: role,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showNotification('User created successfully', 'success');
        
        // Clear form
        document.getElementById('new-user-name').value = '';
        document.getElementById('new-user-email').value = '';
        document.getElementById('new-user-password').value = '';
        document.getElementById('new-user-role').value = 'user';
        
        loadUsers(); // Refresh the list
        
    } catch (error) {
        console.error('Error creating user:', error);
        showNotification('Error creating user: ' + error.message, 'error');
    }
}

// Export admin functions
window.adminModule = {
    showAdminPanel,
    hideAdminPanel,
    updateUserRole,
    deleteUser,
    addNewUser
};