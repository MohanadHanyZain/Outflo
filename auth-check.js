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
        window.location.href = 'login.html';
        return false;
    }
    
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
// Get user profile from database
// =============================================
async function getUserProfile(userId) {
    const { data, error } = await supabaseClient
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
    
    if (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }
    return data;
}

// =============================================
// Save lead to database
// =============================================
async function saveLead(userId, platform, searchQuery, location, resultsData) {
    const { data, error } = await supabaseClient
        .from('leads')
        .insert({
            user_id: userId,
            platform: platform,
            search_query: searchQuery,
            location: location || null,
            results_count: resultsData ? resultsData.length : 0,
            data: resultsData || [],
            status: resultsData && resultsData.length > 0 ? 'ready' : 'pending'
        })
        .select()
        .single();
    
    if (error) {
        console.error('Error saving lead:', error);
        return null;
    }
    return data;
}

// =============================================
// Get all leads for a user
// =============================================
async function getUserLeads(userId) {
    const { data, error } = await supabaseClient
        .from('leads')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error fetching leads:', error);
        return [];
    }
    return data;
}

// =============================================
// Get lead statistics for a user
// =============================================
async function getUserLeadStats(userId) {
    const { data, error } = await supabaseClient
        .from('leads')
        .select('platform, results_count, status')
        .eq('user_id', userId);
    
    if (error) {
        console.error('Error fetching lead stats:', error);
        return { total: 0, google: 0, linkedin: 0, pending: 0, ready: 0 };
    }
    
    const stats = {
        total: 0,
        google: 0,
        linkedin: 0,
        pending: 0,
        ready: 0
    };
    
    data.forEach(lead => {
        stats.total += lead.results_count || 0;
        if (lead.platform === 'google') stats.google += lead.results_count || 0;
        if (lead.platform === 'linkedin') stats.linkedin += lead.results_count || 0;
        if (lead.status === 'pending') stats.pending++;
        if (lead.status === 'ready') stats.ready++;
    });
    
    return stats;
}

// =============================================
// Logout function
// =============================================
async function logoutUser() {
    await supabaseClient.auth.signOut();
    window.location.href = 'login.html';
}

// =============================================
// Listen for auth changes
// =============================================
supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
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
        logoutBtn.removeEventListener('click', logoutUser);
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
        // Also get profile from DB
        const profile = await getUserProfile(userData.user.id);
        return { ...userData, profile };
    }
    return null;
}

// =============================================
// Dashboard functions
// =============================================
async function loadDashboardStats(userId) {
    const stats = await getUserLeadStats(userId);
    const leads = await getUserLeads(userId);
    return { stats, leads };
}

// =============================================
// Export for use in other files
// =============================================
window.Auth = {
    requireAuth,
    getCurrentUser,
    getUserProfile,
    saveLead,
    getUserLeads,
    getUserLeadStats,
    loadDashboardStats,
    logoutUser,
    updateUserDisplay,
    initAuth,
    supabase: supabaseClient
};

console.log('🔐 Auth system initialized with database support');