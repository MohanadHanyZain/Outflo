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
// Check authentication
// =============================================
async function requireAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return false;
    }
    return { user: session.user, session: session };
}

async function getCurrentUser() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    return session ? session.user : null;
}

// =============================================
// Get user profile
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
// ===== SAVE LEAD TO DATABASE (FIXED) =====
// =============================================
async function saveLead(userId, platform, searchQuery, location, resultsData) {
    console.log('💾 SAVING LEAD TO DATABASE...');
    console.log('📋 User ID:', userId);
    console.log('📋 Platform:', platform);
    console.log('📋 Search:', searchQuery);
    console.log('📋 Location:', location);
    console.log('📋 Results count:', resultsData ? resultsData.length : 0);
    
    try {
        // تحقق من وجود المستخدم في جدول users
        const { data: userCheck, error: userError } = await supabaseClient
            .from('users')
            .select('id')
            .eq('id', userId)
            .single();
        
        if (userError || !userCheck) {
            console.log('⚠️ User not found in users table, creating...');
            // إنشاء المستخدم إذا لم يكن موجوداً
            const { error: insertError } = await supabaseClient
                .from('users')
                .insert({
                    id: userId,
                    email: (await getCurrentUser()).email,
                    full_name: (await getCurrentUser()).user_metadata?.full_name || 'User'
                });
            
            if (insertError) {
                console.error('❌ Failed to create user:', insertError);
            } else {
                console.log('✅ User created successfully');
            }
        } else {
            console.log('✅ User found in database');
        }

        // حفظ البيانات
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
            .select();

        if (error) {
            console.error('❌ ERROR saving lead:', error);
            console.error('❌ Error details:', JSON.stringify(error));
            return null;
        }
        
        console.log('✅ LEAD SAVED SUCCESSFULLY!');
        console.log('📝 Saved data:', data);
        return data;
    } catch (err) {
        console.error('❌ EXCEPTION saving lead:', err);
        return null;
    }
}

// =============================================
// Get all leads for a user
// =============================================
async function getUserLeads(userId) {
    console.log('📊 FETCHING leads for user:', userId);
    
    try {
        const { data, error } = await supabaseClient
            .from('leads')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ ERROR fetching leads:', error);
            return [];
        }
        
        console.log('✅ FOUND', data.length, 'leads');
        console.log('📊 First lead:', data[0] || 'No leads');
        return data;
    } catch (err) {
        console.error('❌ EXCEPTION fetching leads:', err);
        return [];
    }
}

// =============================================
// Get lead statistics
// =============================================
async function getUserLeadStats(userId) {
    console.log('📊 FETCHING stats for user:', userId);
    
    try {
        const { data, error } = await supabaseClient
            .from('leads')
            .select('platform, results_count, status')
            .eq('user_id', userId);

        if (error) {
            console.error('❌ ERROR fetching stats:', error);
            return { total: 0, google: 0, linkedin: 0, pending: 0, ready: 0 };
        }

        console.log('✅ Found', data.length, 'leads for stats');

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

        console.log('📊 Stats calculated:', stats);
        return stats;
    } catch (err) {
        console.error('❌ EXCEPTION fetching stats:', err);
        return { total: 0, google: 0, linkedin: 0, pending: 0, ready: 0 };
    }
}

// =============================================
// Load dashboard data
// =============================================
async function loadDashboardData(userId) {
    console.log('📊 LOADING dashboard data for user:', userId);
    const stats = await getUserLeadStats(userId);
    const leads = await getUserLeads(userId);
    return { stats, leads };
}

// =============================================
// Logout
// =============================================
async function logoutUser() {
    await supabaseClient.auth.signOut();
    window.location.href = 'login.html';
}

// =============================================
// Auth state listener
// =============================================
supabaseClient.auth.onAuthStateChange((event, session) => {
    console.log('🔐 Auth event:', event);
    if (event === 'SIGNED_OUT') {
        if (!window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
    }
});

// =============================================
// Update user display
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
// Initialize auth
// =============================================
async function initAuth() {
    const userData = await requireAuth();
    if (userData) {
        updateUserDisplay(userData.user);
        const profile = await getUserProfile(userData.user.id);
        return { ...userData, profile };
    }
    return null;
}

// =============================================
// TEST: Insert test lead
// =============================================
async function testInsertLead() {
    console.log('🧪 TESTING lead insertion...');
    const user = await getCurrentUser();
    if (!user) {
        console.log('❌ No user logged in');
        return;
    }
    
    const result = await saveLead(
        user.id,
        'google',
        'test restaurant',
        'Dubai',
        [{ name: 'Test Place', phone: '+123456789' }]
    );
    
    console.log('🧪 Test result:', result);
}

// =============================================
// Export
// =============================================
window.Auth = {
    requireAuth,
    getCurrentUser,
    getUserProfile,
    saveLead,
    getUserLeads,
    getUserLeadStats,
    loadDashboardData,
    logoutUser,
    updateUserDisplay,
    initAuth,
    testInsertLead,
    supabase: supabaseClient
};

console.log('🔐 Auth system initialized');
console.log('📧 Supabase URL:', SUPABASE_URL);
console.log('🔑 Anon key length:', SUPABASE_ANON_KEY.length);