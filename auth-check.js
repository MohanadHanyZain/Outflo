// =============================================
// Supabase Configuration
// =============================================
const SUPABASE_URL = 'https://smhkccanevtpdiuemseb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtaGtjY2FuZXZ0cGRpdWVtc2ViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MDg0NTQsImV4cCI6MjA5OTA4NDQ1NH0.KzynIoWK_MYc59Syk1b3KKGdhDab2cJKAWLRT6uId30';

// =============================================
// Initialize Supabase client
// =============================================
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =============================================
// Check authentication - redirects to login if not authenticated
// =============================================
async function requireAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session) {
        // User is not logged in - redirect to login page
        window.location.href = 'login.html';
        return false;
    }
    
    // User is logged in - return user data
    return {
        user: session.user,
        session: session
    };
}

// =============================================
// Get current user (without redirect)
// =============================================
async function getCurrentUser() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    return session ? session.user : null;
}

// =============================================
// Logout function
// =============================================
async function logoutUser() {
    await supabaseClient.auth.signOut();
    window.location.href = 'login.html';
}

// =============================================
// Listen for auth changes (automatic redirect on logout)
// =============================================
supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
        // Redirect to login when user logs out
        if (!window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
    }
});

// =============================================
// Update user display in header
// =============================================
function updateUserDisplay(user) {
    const userDisplay = document.getElementById('userDisplay');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (userDisplay && user) {
        const email = user.email || 'user';
        const name = user.user_metadata?.full_name || email.split('@')[0];
        userDisplay.innerHTML = `<i class="fas fa-user me-1"></i> ${name}`;
        userDisplay.title = email;
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logoutUser);
    }
}

// =============================================
// Initialize auth check for protected pages
// =============================================
async function initAuth() {
    const userData = await requireAuth();
    if (userData) {
        updateUserDisplay(userData.user);
    }
    return userData;
}

// Export for use in other files
window.Auth = {
    requireAuth,
    getCurrentUser,
    logoutUser,
    updateUserDisplay,
    initAuth,
    supabase: supabaseClient
};

console.log('🔐 Auth system initialized');