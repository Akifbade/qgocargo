export class Router {
    constructor() {
        this.routes = {
            'login': () => import('../pages/LoginPage.js').then(m => new m.LoginPage()),
            'dashboard': () => import('../pages/DashboardPage.js').then(m => new m.DashboardPage()),
            'job-file': () => import('../pages/JobFilePage.js').then(m => new m.JobFilePage()),
            'analytics': () => import('../pages/AnalyticsPage.js').then(m => new m.AnalyticsPage()),
            'file-manager': () => import('../pages/FileManagerPage.js').then(m => new m.FileManagerPage())
        };
        this.currentPage = null;
    }

    async navigate(routeName, params = {}) {
        try {
            // Handle external HTML pages that don't have JS modules yet
            const externalPages = ['clients', 'admin', 'activity-log'];
            if (externalPages.includes(routeName)) {
                window.location.href = `${routeName}.html`;
                return;
            }

            // Security check for protected routes
            if (routeName !== 'login' && !window.app.currentUser) {
                this.navigate('login');
                return;
            }

            // Clean up current page
            if (this.currentPage && typeof this.currentPage.cleanup === 'function') {
                this.currentPage.cleanup();
            }

            // Load and render new page
            const PageClass = await this.routes[routeName]();
            this.currentPage = PageClass;
            
            const appContainer = document.getElementById('app');
            appContainer.innerHTML = await this.currentPage.render(params);
            
            // Initialize page
            if (typeof this.currentPage.init === 'function') {
                this.currentPage.init(params);
            }

            // Update URL without page reload
            const newUrl = routeName === 'dashboard' ? '/' : `/${routeName}`;
            window.history.pushState({ route: routeName, params }, '', newUrl);
            
        } catch (error) {
            console.error('Navigation error:', error);
            document.getElementById('app').innerHTML = `
                <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
                    <div class="text-center bg-white p-8 rounded-2xl shadow-xl">
                        <div class="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                            </svg>
                        </div>
                        <h1 class="text-2xl font-bold text-red-600 mb-4">Error Loading Page</h1>
                        <p class="text-gray-600 mb-6">${error.message}</p>
                        <button onclick="window.app.router.navigate('dashboard')" 
                                class="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-lg font-bold transition-all transform hover:scale-105">
                            Return to Dashboard
                        </button>
                    </div>
                </div>
            `;
        }
    }

    init() {
        // Handle browser back/forward buttons
        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.route) {
                this.navigate(event.state.route, event.state.params);
            }
        });

        // Handle initial route
        const path = window.location.pathname;
        if (path === '/' || path === '/index.html') {
            // Will be handled by auth state change
        } else {
            const routeName = path.substring(1);
            if (this.routes[routeName]) {
                // Will be handled by auth state change
            }
        }
    }
}