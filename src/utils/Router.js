export class Router {
    constructor() {
        this.routes = {
            'login': () => import('../pages/LoginPage.js').then(m => new m.LoginPage()),
            'dashboard': () => import('../pages/DashboardPage.js').then(m => new m.DashboardPage()),
            'job-file': () => import('../pages/JobFilePage.js').then(m => new m.JobFilePage())
        };
        this.currentPage = null;
    }

    async navigate(routeName, params = {}) {
        try {
            // Handle external HTML pages
            const externalPages = ['analytics', 'file-manager', 'clients', 'admin', 'activity-log'];
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
                <div class="min-h-screen flex items-center justify-center">
                    <div class="text-center">
                        <h1 class="text-2xl font-bold text-red-600 mb-4">Error Loading Page</h1>
                        <p class="text-gray-600 mb-4">${error.message}</p>
                        <button onclick="window.app.router.navigate('dashboard')" 
                                class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
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