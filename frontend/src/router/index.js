import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Helper: stub component for views not yet implemented
const stub = (title) => ({
  template: `<div style="padding:24px"><h1 style="font-size:18px;font-weight:500;margin-bottom:8px">${title}</h1><p style="color:#718096">Em desenvolvimento.</p></div>`
})

const routes = [
  // ── Auth
  { path: '/login',          component: () => import('@/views/auth/LoginView.vue'),    meta: { guest: true } },
  { path: '/register',       component: () => import('@/views/auth/RegisterView.vue'), meta: { guest: true } },
  { path: '/forgot-password', component: () => import('@/views/auth/ForgotPasswordView.vue'), meta: { guest: true } },
  { path: '/verify-email/:token', component: () => import('@/views/auth/VerifyEmailView.vue') },

  // ── Super Admin
  {
    path: '/super',
    component: () => import('@/components/layout/SuperAdminLayout.vue'),
    meta: { roles: ['super_admin'] },
    children: [
      { path: '',              redirect: '/super/dashboard' },
      { path: 'dashboard',    component: () => import('@/views/super/DashboardView.vue') },
      { path: 'institutions', component: () => import('@/views/super/InstitutionsView.vue') },
      { path: 'institutions/:id', component: () => import('@/views/super/InstitutionDetailView.vue') },
      { path: 'products',     component: () => import('@/views/super/ProductApprovalsView.vue') },
      { path: 'users',        component: () => import('@/views/super/UsersView.vue') },
      { path: 'clients',      component: () => import('@/views/institution/ClientsView.vue') },
      { path: 'clients/:id',  component: () => import('@/views/institution/ClientDetailView.vue') },
      { path: 'register-client',   component: () => import('@/views/common/RegisterClientView.vue') },
      { path: 'edit-client/:id',   component: () => import('@/views/common/RegisterClientView.vue') },
      { path: 'roles',        component: () => import('@/views/super/RolesView.vue') },
      { path: 'branding',    component: () => import('@/views/institution/BrandingView.vue') },
      { path: 'smtp-test',   component: () => import('@/views/auth/SmtpTestView.vue') },
      { path: 'whatsapp',    component: () => import('@/views/super/WhatsappConfigView.vue') },
      { path: 'profile',     component: () => import('@/views/common/ProfileView.vue') },
      { path: 'compare',      component: () => import('@/views/client/CompareView.vue') },
      { path: 'applications', component: () => import('@/views/institution/ApplicationsView.vue') },
      { path: 'applications/:id', component: () => import('@/views/institution/ApplicationDetailView.vue') },
      { path: 'loans',        component: () => import('@/views/super/LoansView.vue') },
      { path: 'payments',     component: () => import('@/views/super/PaymentsView.vue') },
      { path: 'notifications',component: () => import('@/views/super/NotificationsView.vue') },
      { path: 'audit',        component: () => import('@/views/super/AuditView.vue') },
      { path: 'reports',      component: () => import('@/views/super/ReportsView.vue') },
    ],
  },

  // ── Institution Admin
  {
    path: '/institution',
    component: () => import('@/components/layout/InstitutionLayout.vue'),
    meta: { roles: ['inst_admin', 'inst_agent'] },
    children: [
      { path: '',               redirect: '/institution/dashboard' },
      { path: 'dashboard',      component: () => import('@/views/institution/DashboardView.vue') },
      { path: 'clients',        component: () => import('@/views/institution/ClientsView.vue') },
      { path: 'clients/:id',    component: () => import('@/views/institution/ClientDetailView.vue') },
      { path: 'register-client',   component: () => import('@/views/common/RegisterClientView.vue') },
      { path: 'edit-client/:id',   component: () => import('@/views/common/RegisterClientView.vue') },
      { path: 'applications',   component: () => import('@/views/institution/ApplicationsView.vue') },
      { path: 'applications/:id', component: () => import('@/views/institution/ApplicationDetailView.vue') },
      { path: 'loans',          component: () => import('@/views/institution/LoansView.vue') },
      { path: 'payments',       component: () => import('@/views/institution/PaymentsView.vue') },
      { path: 'products',       component: () => import('@/views/institution/ProductsView.vue') },
      { path: 'settings',       component: () => import('@/views/institution/BrandingView.vue') },
      { path: 'simulator',      component: () => import('@/views/institution/SimulatorView.vue') },
      { path: 'compare',        component: () => import('@/views/client/CompareView.vue') },
      { path: 'notifications',  component: () => import('@/views/institution/NotificationsView.vue') },
      { path: 'reports',        component: () => import('@/views/institution/ReportsView.vue') },
      { path: 'profile',        component: () => import('@/views/common/ProfileView.vue') },
    ],
  },


  // ── Agent de Crédito
  {
    path: '/agent',
    component: () => import('@/components/layout/AgentLayout.vue'),
    meta: { roles: ['inst_agent'] },
    children: [
      { path: '',                  redirect: '/agent/dashboard' },
      { path: 'dashboard',         component: () => import('@/views/agent/DashboardView.vue') },
      { path: 'clients',           component: () => import('@/views/agent/ClientsView.vue') },
      { path: 'register-client',   component: () => import('@/views/institution/ClientsView.vue') },
      { path: 'applications',      component: () => import('@/views/agent/ApplicationsView.vue') },
      { path: 'apply',             component: () => import('@/views/institution/ApplicationsView.vue') },
      { path: 'simulator',         component: () => import('@/views/institution/SimulatorView.vue') },
      { path: 'profile',           component: () => import('@/views/common/ProfileView.vue') },
    ],
  },

  // ── Client
  {
    path: '/client',
    component: () => import('@/components/layout/ClientLayout.vue'),
    meta: { roles: ['client'] },
    children: [
      { path: '',          redirect: '/client/home' },
      { path: 'home',      component: () => import('@/views/client/HomeView.vue') },
      { path: 'compare',   component: () => import('@/views/client/CompareView.vue') },
      { path: 'apply',     component: () => import('@/views/client/ApplyView.vue') },
      { path: 'my-loans',  component: () => import('@/views/client/MyLoansView.vue') },
      { path: 'payments',  component: () => import('@/views/client/PaymentsView.vue') },
      { path: 'profile',   component: () => import('@/views/client/ProfileView.vue') },
      { path: 'documents', component: () => import('@/views/client/DocumentsView.vue') },
      { path: 'notifications', component: () => import('@/views/client/NotificationsView.vue') },
    ],
  },

  { path: '/',              redirect: '/login' },
  { path: '/:pathMatch(.*)*', redirect: '/login' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (!auth.isInitialised) await auth.init()
  if (to.meta.guest && auth.isLoggedIn) return auth.defaultRoute
  if (to.meta.roles && !auth.isLoggedIn) return { path: '/login', query: { redirect: to.fullPath } }
  if (to.meta.roles && !to.meta.roles.includes(auth.user?.role)) return auth.defaultRoute
})

export default router
