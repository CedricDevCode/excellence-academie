const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api';

const authFetch = (url: string, options: RequestInit = {}) => {
  return fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
};

// Auth
export const getMe = async () => {
  const res = await authFetch(`${API_BASE_URL}/auth/me`);
  if (!res.ok) throw new Error('Not authenticated');
  return res.json();
};

export const logout = async () => {
  const res = await authFetch(`${API_BASE_URL}/auth/logout`, { method: 'POST' });
  return res.json();
};

// Stats
export const fetchStats = async () => {
  const res = await authFetch(`${API_BASE_URL}/stats`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
};

export const fetchCityBreakdown = async () => {
  const res = await authFetch(`${API_BASE_URL}/stats/city-breakdown`);
  if (!res.ok) throw new Error('Failed to fetch city breakdown');
  return res.json();
};

// Users
export const fetchUsers = async () => {
  const res = await authFetch(`${API_BASE_URL}/users`);
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
};

export const createUser = async (data: any) => {
  const res = await authFetch(`${API_BASE_URL}/users`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || 'Failed to create user');
  }
  return res.json();
};

export const updateMyProfile = async (data: any) => {
  const res = await authFetch(`${API_BASE_URL}/users/me`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || 'Failed to update profile');
  }
  return res.json();
};

export const updateUser = async (id: string, data: any) => {
  const res = await authFetch(`${API_BASE_URL}/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || 'Failed to update user');
  }
  return res.json();
};

export const deleteUser = async (id: string) => {
  const res = await authFetch(`${API_BASE_URL}/users/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || 'Failed to delete user');
  }
  return res.json();
};

// Payments
export const fetchPayments = async () => {
  const res = await authFetch(`${API_BASE_URL}/payments`);
  if (!res.ok) throw new Error('Failed to fetch payments');
  return res.json();
};

export const fetchMyPayments = async () => {
  const res = await authFetch(`${API_BASE_URL}/payments/my-payments`);
  if (!res.ok) throw new Error('Failed to fetch payments');
  return res.json();
};

