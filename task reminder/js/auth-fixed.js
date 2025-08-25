// Auth Module - Handles user authentication and session management

// DOM Elements
const authOverlay = document.getElementById('authOverlay');
const appContent = document.getElementById('appContent');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const togglePasswordBtns = document.querySelectorAll('.toggle-password');
const forgotPasswordLink = document.getElementById('forgotPassword');
const closeAuthBtn = document.getElementById('closeAuth');
const authTabs = document.querySelectorAll('.auth-tab');
const switchToLogin = document.getElementById('switchToLogin');
const switchToRegister = document.getElementById('switchToRegister');

// Constants
const SESSION_KEY = 'expenseTrackerSession';
const USERS_KEY = 'expenseTrackerUsers';

// Auth module
const authModule = {
    // Log in a user
    loginUser: function(email, password, rememberMe = false) {
        return new Promise((resolve, reject) => {
            try {
                const users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
                const user = users.find(u => u.email === email && u.password === password);
                
                if (user) {
                    // Create session
                    const session = {
                        userId: user.id,
                        email: user.email,
                        name: user.name,
                        expiresAt: rememberMe ? 
                            Date.now() + (30 * 24 * 60 * 60 * 1000) : // 30 days
                            undefined
                    };
                    
                    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
                    
                    // Hide auth overlay and show app content
                    if (authOverlay) authOverlay.classList.remove('active');
                    if (appContent) appContent.style.display = 'flex';
                    
                    // Dispatch auth state changed event
                    document.dispatchEvent(new CustomEvent('authStateChanged', {
                        detail: { user, isAuthenticated: true }
                    }));
                    
                    resolve(user);
                } else {
                    reject(new Error('Invalid email or password'));
                }
            } catch (error) {
                console.error('Login error:', error);
                reject(new Error('An error occurred during login'));
            }
        });
    },
    
    // Check if user is authenticated
    isAuthenticated: function() {
        const session = JSON.parse(localStorage.getItem(SESSION_KEY));
        if (!session) return false;
        
        // Check if session has expired
        if (session.expiresAt && session.expiresAt < Date.now()) {
            this.logoutUser();
            return false;
        }
        
        return true;
    },
    
    // Log out the current user
    logoutUser: function() {
        localStorage.removeItem(SESSION_KEY);
        if (authOverlay) authOverlay.classList.add('active');
        if (appContent) appContent.style.display = 'none';
        window.location.href = 'index.html';
    },
    
    // Get current user
    getCurrentUser: function() {
        const session = JSON.parse(localStorage.getItem(SESSION_KEY));
        if (!session) return null;
        
        const users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
        return users.find(u => u.id === session.userId) || null;
    }
};

// Show alert message
function showAlert(message, type = 'info') {
    // Remove any existing alerts
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    // Create alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Add alert to the page
    const container = document.querySelector('.auth-container') || document.body;
    if (container) {
        container.insertBefore(alertDiv, container.firstChild);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                const bsAlert = new bootstrap.Alert(alertDiv);
                bsAlert.close();
            }
        }, 5000);
    }
}

// Show success message
function showSuccess(message) {
    showAlert(message, 'success');
}

// Show error message
function showError(message) {
    showAlert(message, 'error');
}

