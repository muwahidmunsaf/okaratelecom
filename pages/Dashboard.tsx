import React from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Users, Briefcase, AlertTriangle, ArrowDownCircle, CheckCircle } from 'lucide-react';

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
    <Card className="flex items-center p-4">
        <div className={`p-3 rounded-full mr-4 ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-brand-dark">{value}</p>
        </div>
    </Card>
);

export const Dashboard: React.FC = () => {
  const { users, companies, financialRecords, attendance } = useData();
  const { user } = useAuth();
  
  const activeProjects = companies.reduce((acc, company) => {
    const directProjects = company.projects.filter(p => p.status === 'In Progress').length;
    const subDomainProjects = company.subDomains.flatMap(sd => sd.projects).filter(p => p.status === 'In Progress').length;
    return acc + directProjects + subDomainProjects;
  }, 0);
  
  const totalPenalties = financialRecords.filter(f => f.type === 'Penalty').reduce((sum, r) => sum + r.amount, 0);
  const totalAdvances = financialRecords.filter(r => r.type === 'Advance').reduce((sum, r) => sum + r.amount, 0);
  const onTimeToday = attendance.filter(a => a.date === new Date().toISOString().split('T')[0] && a.status === 'Present').length;
  
  return (
    <PageWrapper title={`Welcome, ${user?.name || 'User'}!`}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Employees" value={users.length} icon={<Users className="text-white"/>} color="bg-blue-500" />
        <StatCard title="Active Projects" value={activeProjects} icon={<Briefcase className="text-white"/>} color="bg-green-500" />
        <StatCard title="Total Penalties (AED)" value={totalPenalties.toLocaleString()} icon={<AlertTriangle className="text-white"/>} color="bg-red-500" />
        <StatCard title="Total Advances (AED)" value={totalAdvances.toLocaleString()} icon={<ArrowDownCircle className="text-white"/>} color="bg-yellow-500" />
      </div>
      <Card>
        <h2 className="text-xl font-bold text-brand-dark mb-4">Today's Snapshot</h2>
        <div className="flex items-center space-x-6">
            <div className="flex items-center text-green-600">
                <CheckCircle className="mr-2"/>
                <span className="font-semibold">{onTimeToday} Employees Marked Present</span>
            </div>
        </div>
      </Card>
    </PageWrapper>
  );
};