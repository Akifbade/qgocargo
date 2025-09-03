// Simple fallback for GitHub Pages - just redirect to login.html if modules fail
console.log('Main.js loading...');

// If we're on GitHub Pages and modules fail to load, redirect to login.html
setTimeout(() => {
    console.log('Fallback: Redirecting to login.html for GitHub Pages compatibility');
    window.location.href = 'login.html';
}, 1000);

// Try to load the modern module system
try {
    import('./app.js').catch(error => {
        console.log('Module loading failed, using fallback');
        window.location.href = 'login.html';
    });
} catch (error) {
    console.log('Import failed, using fallback');
    window.location.href = 'login.html';
}