// Switch between login and register forms
function switchAuthTab(tabName) {
    console.log('Switching to tab:', tabName);
    console.log('Auth tabs found:', authTabs.length);
    
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (tabName === 'login') {
        console.log('Activating login form');
        if (loginForm) loginForm.classList.add('active');
        if (registerForm) registerForm.classList.remove('active');
        
        // Update tab states
        authTabs.forEach((tab, index) => {
            if (tab.getAttribute('data-tab') === 'login') {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
    } else if (tabName === 'register') {
        console.log('Activating register form');
        if (registerForm) registerForm.classList.add('active');
        if (loginForm) loginForm.classList.remove('active');
        
        // Update tab states
        authTabs.forEach((tab, index) => {
            if (tab.getAttribute('data-tab') === 'register') {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
    } else {
        console.error('Invalid tab name:', tabName);
    }
}

// Initialize authentication
function initAuth() {
    // Check if user is already logged in
    if (authModule.isAuthenticated()) {
        // User is logged in, hide auth overlay and show app content
        if (authOverlay) authOverlay.classList.remove('active');
        if (appContent) appContent.style.display = 'flex';
        
        // Update user info in the UI
        const user = authModule.getCurrentUser();
        if (user) {
            const userNameElements = document.querySelectorAll('.user-name');
            userNameElements.forEach(el => {
                if (el) el.textContent = user.name || 'User';
            });
            
            const userEmailElements = document.querySelectorAll('.user-email');
            userEmailElements.forEach(el => {
                if (el) el.textContent = user.email || '';
            });
        }
    } else {
        // User is not logged in, show auth overlay
        if (authOverlay) authOverlay.classList.add('active');
        if (appContent) appContent.style.display = 'none';
    }
    
    // Add event listeners
    setupEventListeners();
}

// Set up event listeners
function setupEventListeners() {
    // Toggle password visibility - direct event delegation
    console.log('Setting up password toggle event listener...');
    document.addEventListener('click', function(e) {
        console.log('Document click event triggered');
        
        // Check if the clicked element is a toggle button or its child
        const toggleBtn = e.target.closest('.toggle-password');
        console.log('Toggle button found:', !!toggleBtn);
        
        if (!toggleBtn) return;
        
        e.preventDefault();
        console.log('Toggle button clicked');
        
        // Find the input and icon elements
        const inputGroup = toggleBtn.closest('.input-group');
        console.log('Input group found:', !!inputGroup);
        if (!inputGroup) return;
        
        const input = inputGroup.querySelector('input[type="password"], input[type="text"]');
        const icon = toggleBtn.querySelector('i');
        
        console.log('Input element found:', !!input);
        console.log('Icon element found:', !!icon);
        
        if (!input) return;
        
        console.log('Current input type:', input.type);
        
        // Toggle the input type and icon
        if (input.type === 'password') {
            input.type = 'text';
            console.log('Changed input type to: text');
            if (icon) {
                console.log('Toggling icon to eye-slash');
                icon.classList.remove('bi-eye');
                icon.classList.add('bi-eye-slash');
            }
        } else {
            input.type = 'password';
            console.log('Changed input type to: password');
            if (icon) {
                console.log('Toggling icon to eye');
                icon.classList.remove('bi-eye-slash');
                icon.classList.add('bi-eye');
            }
        }
    });

    // Add click event listeners to all tab elements
    authTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const tabName = tab.getAttribute('data-tab');
            switchAuthTab(tabName);
        });
    });

    // Keep the existing switch links for backward compatibility
    if (switchToLogin) {
        switchToLogin.addEventListener('click', (e) => {
            e.preventDefault();
            switchAuthTab('login');
        });
    }

    if (switchToRegister) {
        switchToRegister.addEventListener('click', (e) => {
            e.preventDefault();
            switchAuthTab('register');
        });
    }

    // Close auth overlay
    if (closeAuthBtn) {
        closeAuthBtn.addEventListener('click', () => {
            if (authOverlay) authOverlay.classList.remove('active');
        });
    }

    // Handle login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            const rememberMe = document.getElementById('rememberMe')?.checked || false;
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            
            try {
                // Show loading state
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Signing in...';
                
                // Attempt to log the user in
                await authModule.loginUser(email, password, rememberMe);
                
                // Show success message and reload the page
                showSuccess('Sign in successful!');
                
                // Reload the page after a short delay
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
                
            } catch (error) {
                showError(error.message || 'Invalid email or password');
                console.error('Sign in error:', error);
            } finally {
                // Reset button state
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnText;
                }
            }
        });
    }

    // Handle register form submission
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('registerName').value.trim();
            const email = document.getElementById('registerEmail').value.trim();
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const termsAccepted = document.getElementById('terms').checked;
            const submitBtn = registerForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            
            try {
                // Basic validation
                if (!termsAccepted) {
                    throw new Error('You must accept the terms and conditions');
                }
                
                if (password !== confirmPassword) {
                    throw new Error('Passwords do not match');
                }
                
                if (password.length < 8) {
                    throw new Error('Password must be at least 8 characters long');
                }
                
                // Show loading state
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Creating account...';
                
                // Get existing users or initialize empty array
                const users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
                
                // Check if email already exists
                if (users.some(user => user.email === email)) {
                    throw new Error('An account with this email already exists');
                }
                
                // Create new user
                const newUser = {
                    id: Date.now().toString(),
                    name,
                    email,
                    password, // In a real app, you should hash the password
                    createdAt: new Date().toISOString(),
                    preferences: {
                        currency: 'USD',
                        theme: 'light',
                        language: 'en'
                    }
                };
                
                // Save user to local storage
                users.push(newUser);
                localStorage.setItem(USERS_KEY, JSON.stringify(users));
                
                // Log the user in
                await authModule.loginUser(email, password, true);
                
                // Show success message and redirect
                showSuccess('Account created successfully!');
                
                // Reload the page after a short delay
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
                
            } catch (error) {
                showError(error.message || 'An error occurred during registration');
                console.error('Registration error:', error);
            } finally {
                // Reset button state
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnText;
                }
            }
        });
    }
}

// Make authModule available globally
window.authModule = authModule;

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded, initializing auth...');
    
    // Initialize authentication
    initAuth();
    
    // Set up event listeners
    setupEventListeners();
    
    // Make sure the correct tab is active on page load
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab === 'register') {
        switchAuthTab('register');
    } else {
        switchAuthTab('login');
    }
});