export const initializePayment = async (data: { amount: number; userId: string; courseId: string }) => {
  const res = await authFetch(`${API_BASE_URL}/payments/initialize`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Payment initialization failed');
  return res.json();
};

export const verifyPayment = async (data: { paymentId: string; reference: string }) => {
  const res = await authFetch(`${API_BASE_URL}/payments/verify`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Payment verification failed');
  return res.json();
};

// Expenses
export const fetchExpenses = async () => {
  const res = await authFetch(`${API_BASE_URL}/expenses`);
  if (!res.ok) throw new Error('Failed to fetch expenses');
  return res.json();
};

export const createExpense = async (data: { amount: string; description: string; category?: string; ville?: string; teacherId?: string; paymentMethod: string }) => {
  const res = await authFetch(`${API_BASE_URL}/expenses`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create expense');
  return res.json();
};

export const updateExpense = async (id: string, data: { amount?: string; description?: string; category?: string; ville?: string; paymentMethod?: string; status?: string; teacherId?: string }) => {
  const res = await authFetch(`${API_BASE_URL}/expenses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update expense');
  return res.json();
};

export const deleteExpense = async (id: string) => {
  const res = await authFetch(`${API_BASE_URL}/expenses/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete expense');
  return res.json();
};

export const fetchExpenseSummary = async () => {
  const res = await authFetch(`${API_BASE_URL}/expenses/summary`);
  if (!res.ok) throw new Error('Failed to fetch expense summary');
  return res.json();
};

// Receipts
export const fetchReceipts = async () => {
  const res = await authFetch(`${API_BASE_URL}/receipts`);
  if (!res.ok) throw new Error('Failed to fetch receipts');
  return res.json();
};

export const generateReceipt = async (paymentId: string) => {
  const res = await authFetch(`${API_BASE_URL}/receipts/${paymentId}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to generate receipt');
  return res.json();
};

// Notifications
export const fetchNotifications = async () => {
  const res = await authFetch(`${API_BASE_URL}/notifications`);
  if (!res.ok) throw new Error('Failed to fetch notifications');
  return res.json();
};

export const markNotificationRead = async (id: string) => {
  const res = await authFetch(`${API_BASE_URL}/notifications/${id}/read`, {
    method: 'PUT',
  });
  if (!res.ok) throw new Error('Failed to mark notification as read');
  return res.json();
};

// Testimonials
export const fetchTestimonials = async () => {
  const res = await fetch(`${API_BASE_URL}/testimonials`);
  if (!res.ok) throw new Error('Failed to fetch testimonials');
  return res.json();
};

export const createTestimonial = async (data: { name: string; course: string; message: string; rating: number; images?: string[] }) => {
  const res = await fetch(`${API_BASE_URL}/testimonials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || 'Failed to create testimonial');
  }
  return res.json();
};

export const uploadTestimonialImages = async (files: File[]): Promise<string[]> => {
  const formData = new FormData();
  files.forEach(f => formData.append('images', f));
  const res = await fetch(`${API_BASE_URL}/testimonials/upload`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || 'Failed to upload images');
  }
  const data = await res.json();
  return data.urls;
};

export const fetchAllTestimonials = async () => {
  const res = await authFetch(`${API_BASE_URL}/testimonials/admin/all`);
  if (!res.ok) throw new Error('Failed to fetch all testimonials');
  return res.json();
};

export const updateTestimonial = async (id: string, data: { isActive: boolean }) => {
  const res = await authFetch(`${API_BASE_URL}/testimonials/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update testimonial');
  return res.json();
};

export const deleteTestimonial = async (id: string) => {
  const res = await authFetch(`${API_BASE_URL}/testimonials/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete testimonial');
  return res.json();
};

export const fetchProductById = async (id: string) => {
  const res = await fetch(`${API_BASE_URL}/shop/products/${id}`);
  if (!res.ok) throw new Error('Failed to fetch product');
  return res.json();
};

// Shop Products
export const fetchAdminProducts = async () => {
  const res = await authFetch(`${API_BASE_URL}/shop/admin/products`);
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
};

export const createProduct = async (data: any) => {
  const res = await authFetch(`${API_BASE_URL}/shop/admin/products`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create product');
  return res.json();
};

export const updateProduct = async (id: string, data: any) => {
  const res = await authFetch(`${API_BASE_URL}/shop/admin/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update product');
  return res.json();
};

export const deleteProduct = async (id: string) => {
  const res = await authFetch(`${API_BASE_URL}/shop/admin/products/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete product');
  return res.json();
};

export const uploadProductImage = async (file: File) => {
  const formData = new FormData();
  formData.append('image', file);
  const res = await fetch(`${API_BASE_URL}/shop/admin/products/upload`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to upload image');
  return res.json();
};

// Shop Orders
export const fetchShopOrders = async () => {
  const res = await authFetch(`${API_BASE_URL}/shop/admin/orders`);
  if (!res.ok) throw new Error('Failed to fetch shop orders');
  return res.json();
};

export const updateShopOrderStatus = async (id: string, status: string) => {
  const res = await authFetch(`${API_BASE_URL}/shop/admin/orders/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Failed to update order status');
  return res.json();
};

// Courses
export const fetchCourses = async () => {
  const res = await fetch(`${API_BASE_URL}/courses`);
  if (!res.ok) throw new Error('Failed to fetch courses');
  return res.json();
};

export const fetchPublicBanners = async () => {
  const res = await fetch(`${API_BASE_URL}/banners/public`);
  if (!res.ok) throw new Error('Failed to fetch banners');
  return res.json();
};

export const createCourse = async (data: { title: string; description?: string; price: number }) => {
  const res = await authFetch(`${API_BASE_URL}/courses`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create course');
  return res.json();
};

export const updateCourse = async (id: string, data: { title?: string; description?: string; price?: number }) => {
  const res = await authFetch(`${API_BASE_URL}/courses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update course');
  return res.json();
};

export const deleteCourse = async (id: string) => {
  const res = await authFetch(`${API_BASE_URL}/courses/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete course');
  return res.json();
};

// Bulk Notifications
export const sendBulkNotification = async (data: { userIds: string[]; title: string; message: string }) => {
  const res = await authFetch(`${API_BASE_URL}/notifications/bulk`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to send bulk notifications');
  return res.json();
};

// Admin Registration (no payment required)
export const registerStudent = async (data: any) => {
  const res = await authFetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || 'Erreur lors de l\'inscription');
  }
  return res.json();
};

// Register + Pay: user is created ONLY after payment success
export const registerAndPay = async (data: {
  email: string; password: string; name?: string; prenom?: string; nom?: string;
  telephone?: string; pays?: string; ville?: string;
  courseIds: string[]; mode?: string; coursParticuliers?: boolean;
  paymentMethod?: string; geniusPhone?: string; dateNaissance?: string;
}) => {
  const res = await fetch(`${API_BASE_URL}/auth/register-and-pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || 'Erreur lors de l\'initialisation du paiement');
  }
  return res.json();
};

// Confirm payment: creates user + logs in on success
export const confirmPayment = async (reference: string) => {
  const res = await fetch(`${API_BASE_URL}/auth/confirm-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reference }),
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || 'Erreur de confirmation du paiement');
  }
  return res.json();
};

// GeniusPay
export const initGeniusPayPayment = async (data: { userId: string; courseId: string; formule: string }) => {
  const origin = window.location.origin;
  const res = await authFetch(`${API_BASE_URL}/payments/geniuspay/init`, {
    method: 'POST',
    body: JSON.stringify({
      ...data,
      successUrl: `${origin}/payment/success`,
      errorUrl: `${origin}/payment/error`,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || 'Échec de l\'initialisation du paiement');
  }
  return res.json();
};

export const checkGeniusPayStatus = async (reference: string) => {
  const res = await fetch(`${API_BASE_URL}/payments/geniuspay/status/${reference}`);
  if (!res.ok) throw new Error('Échec de la vérification du paiement');
  return res.json();
};

// Subscriptions
export const fetchMySubscriptions = async () => {
  const res = await authFetch(`${API_BASE_URL}/subscriptions/my-subscriptions`);
  if (!res.ok) throw new Error('Failed to fetch subscriptions');
  return res.json();
};

export const fetchOverdueItems = async () => {
  const res = await authFetch(`${API_BASE_URL}/subscriptions/overdue`);
  if (!res.ok) throw new Error('Failed to fetch overdue items');
  return res.json();
};

export const paySubscription = async (data: { subscriptionId: string; months?: number; paymentMethod?: string }) => {
  const res = await authFetch(`${API_BASE_URL}/subscriptions/pay`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || 'Erreur de paiement');
  }
  return res.json();
};

// Calendar Events
export const fetchEvents = async (params?: { courseId?: string; teacherId?: string; type?: string }) => {
  const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
  const res = await authFetch(`${API_BASE_URL}/calendar${query}`);
  if (!res.ok) throw new Error('Failed to fetch events');
  return res.json();
};

export const createEvent = async (data: any) => {
  const res = await authFetch(`${API_BASE_URL}/calendar`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create event');
  return res.json();
};

export const deleteEvent = async (id: string) => {
  const res = await authFetch(`${API_BASE_URL}/calendar/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete event');
  return res.json();
};

// Evaluations
export const fetchEvaluations = async (params?: { studentId?: string; courseId?: string; teacherId?: string }) => {
  const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
  const res = await authFetch(`${API_BASE_URL}/evaluations${query}`);
  if (!res.ok) throw new Error('Failed to fetch evaluations');
  return res.json();
};

export const createEvaluation = async (data: { title: string; score?: number; maxScore?: number; comments?: string; studentId: string; courseId?: string }) => {
  const res = await authFetch(`${API_BASE_URL}/evaluations`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create evaluation');
  return res.json();
};

export const updateEvaluation = async (id: string, data: { title?: string; score?: number; maxScore?: number; comments?: string }) => {
  const res = await authFetch(`${API_BASE_URL}/evaluations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update evaluation');
  return res.json();
};

// Cities
export const fetchCities = async () => {
  const res = await authFetch(`${API_BASE_URL}/cities`);
  if (!res.ok) throw new Error('Failed to fetch cities');
  return res.json();
};

export const createCity = async (data: { name: string; country?: string }) => {
  const res = await authFetch(`${API_BASE_URL}/cities`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || 'Failed to create city');
  }
  return res.json();
};

export const updateCity = async (id: string, data: { name?: string; country?: string; isActive?: boolean }) => {
  const res = await authFetch(`${API_BASE_URL}/cities/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update city');
  return res.json();
};

export const deleteCity = async (id: string) => {
  const res = await authFetch(`${API_BASE_URL}/cities/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete city');
  return res.json();
};

// ─── Course Sessions ────────────────────────────────────────────
export const fetchSessions = async (params?: {
  teacherId?: string; courseId?: string; startDate?: string; endDate?: string;
  status?: string; groupByWeek?: string;
}) => {
  const query = params ? '?' + new URLSearchParams(Object.entries(params).filter(([_, v]) => v)).toString() : '';
  const res = await authFetch(`${API_BASE_URL}/sessions${query}`);
  if (!res.ok) throw new Error('Failed to fetch sessions');
  return res.json();
};

export const createSession = async (data: {
  teacherId: string; courseId?: string; date: string;
  startTime: string; endTime: string;
  type?: string; location?: string; description?: string; notifyStudents?: boolean;
}) => {
  const res = await authFetch(`${API_BASE_URL}/sessions`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || 'Failed to create session');
  }
  return res.json();
};

export const updateSession = async (id: string, data: any) => {
  const res = await authFetch(`${API_BASE_URL}/sessions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update session');
  return res.json();
};

export const deleteSession = async (id: string) => {
  const res = await authFetch(`${API_BASE_URL}/sessions/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete session');
  return res.json();
};

export const fetchStudentSessions = async (params?: { startDate?: string; endDate?: string }) => {
  const query = params ? '?' + new URLSearchParams(Object.entries(params).filter(([_, v]) => v)).toString() : '';
  const res = await authFetch(`${API_BASE_URL}/sessions/my-sessions${query}`);
  if (!res.ok) throw new Error('Failed to fetch student sessions');
  return res.json();
};

export const fetchMonthlySalaryReport = async (month?: number, year?: number) => {
  const params = new URLSearchParams();
  if (month !== undefined) params.set('month', String(month));
  if (year !== undefined) params.set('year', String(year));
  const res = await authFetch(`${API_BASE_URL}/sessions/salary-report?${params}`);
  if (!res.ok) throw new Error('Failed to fetch salary report');
  return res.json();
};

export const payTeacherSalary = async (data: {
  teacherId: string; amount: number; month: number; year: number;
  description?: string; paymentMethod?: string; bonus?: number; geniusPhone?: string;
}) => {
  const res = await authFetch(`${API_BASE_URL}/sessions/pay-salary`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || 'Failed to pay salary');
  }
  return res.json();
};

export const fetchPaidSalaries = async (month?: number, year?: number) => {
  const params = new URLSearchParams();
  params.set('category', 'SALAIRE');
  if (month !== undefined) {
    const start = new Date(year || new Date().getFullYear(), month, 1);
    params.set('startDate', start.toISOString());
    const end = new Date(year || new Date().getFullYear(), month + 1, 0);
    params.set('endDate', end.toISOString());
  }
  const res = await authFetch(`${API_BASE_URL}/expenses?${params}`);
  if (!res.ok) throw new Error('Failed to fetch paid salaries');
  return res.json();
};

export const completeSession = async (id: string) => {
  const res = await authFetch(`${API_BASE_URL}/sessions/${id}/complete`, {
    method: 'PUT',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || 'Failed to complete session');
  }
  return res.json();
};

export const validateSession = async (id: string) => {
  const res = await authFetch(`${API_BASE_URL}/sessions/${id}/validate`, {
    method: 'PUT',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || 'Failed to validate session');
  }
  return res.json();
};

export const uploadSessionFile = async (sessionId: string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE_URL}/sessions/${sessionId}/files`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || 'Failed to upload file');
  }
  return res.json();
};

export const getSessionFiles = async (sessionId: string) => {
  const res = await authFetch(`${API_BASE_URL}/sessions/${sessionId}/files`);
  if (!res.ok) throw new Error('Failed to fetch session files');
  return res.json();
};

export const getDownloadUrl = (fileId: string) => {
  return `${API_BASE_URL}/sessions/files/${fileId}/download`;
};

// ─── Contracts ────────────────────────────────────────────
export const signContract = async (data: { signatureData: string; paymentId?: string }) => {
  const res = await authFetch(`${API_BASE_URL}/contracts/sign`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || 'Erreur lors de la signature du contrat');
  }
  return res.json();
};

export const fetchMyContract = async () => {
  const res = await authFetch(`${API_BASE_URL}/contracts/my-contract`);
  if (!res.ok) throw new Error('Failed to fetch contract');
  return res.json();
};

export const fetchAllContracts = async () => {
  const res = await authFetch(`${API_BASE_URL}/contracts`);
  if (!res.ok) throw new Error('Failed to fetch contracts');
  return res.json();
};

export const fetchContractByUserId = async (userId: string) => {
  const res = await authFetch(`${API_BASE_URL}/contracts/${userId}`);
  if (!res.ok) throw new Error('Failed to fetch contract');
  return res.json();
};

export const getSignedContractPdfUrl = (contractId: string) => {
  return `${API_BASE_URL}/contracts/${contractId}/signed-pdf`;
};

// ─── Blog ──────────────────────────────────────────────────────────
export const fetchBlogPosts = async (params?: { page?: number; limit?: number; courseId?: string; authorId?: string; tag?: string }) => {
  const query = params ? '?' + new URLSearchParams(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)])).toString() : '';
  const res = await fetch(`${API_BASE_URL}/blog${query}`);
  if (!res.ok) throw new Error('Failed to fetch blog posts');
  return res.json();
};

export const fetchBlogPostBySlug = async (slug: string) => {
  const res = await fetch(`${API_BASE_URL}/blog/${encodeURIComponent(slug)}`);
  if (!res.ok) throw new Error('Failed to fetch blog post');
  return res.json();
};

export const createBlogPost = async (data: any) => {
  const res = await authFetch(`${API_BASE_URL}/blog`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) { const body = await res.json().catch(() => null); throw new Error(body?.message || 'Failed to create post'); }
  return res.json();
};

export const updateBlogPost = async (id: string, data: any) => {
  const res = await authFetch(`${API_BASE_URL}/blog/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res.ok) { const body = await res.json().catch(() => null); throw new Error(body?.message || 'Failed to update post'); }
  return res.json();
};

export const deleteBlogPost = async (id: string) => {
  const res = await authFetch(`${API_BASE_URL}/blog/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete post');
  return res.json();
};

export const uploadBlogAttachment = async (postId: string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE_URL}/blog/${postId}/attachments`, {
    method: 'POST', credentials: 'include', body: formData,
  });
  if (!res.ok) throw new Error('Failed to upload');
  return res.json();
};

// Comments
export const fetchComments = async (postId: string) => {
  const res = await fetch(`${API_BASE_URL}/blog/${postId}/comments`);
  if (!res.ok) throw new Error('Failed to fetch comments');
  return res.json();
};

export const createComment = async (postId: string, content: string) => {
  const res = await authFetch(`${API_BASE_URL}/blog/${postId}/comments`, {
    method: 'POST', body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error('Failed to create comment');
  return res.json();
};

export const deleteComment = async (id: string) => {
  const res = await authFetch(`${API_BASE_URL}/blog/comments/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete comment');
  return res.json();
};

// Exercises
export const createExercise = async (postId: string, data: { title: string; description?: string }) => {
  const res = await authFetch(`${API_BASE_URL}/blog/${postId}/exercises`, {
    method: 'POST', body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create exercise');
  return res.json();
};

export const updateExercise = async (id: string, data: { title?: string; description?: string }) => {
  const res = await authFetch(`${API_BASE_URL}/blog/exercises/${id}`, {
    method: 'PUT', body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update exercise');
  return res.json();
};

export const deleteExercise = async (id: string) => {
  const res = await authFetch(`${API_BASE_URL}/blog/exercises/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete exercise');
  return res.json();
};

export const uploadExerciseAttachment = async (id: string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE_URL}/blog/exercises/${id}/attachments`, {
    method: 'POST', credentials: 'include', body: formData,
  });
  if (!res.ok) throw new Error('Failed to upload');
  return res.json();
};

// Submissions
export const submitExercise = async (exerciseId: string, data: { content?: string; file?: File }) => {
  const formData = new FormData();
  if (data.content) formData.append('content', data.content);
  if (data.file) formData.append('file', data.file);
  const res = await fetch(`${API_BASE_URL}/blog/exercises/${exerciseId}/submit`, {
    method: 'POST', credentials: 'include', body: formData,
  });
  if (!res.ok) { const body = await res.json().catch(() => null); throw new Error(body?.message || 'Failed to submit'); }
  return res.json();
};

export const fetchSubmissions = async (exerciseId: string) => {
  const res = await authFetch(`${API_BASE_URL}/blog/exercises/${exerciseId}/submissions`);
  if (!res.ok) throw new Error('Failed to fetch submissions');
  return res.json();
};

export const evaluateSubmission = async (id: string, data: { grade?: number; feedback?: string }) => {
  const res = await authFetch(`${API_BASE_URL}/blog/submissions/${id}/evaluate`, {
    method: 'PUT', body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to evaluate');
  return res.json();
};

const api = {
  get: async (path: string) => {
    const res = await authFetch(`${API_BASE_URL}${path}`);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error || 'Request failed');
    }
    return { data: await res.json() };
  },
  post: async (path: string, body?: any) => {
    const res = await authFetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error || 'Request failed');
    }
    return { data: await res.json() };
  },
  put: async (path: string, body?: any) => {
    const res = await authFetch(`${API_BASE_URL}${path}`, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error || 'Request failed');
    }
    return { data: await res.json() };
  },
  delete: async (path: string) => {
    const res = await authFetch(`${API_BASE_URL}${path}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error || 'Request failed');
    }
    return { data: await res.json() };
  }
};

export default api;
