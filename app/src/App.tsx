import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';

// Core pages (loaded immediately)
import Landing from './pages/Landing';
import SiteGatePage from './pages/SiteGatePage';
import SiteProtectedRoute from './components/SiteProtectedRoute';

// =============================================================================
// LAZY-LOADED PAGES (Code Splitting)
// These load on-demand when the route is visited, reducing initial bundle
// =============================================================================

const InvestorOnePager = lazy(() => import('./pages/investor/InvestorOnePager'));

// Investor Deck Pages
const BrandPack = lazy(() => import('./pages/BrandPack'));
const InvestorPack = lazy(() => import('./pages/InvestorPack'));
const InvestorPackDelta = lazy(() => import('./pages/InvestorPackDelta'));
const ValuationRationale = lazy(() => import('./pages/investor/ValuationRationale'));
const InvestorQuestions = lazy(() => import('./pages/investor/InvestorQuestions'));
const MarketSizing = lazy(() => import('./pages/investor/MarketSizing'));
const WhyNow = lazy(() => import('./pages/investor/WhyNow'));
const UseOfFunds = lazy(() => import('./pages/investor/UseOfFunds'));
const TechnicalDefensibility = lazy(() => import('./pages/investor/TechnicalDefensibility'));
const KillCriteria = lazy(() => import('./pages/investor/KillCriteria'));
const FounderInvestorFit = lazy(() => import('./pages/investor/FounderInvestorFit'));
const CustomerProof = lazy(() => import('./pages/investor/CustomerProof'));
const CustomerAccessTargeting = lazy(() => import('./pages/investor/CustomerAccessTargeting'));
const CompetitiveLandscape = lazy(() => import('./pages/investor/CompetitiveLandscape'));

const TechnicalAppendixSystemLogic = lazy(() => import('./pages/investor/TechnicalAppendixSystemLogic'));
const OperationalScenarios = lazy(() => import('./pages/investor/OperationalScenarios'));
const UberPack = lazy(() => import('./pages/UberPack'));
const UberClosePlan = lazy(() => import('./pages/UberClosePlan'));
const UberEconomics = lazy(() => import('./pages/UberEconomics'));
const DeckDashboard = lazy(() => import('./pages/DeckDashboard'));
const GTMPackDelta = lazy(() => import('./pages/GTMPackDelta'));
const RevenueModelPack = lazy(() => import('./pages/RevenueModelPack'));
const ComponentsPage = lazy(() => import('./pages/ComponentsPage'));

// Print Pages
const InvestorOnePagerA4 = lazy(() => import('./pages/print/InvestorOnePagerA4.tsx'));
const CoverPageA4 = lazy(() => import('./pages/print/CoverPageA4.tsx'));


// Deck Page Wrapper for tracking read status
import DeckPageWrapper from './components/deckhub/DeckPageWrapper';

// Admin Pages (Internal)
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const DashboardHome = lazy(() => import('./pages/admin/DashboardHome'));
const LeadsPage = lazy(() => import('./pages/admin/LeadsPage'));
const PersonnelPage = lazy(() => import('./pages/admin/PersonnelPage'));
const TasksPage = lazy(() => import('./pages/admin/TasksPage'));
const SettingsPage = lazy(() => import('./pages/admin/SettingsPage'));
const ProvisionPage = lazy(() => import('./pages/admin/ProvisionPage'));
const NotificationsAdminPage = lazy(() => import('./pages/admin/NotificationsPage'));
const MeetingsPage = lazy(() => import('./pages/admin/MeetingsPage'));
import ProtectedRoute from './components/admin/ProtectedRoute';
import AdminLayout from './components/admin/AdminLayout';

