
import { Role } from './types';
import { LayoutDashboard, CalendarCheck, UserCog, CircleDollarSign, History, UserCircle, LogOut, Construction, Building2, Network, ClipboardList, Settings } from 'lucide-react';

export const COMPANY_NAME = "Inteltech";
export const REQUIRED_WORK_HOURS = 8;
export const CLOCK_IN_TIME = "09:00";

export const navLinks = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: [Role.ADMIN, Role.SUPERVISOR] },
    { name: 'Companies', href: '/companies', icon: Building2, roles: [Role.ADMIN, Role.SUPERVISOR] },
    { name: 'Sub-Domains', href: '/sub-domains', icon: Network, roles: [Role.ADMIN, Role.SUPERVISOR] },
    { name: 'Projects', href: '/projects', icon: ClipboardList, roles: [Role.ADMIN, Role.SUPERVISOR] },
    { name: 'Attendance', href: '/attendance', icon: CalendarCheck, roles: [Role.ADMIN, Role.SUPERVISOR] },
    { name: 'Employees', href: '/employees', icon: Construction, roles: [Role.ADMIN, Role.SUPERVISOR] },
    { name: 'Salary & Penalties', href: '/salary', icon: CircleDollarSign, roles: [Role.ADMIN, Role.SUPERVISOR] },
    { name: 'Users', href: '/users', icon: UserCog, roles: [Role.ADMIN] },
    { name: 'Activity Log', href: '/logs', icon: History, roles: [Role.ADMIN] },
    { name: 'Company Profile', href: '/company-profile', icon: Settings, roles: [Role.ADMIN] },
    { name: 'Profile', href: '/profile', icon: UserCircle, roles: [Role.ADMIN, Role.SUPERVISOR] },
];

export const bottomNavLinks = [
    { name: 'Logout', href: '/login', icon: LogOut, roles: [Role.ADMIN, Role.SUPERVISOR] },
];