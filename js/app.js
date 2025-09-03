// Main Application Module
import { authManager } from './auth.js';
import { dataManager } from './data-manager.js';
import { showMessage, resetForm, toggleAuthForms, showLoading } from './ui-controller.js';

class App {
    constructor() {
        this.init();
    }

    init() {
        showLoading();
        this.setupEventListeners();
        
        // Make dataManager globally available for auth state changes
        window.dataManager = dataManager;
    }

    setupEventListeners() {
        // Auth form toggles
        document.getElementById('show-signup').addEventListener('click', (e) => {
            e.preventDefault();
            toggleAuthForms();
        });

        document.getElementById('show-login').addEventListener('click', (e) => {
            e.preventDefault();
            toggleAuthForms();
        });

        // Login form
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            try {
                await authManager.signIn(email, password);
                e.target.reset();
            } catch (error) {
                // Error handling is done in authManager
            }
        });

        // Signup form
        document.getElementById('signupForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('signup-name').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            
            try {
                await authManager.signUp(email, password, name);
                e.target.reset();
            } catch (error) {
                // Error handling is done in authManager
            }
        });

        // Logout button
        document.getElementById('logout-btn').addEventListener('click', () => {
            authManager.signOut();
        });

        // Data form
        document.getElementById('dataForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
                name: document.getElementById('item-name').value,
                category: document.getElementById('item-category').value,
                description: document.getElementById('item-description').value,
                price: document.getElementById('item-price').value,
                quantity: document.getElementById('item-quantity').value
            };

            const editingId = e.target.dataset.editingId;
            
            try {
                if (editingId) {
                    await dataManager.updateItem(editingId, formData);
                } else {
                    await dataManager.addItem(formData);
                }
                resetForm();
            } catch (error) {
                // Error handling is done in dataManager
            }
        });

        // Clear form button
        document.getElementById('clear-form').addEventListener('click', () => {
            resetForm();
        });

        // Search functionality
        document.getElementById('search-input').addEventListener('input', (e) => {
            const searchTerm = e.target.value;
            const category = document.getElementById('filter-category').value;
            dataManager.filterItems(searchTerm, category);
        });

        // Category filter
        document.getElementById('filter-category').addEventListener('change', (e) => {
            const category = e.target.value;
            const searchTerm = document.getElementById('search-input').value;
            dataManager.filterItems(searchTerm, category);
        });
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new App();
});