// Portal Pages (Main Product)
import { ThemeProvider } from './components/portal/ThemeProvider';
import { AuthProvider } from './components/portal/AuthProvider';
import PortalLayout from './components/portal/PortalLayout';
import PortalProtectedRoute from './components/portal/PortalProtectedRoute';
const PortalDashboard = lazy(() => import('./pages/portal/Dashboard'));
const PortalAlerts = lazy(() => import('./pages/portal/Alerts'));
const PortalEmployees = lazy(() => import('./pages/portal/Employees'));
const PortalEmployeeDetail = lazy(() => import('./pages/portal/EmployeeDetail'));
const PortalIncidents = lazy(() => import('./pages/portal/Incidents'));
const PortalIncidentDetail = lazy(() => import('./pages/portal/IncidentDetail'));
const PortalCases = lazy(() => import('./pages/portal/Cases'));
const PortalReports = lazy(() => import('./pages/portal/Reports'));
const PortalDatabaseSearch = lazy(() => import('./pages/portal/DatabaseSearch'));
const PortalMugshotSearch = lazy(() => import('./pages/portal/MugshotSearch'));
const PortalRiskAssessment = lazy(() => import('./pages/portal/RiskAssessment'));
const PortalRiskFactorDetail = lazy(() => import('./pages/portal/RiskFactorDetail'));
const PortalAudit = lazy(() => import('./pages/portal/Audit'));
const PortalIntegrations = lazy(() => import('./pages/portal/Integrations'));
const PortalBilling = lazy(() => import('./pages/portal/Billing'));
const PortalSettings = lazy(() => import('./pages/portal/Settings'));
const PortalAdmin = lazy(() => import('./pages/portal/Admin'));

// Portal - Data Dashboard Pages (Phase 9/10)
const PortalAnalytics = lazy(() => import('./pages/portal/Analytics'));
const PortalRecordSearch = lazy(() => import('./pages/portal/RecordSearch'));
const PortalPipelineHealth = lazy(() => import('./pages/portal/PipelineHealth'));
const PortalCountyDetail = lazy(() => import('./pages/portal/CountyDetail'));

// Auth
const AuthLogin = lazy(() => import('./pages/auth/Login'));
const AuthCallback = lazy(() => import('./pages/auth/Callback'));

// Public
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const NotFound = lazy(() => import('./pages/NotFound'));

// =============================================================================
// LOADING FALLBACK
// =============================================================================

const PageLoader = () => (
  <div style={{
    minHeight: '100vh',
    background: '#0a0a0a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#e40028',
    fontFamily: "'Roboto Mono', monospace",
    fontSize: '0.9rem',
    letterSpacing: '0.1em'
  }}>
    LOADING...
  </div>
);

