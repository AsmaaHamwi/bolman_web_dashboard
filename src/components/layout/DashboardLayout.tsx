import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Bell, Building2, Bus, CalendarDays, ChartBar, ClipboardList, FileText, Home, Languages, LogOut, MapPin, Menu, Moon, QrCode, Settings, Shield, Sun, Users, WalletCards } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthProvider';
import { useCompanyStaffPermissions, useSystemStaffPermissions } from '../../hooks/usePermissions';
import { useUiStore } from '../../stores/useUiStore';
import { Button } from '../ui/Button';
import {
  hasCompanyRoutePermission,
  hasSystemRoutePermission,
  isCompanyRole,
  isSystemRole,
} from '../../config/permissions';
import { cx } from '../../utils/format';
import { useI18n } from '../../hooks/useI18n';
import { translateRole } from '../../i18n';

const City = MapPin;

export function DashboardLayout() {
  const { profile, signOut } = useAuth();
  const companyPermissions = useCompanyStaffPermissions();
  const systemPermissions = useSystemStaffPermissions();
  const { theme, toggleTheme, sidebarCollapsed, toggleSidebar } = useUiStore();
  const { locale, messages, toggleLocale } = useI18n();
  const navigate = useNavigate();

  async function logout() {
    await signOut();
    navigate('/login');
  }

  const canManageSystemStaff = profile?.role === 'super_admin' || !!systemPermissions.data?.can_manage_system_staff;
  const canManageWallets = profile?.role === 'company_owner' || hasCompanyRoutePermission(companyPermissions.data, 'manage_wallets');
  const canManageCompanyStaff = profile?.role === 'company_owner';
  const canManageCompanies = profile?.role === 'super_admin' || hasSystemRoutePermission(systemPermissions.data, 'manage_companies');
  const canManageCities = profile?.role === 'super_admin' || hasSystemRoutePermission(systemPermissions.data, 'manage_cities');
  const canViewGlobalTrips = profile?.role === 'super_admin' || hasSystemRoutePermission(systemPermissions.data, 'view_trips');
  const canViewGlobalBookings = profile?.role === 'super_admin' || hasSystemRoutePermission(systemPermissions.data, 'view_bookings');
  const canViewScanLogs = profile?.role === 'super_admin' || hasSystemRoutePermission(systemPermissions.data, 'view_scan_logs');
  const canViewSystemReports = profile?.role === 'super_admin' || hasSystemRoutePermission(systemPermissions.data, 'view_reports');
  const canManageBuses = profile?.role === 'company_owner' || hasCompanyRoutePermission(companyPermissions.data, 'manage_buses');
  const canManageDrivers = profile?.role === 'company_owner' || hasCompanyRoutePermission(companyPermissions.data, 'manage_drivers');
  const canManageTrips = profile?.role === 'company_owner' || hasCompanyRoutePermission(companyPermissions.data, 'manage_trips');
  const canManageBookings = profile?.role === 'company_owner' || hasCompanyRoutePermission(companyPermissions.data, 'manage_bookings');
  const canSendNotifications = profile?.role === 'company_owner' || hasCompanyRoutePermission(companyPermissions.data, 'send_notifications');
  const canViewCompanyReports = profile?.role === 'company_owner' || hasCompanyRoutePermission(companyPermissions.data, 'view_reports');

  const systemItems = [
    { to: '/system', label: messages.layout.navigation.overview, icon: Home },
    ...(canManageCompanies ? [{ to: '/system/companies', label: messages.layout.navigation.companies, icon: Building2 }] : []),
    ...(canManageSystemStaff ? [{ to: '/system/staff', label: messages.layout.navigation.systemStaff, icon: Shield }] : []),
    ...(canManageCities ? [{ to: '/system/cities', label: messages.layout.navigation.cities, icon: City }] : []),
    ...(canViewGlobalTrips ? [{ to: '/system/trips', label: messages.layout.navigation.globalTrips, icon: CalendarDays }] : []),
    ...(canViewGlobalBookings ? [{ to: '/system/bookings', label: messages.layout.navigation.globalBookings, icon: ClipboardList }] : []),
    ...(canViewScanLogs ? [{ to: '/system/scan-logs', label: messages.layout.navigation.scanLogs, icon: QrCode }] : []),
    ...(canViewSystemReports ? [{ to: '/system/reports', label: messages.layout.navigation.reports, icon: ChartBar }] : []),
  ];

  const companyItems = [
    { to: '/company', label: messages.layout.navigation.overview, icon: Home },
    ...(canManageBuses ? [{ to: '/company/buses', label: messages.layout.navigation.buses, icon: Bus }] : []),
    ...(canManageDrivers ? [{ to: '/company/drivers', label: messages.layout.navigation.drivers, icon: Users }] : []),
    ...(canManageTrips ? [{ to: '/company/trips', label: messages.layout.navigation.trips, icon: CalendarDays }] : []),
    ...(canManageBookings ? [{ to: '/company/bookings', label: messages.layout.navigation.bookings, icon: ClipboardList }] : []),
    ...(canManageBookings ? [{ to: '/company/manual-booking', label: messages.layout.navigation.manualBooking, icon: WalletCards }] : []),
    ...(canManageWallets ? [{ to: '/company/wallets', label: messages.layout.navigation.wallets, icon: WalletCards }] : []),
    ...(canManageCompanyStaff ? [{ to: '/company/staff', label: messages.layout.navigation.companyStaff, icon: Shield }] : []),
    ...(canManageTrips ? [{ to: '/company/offers', label: messages.layout.navigation.offers, icon: FileText }] : []),
    ...(canSendNotifications ? [{ to: '/company/notifications', label: messages.layout.navigation.notifications, icon: Bell }] : []),
    ...(canViewCompanyReports ? [{ to: '/company/reports', label: messages.layout.navigation.reports, icon: ChartBar }] : []),
  ];

  const items = isSystemRole(profile) ? systemItems : isCompanyRole(profile) ? companyItems : [];

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-bolman-dark dark:text-white">
      <aside
        className={cx(
          'sticky top-0 hidden h-screen shrink-0 border-e border-slate-200 bg-white/90 p-4 backdrop-blur-xl transition-all dark:border-bolman-borderDark dark:bg-bolman-cardDark/90 lg:block',
          sidebarCollapsed ? 'w-24' : 'w-72',
        )}
      >
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-bolman-purple text-white shadow-glow">
            <Bus />
          </div>
          {!sidebarCollapsed && (
            <div>
              <div className="text-xl font-black">{messages.common.appName}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{messages.common.managementDashboard}</div>
            </div>
          )}
        </div>
        <nav className="space-y-2">
          {items.map((item) => (
            <SidebarLink key={item.to} {...item} collapsed={sidebarCollapsed} />
          ))}
          <SidebarLink to="/settings" label={messages.layout.navigation.settings} icon={Settings} collapsed={sidebarCollapsed} />
        </nav>
      </aside>
      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-slate-50/80 px-4 py-3 backdrop-blur-xl dark:border-bolman-borderDark dark:bg-bolman-dark/80 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={toggleSidebar} className="hidden p-2 lg:inline-flex">
                <Menu size={20} />
              </Button>
              <div>
                <h1 className="text-lg font-black">
                  {messages.layout.welcome} {profile?.full_name || ''}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {profile?.role ? translateRole(profile.role, locale) : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={toggleLocale}>
                <Languages size={18} />
                {locale.toUpperCase()}
              </Button>
              <Button variant="secondary" onClick={toggleTheme}>
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </Button>
              <Button variant="secondary" onClick={logout}>
                <LogOut size={18} />
                {messages.layout.logout}
              </Button>
            </div>
          </div>
        </header>
        <div className="p-4 sm:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function SidebarLink({ to, label, icon: Icon, collapsed }: { to: string; label: string; icon: any; collapsed: boolean }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cx(
          'flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold transition',
          isActive ? 'bg-bolman-purple text-white shadow-glow' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-bolman-surfaceDark',
        )
      }
    >
      <Icon size={20} />
      {!collapsed && <span>{label}</span>}
    </NavLink>
  );
}
