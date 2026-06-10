import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useEffect } from 'react';
import { initUiPreferences } from '../stores/useUiStore';
import { AuthProvider, useAuth } from '../features/auth/AuthProvider';
import { LoginPage } from '../features/auth/LoginPage';
import { ProtectedRoute } from './ProtectedRoute';
import { PermissionRoute } from './PermissionRoute';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { SystemOverviewPage } from '../features/system/SystemOverviewPage';
import { CompaniesPage } from '../features/system/CompaniesPage';
import { CitiesPage } from '../features/system/CitiesPage';
import { SystemStaffPage } from '../features/system/SystemStaffPage';
import { GlobalTripsPage } from '../features/system/GlobalTripsPage';
import { GlobalBookingsPage } from '../features/system/GlobalBookingsPage';
import { ScanLogsPage } from '../features/system/ScanLogsPage';
import { SystemReportsPage } from '../features/system/SystemReportsPage';
import { CompanyOverviewPage } from '../features/company/CompanyOverviewPage';
import { BusesPage } from '../features/company/BusesPage';
import { DriversPage } from '../features/company/DriversPage';
import { TripsPage } from '../features/company/TripsPage';
import { CreateTripPage } from '../features/company/CreateTripPage';
import { CompanyBookingsPage } from '../features/company/CompanyBookingsPage';
import { ManualBookingPage } from '../features/company/ManualBookingPage';
import { CompanyWalletsPage } from '../features/company/wallets/CompanyWalletsPage';
import { CompanyStaffPage } from '../features/company/CompanyStaffPage';
import { OffersPage } from '../features/company/OffersPage';
import { NotificationsPage } from '../features/company/NotificationsPage';
import { CompanyReportsPage } from '../features/company/CompanyReportsPage';
import { SettingsPage } from '../features/common/SettingsPage';
import { getDefaultDashboardPath } from '../config/permissions';
import { CompanyTripDetailsPage } from '../features/company/CompanyTripDetailsPage';
import { CompanyBookingDetailsPage } from '../features/company/CompanyBookingDetailsPage';

function RoleHomeRedirect() {
  const { profile } = useAuth();
  return <Navigate to={getDefaultDashboardPath(profile)} replace />;
}

export function App() {
  useEffect(() => initUiPreferences(), []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<RoleHomeRedirect />} />
            <Route path="dashboard" element={<RoleHomeRedirect />} />
            <Route path="settings" element={<SettingsPage />} />

            <Route path="system" element={<ProtectedRoute roles={['super_admin', 'system_staff']}><SystemOverviewPage /></ProtectedRoute>} />
            <Route path="system/companies" element={<ProtectedRoute roles={['super_admin', 'system_staff']}><PermissionRoute permission="manage_companies"><CompaniesPage /></PermissionRoute></ProtectedRoute>} />
            <Route path="system/cities" element={<ProtectedRoute roles={['super_admin', 'system_staff']}><PermissionRoute permission="manage_cities"><CitiesPage /></PermissionRoute></ProtectedRoute>} />
            <Route path="system/staff" element={<ProtectedRoute roles={['super_admin', 'system_staff']}><PermissionRoute permission="manage_system_staff"><SystemStaffPage /></PermissionRoute></ProtectedRoute>} />
            <Route path="system/trips" element={<ProtectedRoute roles={['super_admin', 'system_staff']}><PermissionRoute permission="view_trips"><GlobalTripsPage /></PermissionRoute></ProtectedRoute>} />
            <Route path="system/bookings" element={<ProtectedRoute roles={['super_admin', 'system_staff']}><PermissionRoute permission="view_bookings"><GlobalBookingsPage /></PermissionRoute></ProtectedRoute>} />
            <Route path="system/scan-logs" element={<ProtectedRoute roles={['super_admin', 'system_staff']}><PermissionRoute permission="view_scan_logs"><ScanLogsPage /></PermissionRoute></ProtectedRoute>} />
            <Route path="system/reports" element={<ProtectedRoute roles={['super_admin', 'system_staff']}><PermissionRoute permission="view_reports"><SystemReportsPage /></PermissionRoute></ProtectedRoute>} />

            <Route path="company" element={<ProtectedRoute roles={['company_owner', 'company_staff']}><CompanyOverviewPage /></ProtectedRoute>} />
            <Route path="company/buses" element={<ProtectedRoute roles={['company_owner', 'company_staff']}><PermissionRoute permission="manage_buses"><BusesPage /></PermissionRoute></ProtectedRoute>} />
            <Route path="company/drivers" element={<ProtectedRoute roles={['company_owner', 'company_staff']}><PermissionRoute permission="manage_drivers"><DriversPage /></PermissionRoute></ProtectedRoute>} />
            <Route path="company/trips" element={<ProtectedRoute roles={['company_owner', 'company_staff']}><PermissionRoute permission="manage_trips"><TripsPage /></PermissionRoute></ProtectedRoute>} />
            <Route path="company/trips/create" element={<ProtectedRoute roles={['company_owner', 'company_staff']}><PermissionRoute permission="manage_trips"><CreateTripPage /></PermissionRoute></ProtectedRoute>} />
            <Route path="company/trips/:tripId" element={<ProtectedRoute roles={['company_owner', 'company_staff']}><PermissionRoute permission="manage_trips"><CompanyTripDetailsPage /></PermissionRoute></ProtectedRoute>} />
            <Route path="company/bookings" element={<ProtectedRoute roles={['company_owner', 'company_staff']}><PermissionRoute permission="manage_bookings"><CompanyBookingsPage /></PermissionRoute></ProtectedRoute>} />
            <Route path="company/bookings/:bookingId" element={<ProtectedRoute roles={['company_owner', 'company_staff']}><PermissionRoute permission="manage_bookings"><CompanyBookingDetailsPage /></PermissionRoute></ProtectedRoute>} />
            <Route path="company/manual-booking" element={<ProtectedRoute roles={['company_owner', 'company_staff']}><PermissionRoute permission="manage_bookings"><ManualBookingPage /></PermissionRoute></ProtectedRoute>} />
            <Route path="company/wallets" element={<ProtectedRoute roles={['company_owner', 'company_staff']}><PermissionRoute permission="manage_wallets"><CompanyWalletsPage /></PermissionRoute></ProtectedRoute>} />
            <Route path="company/staff" element={<ProtectedRoute roles={['company_owner', 'company_staff']}><CompanyStaffPage /></ProtectedRoute>} />
            <Route path="company/offers" element={<ProtectedRoute roles={['company_owner', 'company_staff']}><PermissionRoute permission="manage_trips"><OffersPage /></PermissionRoute></ProtectedRoute>} />
            <Route path="company/notifications" element={<ProtectedRoute roles={['company_owner', 'company_staff']}><PermissionRoute permission="send_notifications"><NotificationsPage /></PermissionRoute></ProtectedRoute>} />
            <Route path="company/reports" element={<ProtectedRoute roles={['company_owner', 'company_staff']}><PermissionRoute permission="view_reports"><CompanyReportsPage /></PermissionRoute></ProtectedRoute>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