// =============================================================================
// APP COMPONENT
// =============================================================================

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Site Gate Route (must be OUTSIDE SiteProtectedRoute) */}
            <Route path="/gate" element={<SiteGatePage />} />

            {/* Protected Marketing Routes */}
            <Route element={<SiteProtectedRoute><Layout /></SiteProtectedRoute>}>
              <Route path="/" element={<InvestorOnePager />} />
              <Route path="/landing" element={<Landing />} />
              <Route path="/one-pager" element={<Navigate to="/" replace />} />
              <Route path="/investor-delta/one-pager" element={<DeckPageWrapper deckId="investor-one-pager"><InvestorOnePager /></DeckPageWrapper>} />
              <Route path="/brand" element={<BrandPack />} />
              <Route path="/investor" element={<InvestorPack />} />
              <Route path="/investor-delta" element={<DeckPageWrapper deckId="investor-deck"><InvestorPackDelta /></DeckPageWrapper>} />
              <Route path="/investor-delta/appendix/valuation" element={<DeckPageWrapper deckId="valuation"><ValuationRationale /></DeckPageWrapper>} />
              <Route path="/investor-delta/why" element={<DeckPageWrapper deckId="why-problem"><InvestorQuestions /></DeckPageWrapper>} />
              <Route path="/investor-delta/appendix/market-sizing" element={<DeckPageWrapper deckId="market-sizing"><MarketSizing /></DeckPageWrapper>} />
              <Route path="/investor-delta/appendix/why-now" element={<DeckPageWrapper deckId="why-now"><WhyNow /></DeckPageWrapper>} />
              <Route path="/investor-delta/appendix/use-of-funds" element={<DeckPageWrapper deckId="use-of-funds"><UseOfFunds /></DeckPageWrapper>} />
              <Route path="/investor-delta/appendix/technical-defensibility" element={<DeckPageWrapper deckId="technical-defensibility"><TechnicalDefensibility /></DeckPageWrapper>} />
              <Route path="/investor-delta/appendix/kill-criteria" element={<DeckPageWrapper deckId="kill-criteria"><KillCriteria /></DeckPageWrapper>} />
              <Route path="/investor-delta/appendix/founder-investor-fit" element={<DeckPageWrapper deckId="founder-investor-fit"><FounderInvestorFit /></DeckPageWrapper>} />
              <Route path="/investor-delta/appendix/customer-proof" element={<DeckPageWrapper deckId="customer-proof"><CustomerProof /></DeckPageWrapper>} />
              <Route path="/investor-delta/appendix/customer-access" element={<CustomerAccessTargeting />} />
              <Route path="/investor-delta/appendix/competitive-landscape" element={<DeckPageWrapper deckId="competitive-landscape"><CompetitiveLandscape /></DeckPageWrapper>} />

              <Route path="/investor-delta/appendix/technical-appendix-system-logic" element={<DeckPageWrapper deckId="technical-appendix-system-logic"><TechnicalAppendixSystemLogic /></DeckPageWrapper>} />
              <Route path="/investor-delta/operational-scenarios" element={<DeckPageWrapper deckId="operational-scenarios"><OperationalScenarios /></DeckPageWrapper>} />
              <Route path="/uber" element={<DeckPageWrapper deckId="uber-overview"><UberPack /></DeckPageWrapper>} />
              <Route path="/uber-close" element={<DeckPageWrapper deckId="uber-close"><UberClosePlan /></DeckPageWrapper>} />
              <Route path="/uber-economics" element={<DeckPageWrapper deckId="uber-economics"><UberEconomics /></DeckPageWrapper>} />
              <Route path="/decks" element={<DeckDashboard />} />
              <Route path="/gtm" element={<DeckPageWrapper deckId="gtm-plan"><GTMPackDelta /></DeckPageWrapper>} />
              <Route path="/revenue-model" element={<DeckPageWrapper deckId="revenue-model"><RevenueModelPack /></DeckPageWrapper>} />
              <Route path="/components" element={<ComponentsPage />} />
            </Route>

            {/* Public Pages (no Layout wrapper) */}
            <Route path="/print/investor-one-pager-a4" element={<InvestorOnePagerA4 />} />
            <Route path="/print/cover" element={<CoverPageA4 />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />

            {/* Auth Routes */}
            <Route path="/auth/login" element={<AuthLogin />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* Portal Routes (Main Product) - Wrapped with providers */}
            <Route
              path="/portal"
              element={
                <ThemeProvider>
                  <AuthProvider>
                    <PortalProtectedRoute>
                      <PortalLayout />
                    </PortalProtectedRoute>
                  </AuthProvider>
                </ThemeProvider>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<PortalDashboard />} />

              {/* Core */}
              <Route path="employees" element={<PortalEmployees />} />
              <Route path="employees/:id" element={<PortalEmployeeDetail />} />
              <Route path="incidents" element={<PortalIncidents />} />
              <Route path="incidents/:id" element={<PortalIncidentDetail />} />
              <Route path="alerts" element={<PortalAlerts />} />
              <Route path="cases" element={<PortalCases />} />

              {/* Investigation */}
              <Route path="database-search" element={<PortalDatabaseSearch />} />
              <Route path="mugshot-search" element={<PortalMugshotSearch />} />

              {/* Risk & Compliance */}
              <Route path="risk-assessment" element={<PortalRiskAssessment />} />
              <Route path="risk-factors/:factor" element={<PortalRiskFactorDetail />} />
              <Route path="audit" element={<PortalAudit />} />

              {/* Reporting */}
              <Route path="reports" element={<PortalReports />} />

              {/* Data Dashboard (Phase 9/10) */}
              <Route path="analytics" element={<PortalAnalytics />} />
              <Route path="search" element={<PortalRecordSearch />} />
              <Route path="pipeline" element={<PortalPipelineHealth />} />
              <Route path="counties/:slug" element={<PortalCountyDetail />} />

              {/* System */}
              <Route path="integrations" element={<PortalIntegrations />} />
              <Route path="billing" element={<PortalBilling />} />
              <Route path="settings" element={<PortalSettings />} />

              {/* Admin section - Protected by role check */}
              <Route path="admin" element={<PortalProtectedRoute requiredRole="admin"><PortalAdmin /></PortalProtectedRoute>} />
            </Route>

            {/* Internal Admin Routes (Project Management) */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <Outlet />
                  </AdminLayout>
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<DashboardHome />} />
              <Route path="notifications" element={<NotificationsAdminPage />} />
              <Route path="meetings" element={<MeetingsPage />} />
              <Route path="leads" element={<LeadsPage />} />
              <Route path="provision" element={<ProvisionPage />} />
              <Route path="personnel" element={<PersonnelPage />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Convenience Redirects */}
            <Route path="/login" element={<Navigate to="/auth/login" replace />} />
            <Route path="/dashboard" element={<Navigate to="/portal/dashboard" replace />} />
            <Route path="/investor-pack" element={<Navigate to="/investor" replace />} />

            {/* 404 Catch-All */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
