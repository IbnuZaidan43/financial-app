// Simple user management untuk Phase 1
// Tidak perlu authentication complex, cukup userId management

export interface User {
  id: string;
  name?: string;
  email?: string;
  createdAt: string;
}

// Generate user ID yang unik
export function generateUserId(): string {
  return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Get current user dari localStorage
export function getCurrentUser(): User {
  if (typeof window === 'undefined') {
    // Server-side fallback
    return {
      id: 'default_user',
      createdAt: new Date().toISOString()
    };
  }

  const userId = localStorage.getItem('financeUserId');
  const userName = localStorage.getItem('financeUserName');
  const userEmail = localStorage.getItem('financeUserEmail');
  const createdAt = localStorage.getItem('financeUserCreatedAt');

  if (!userId) {
    // Create new user
    const newUserId = generateUserId();
    const now = new Date().toISOString();
    
    localStorage.setItem('financeUserId', newUserId);
    localStorage.setItem('financeUserCreatedAt', now);
    
    console.log('🆔 Created new user:', newUserId);
    
    return {
      id: newUserId,
      createdAt: now
    };
  }

  return {
    id: userId,
    name: userName || undefined,
    email: userEmail || undefined,
    createdAt: createdAt || new Date().toISOString()
  };
}

// Update user profile
export function updateUserProfile(data: { name?: string; email?: string }): void {
  if (typeof window === 'undefined') return;

  const currentUser = getCurrentUser();
  
  if (data.name !== undefined) {
    localStorage.setItem('financeUserName', data.name);
  }
  
  if (data.email !== undefined) {
    localStorage.setItem('financeUserEmail', data.email);
  }
  
  console.log('👤 Updated user profile:', { ...currentUser, ...data });
}

// Clear user data (untuk testing/reset)
export function clearUserData(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('financeUserId');
  localStorage.removeItem('financeUserName');
  localStorage.removeItem('financeUserEmail');
  localStorage.removeItem('financeUserCreatedAt');
  
  console.log('🗑️ Cleared user data');
}

// Check if user exists
export function userExists(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('financeUserId');
}

// Get user display name
export function getUserDisplayName(): string {
  const user = getCurrentUser();
  return user.name || `User ${user.id.substr(-6)}`;
}

// Export user data (untuk backup)
export function exportUserData(): User & { tabungan: any; transaksi: any } {
  const user = getCurrentUser();
  
  // Ambil data dari localStorage jika ada
  const tabungan = localStorage.getItem('financeTabungan') 
    ? JSON.parse(localStorage.getItem('financeTabungan')!) 
    : [];
    
  const transaksi = localStorage.getItem('financeTransaksi') 
    ? JSON.parse(localStorage.getItem('financeTransaksi')!) 
    : [];
  
  return {
    ...user,
    tabungan,
    transaksi
  };
}