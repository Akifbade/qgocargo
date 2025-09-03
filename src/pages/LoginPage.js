export class LoginPage {
    constructor() {
        this.isLogin = true;
    }

    async render() {
        return `
            <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div class="max-w-md w-full space-y-8">
                    <div>
                        <div class="text-center text-5xl font-extrabold" style="color: #0E639C;">
                            Q'go<span style="color: #4FB8AF;">Cargo</span>
                        </div>
                        <h2 id="auth-title" class="mt-6 text-center text-3xl font-extrabold text-gray-900">
                            Sign in to your account
                        </h2>
                    </div>
                    <div class="mt-8 space-y-6 bg-white p-8 rounded-lg shadow-md">
                        <div id="approval-message" class="hidden p-4 text-center text-yellow-800 bg-yellow-100 rounded-lg">
                            Your account is awaiting admin approval.
                        </div>
                        <div class="rounded-md shadow-sm -space-y-px">
                            <div id="signup-name-field" style="display: none;">
                                <label for="full-name" class="sr-only">Full Name</label>
                                <input id="full-name" name="name" type="text" autocomplete="name" required 
                                       class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" 
                                       placeholder="Full Name">
                            </div>
                            <div>
                                <label for="email-address" class="sr-only">Email address</label>
                                <input id="email-address" name="email" type="email" autocomplete="email" required 
                                       class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" 
                                       placeholder="Email address">
                            </div>
                            <div>
                                <label for="password" class="sr-only">Password</label>
                                <input id="password" name="password" type="password" autocomplete="current-password" required 
                                       class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" 
                                       placeholder="Password">
                            </div>
                        </div>
                        <div>
                            <button id="auth-btn" class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                Sign in
                            </button>
                        </div>
                        <p class="mt-2 text-center text-sm text-gray-600">
                            <a href="#" id="auth-link" class="font-medium text-indigo-600 hover:text-indigo-500">
                                Create a new account
                            </a>
                        </p>
                        <div class="text-center mt-2 text-sm">
                            <a href="#" id="forgot-password-link" class="font-medium text-indigo-600 hover:text-indigo-500">
                                Forgot your password?
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Forgot Password Modal -->
            <div id="forgot-password-modal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full hidden">
                <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                    <div class="mt-3 text-center">
                        <h3 class="text-lg font-medium text-gray-900">Reset Password</h3>
                        <div class="mt-2 px-7 py-3">
                            <p class="text-sm text-gray-500">Enter your email address and we will send you a link to reset your password.</p>
                            <input id="reset-email" type="email" class="mt-3 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" placeholder="Email address">
                        </div>
                        <div class="items-center px-4 py-3">
                            <button id="send-reset-link-btn" class="px-4 py-2 bg-indigo-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300">
                                Send Reset Link
                            </button>
                            <button id="cancel-reset-btn" class="mt-3 px-4 py-2 bg-gray-300 text-gray-800 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Toggle between login and signup
        document.getElementById('auth-link').addEventListener('click', (e) => {
            e.preventDefault();
            this.isLogin = !this.isLogin;
            this.toggleAuthView();
        });

        // Handle auth button click
        document.getElementById('auth-btn').addEventListener('click', async () => {
            const email = document.getElementById('email-address').value;
            const password = document.getElementById('password').value;
            
            if (this.isLogin) {
                await this.handleLogin(email, password);
            } else {
                const displayName = document.getElementById('full-name').value;
                if (!email || !password || !displayName) {
                    alert("Please fill all fields to sign up.");
                    return;
                }
                await this.handleSignUp(email, password, displayName);
            }
        });

        // Forgot password
        document.getElementById('forgot-password-link').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('forgot-password-modal').classList.remove('hidden');
        });

        document.getElementById('cancel-reset-btn').addEventListener('click', () => {
            document.getElementById('forgot-password-modal').classList.add('hidden');
        });

        document.getElementById('send-reset-link-btn').addEventListener('click', async () => {
            const email = document.getElementById('reset-email').value.trim();
            if (!email) {
                alert("Please enter your email address.");
                return;
            }
            
            const result = await window.app.authService.resetPassword(email);
            if (result.success) {
                document.getElementById('forgot-password-modal').classList.add('hidden');
                alert("Password reset link sent! Check your email inbox.");
            } else {
                alert("Could not send reset link. Please try again.");
            }
        });
    }

    toggleAuthView() {
        const nameField = document.getElementById('signup-name-field');
        const emailField = document.getElementById('email-address');
        
        document.getElementById('auth-title').textContent = this.isLogin ? 'Sign in to your account' : 'Create a new account';
        document.getElementById('auth-btn').textContent = this.isLogin ? 'Sign in' : 'Sign up';
        document.getElementById('auth-link').textContent = this.isLogin ? 'Create a new account' : 'Already have an account? Sign in';
        nameField.style.display = this.isLogin ? 'none' : 'block';
        emailField.classList.toggle('rounded-t-md', this.isLogin);
        document.getElementById('approval-message').style.display = 'none';
    }

    async handleLogin(email, password) {
        const result = await window.app.authService.login(email, password);
        if (!result.success) {
            alert(result.error);
        }
    }

    async handleSignUp(email, password, displayName) {
        const result = await window.app.authService.register(email, password, displayName);
        if (result.success) {
            if (result.needsApproval) {
                alert("Account created! Please wait for admin approval.");
                this.isLogin = true;
                this.toggleAuthView();
            } else {
                alert("Admin account created successfully!");
            }
        } else {
            alert(result.error);
        }
    }
}