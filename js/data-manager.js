// Data Management Module
import { db } from './firebase-config.js';
import { authManager } from './auth.js';
import { 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    orderBy,
    onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { showMessage, updateStats } from './ui-controller.js';

class DataManager {
    constructor() {
        this.items = [];
        this.unsubscribe = null;
    }

    async loadUserData() {
        const user = authManager.getCurrentUser();
        if (!user) return;

        try {
            // Set up real-time listener
            const q = query(
                collection(db, 'items'),
                where('userId', '==', user.uid),
                orderBy('createdAt', 'desc')
            );

            this.unsubscribe = onSnapshot(q, (snapshot) => {
                this.items = [];
                snapshot.forEach((doc) => {
                    this.items.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                this.renderItems();
                updateStats(this.items);
            });

        } catch (error) {
            console.error('Error loading data:', error);
            showMessage('Error loading data. Please refresh the page.', 'error');
        }
    }

    async addItem(itemData) {
        const user = authManager.getCurrentUser();
        if (!user) return;

        try {
            const docData = {
                ...itemData,
                userId: user.uid,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await addDoc(collection(db, 'items'), docData);
            showMessage('Item added successfully!', 'success');
        } catch (error) {
            console.error('Error adding item:', error);
            showMessage('Error adding item. Please try again.', 'error');
        }
    }

    async updateItem(itemId, updates) {
        try {
            const itemRef = doc(db, 'items', itemId);
            await updateDoc(itemRef, {
                ...updates,
                updatedAt: new Date()
            });
            showMessage('Item updated successfully!', 'success');
        } catch (error) {
            console.error('Error updating item:', error);
            showMessage('Error updating item. Please try again.', 'error');
        }
    }

    async deleteItem(itemId) {
        try {
            await deleteDoc(doc(db, 'items', itemId));
            showMessage('Item deleted successfully!', 'success');
        } catch (error) {
            console.error('Error deleting item:', error);
            showMessage('Error deleting item. Please try again.', 'error');
        }
    }

    renderItems(filteredItems = null) {
        const container = document.getElementById('items-container');
        const itemsToRender = filteredItems || this.items;

        if (itemsToRender.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted">
                    <p>No items found. Add some items to get started!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = itemsToRender.map(item => `
            <div class="item-card fade-in" data-item-id="${item.id}">
                <div class="item-header">
                    <h6 class="item-title">${this.escapeHtml(item.name)}</h6>
                    <span class="item-category">${this.escapeHtml(item.category)}</span>
                </div>
                ${item.description ? `<p class="item-description">${this.escapeHtml(item.description)}</p>` : ''}
                <div class="item-meta">
                    <div>
                        ${item.price ? `<span class="item-price">$${parseFloat(item.price).toFixed(2)}</span>` : ''}
                        ${item.quantity !== undefined ? `<span class="item-quantity ms-2">Qty: ${item.quantity}</span>` : ''}
                    </div>
                    <div class="item-actions">
                        <button class="btn btn-outline-primary btn-sm edit-item" data-item-id="${item.id}">
                            Edit
                        </button>
                        <button class="btn btn-outline-danger btn-sm delete-item" data-item-id="${item.id}">
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        // Add event listeners for edit and delete buttons
        this.attachItemEventListeners();
    }

    attachItemEventListeners() {
        // Edit buttons
        document.querySelectorAll('.edit-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = e.target.dataset.itemId;
                this.editItem(itemId);
            });
        });

        // Delete buttons
        document.querySelectorAll('.delete-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = e.target.dataset.itemId;
                if (confirm('Are you sure you want to delete this item?')) {
                    this.deleteItem(itemId);
                }
            });
        });
    }

    editItem(itemId) {
        const item = this.items.find(i => i.id === itemId);
        if (!item) return;

        // Populate form with item data
        document.getElementById('item-name').value = item.name || '';
        document.getElementById('item-category').value = item.category || '';
        document.getElementById('item-description').value = item.description || '';
        document.getElementById('item-price').value = item.price || '';
        document.getElementById('item-quantity').value = item.quantity || '';

        // Change form button to update mode
        const form = document.getElementById('dataForm');
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Update Item';
        submitBtn.className = 'btn btn-warning';
        
        // Store the item ID for updating
        form.dataset.editingId = itemId;

        // Scroll to form
        form.scrollIntoView({ behavior: 'smooth' });
    }

    filterItems(searchTerm, category) {
        let filtered = this.items;

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(item => 
                item.name.toLowerCase().includes(term) ||
                (item.description && item.description.toLowerCase().includes(term))
            );
        }

        if (category) {
            filtered = filtered.filter(item => item.category === category);
        }

        this.renderItems(filtered);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    cleanup() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
    }
}

// Create and export data manager instance
export const dataManager = new DataManager();