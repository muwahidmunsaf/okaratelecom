
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { NotificationProvider } from './contexts/NotificationContext';

import { Sidebar } from './components/layout/Sidebar';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Attendance } from './pages/Attendance';
import { Companies } from './pages/Projects';
import { CompanyDetail } from './pages/CompanyDetail';
import { SubDomainDetail } from './pages/SubDomainDetail';
import { Users } from './pages/Users';
import { Salary } from './pages/Salary';
import { ActivityLog } from './pages/ActivityLog';
import { Profile } from './pages/Profile';
import { Employees } from './pages/Employees';
import { ProjectsPage } from './pages/ProjectsPage';
import { SubDomainsPage } from './pages/SubDomainsPage';
import { CompanyProfile } from './pages/CompanyProfile';
import AttendanceMark from './pages/AttendanceMark';

const AppRoutes: React.FC = () => {
    const { isAuthenticated, user } = useAuth();
    console.log('Current user:', user); // Debug log
    
    if (!isAuthenticated) {
        return (
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
        );
    }

    // If employee, only show AttendanceMark page
    if (user?.role === 'Employee') {
        return (
            <Routes>
                <Route path="/attendance-mark" element={<AttendanceMark />} />
                <Route path="*" element={<Navigate to="/attendance-mark" />} />
            </Routes>
        );
    }
    
    return (
        <div className="flex h-screen bg-brand-light">
            <Sidebar />
            <main className="flex-1 ml-64 overflow-y-auto">
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/companies" element={<Companies />} />
                    <Route path="/companies/:companyId" element={<CompanyDetail />} />
                    <Route path="/companies/:companyId/sub-domains/:subDomainId" element={<SubDomainDetail />} />
                    <Route path="/sub-domains" element={<SubDomainsPage />} />
                    <Route path="/projects" element={<ProjectsPage />} />
                    <Route path="/attendance" element={<Attendance />} />
                    <Route path="/users" element={<Users />} />
                    <Route path="/salary" element={<Salary />} />
                    <Route path="/logs" element={<ActivityLog />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/employees" element={<Employees />} />
                    <Route path="/company-profile" element={<CompanyProfile />} />
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </main>
        </div>
    );
}

const App: React.FC = () => {
  return (
    <HashRouter>
      <NotificationProvider>
        <DataProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </DataProvider>
      </NotificationProvider>
    </HashRouter>
  );
};

export default App;