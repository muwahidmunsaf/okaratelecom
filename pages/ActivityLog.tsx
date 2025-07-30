
import React, { useState, useMemo } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { useData, useActivityLogger } from '../contexts/DataContext';
import { Download } from 'lucide-react';
import { exportToExcel, exportToPdf } from '../services/exportService';
import { db } from '../firebaseConfig';
import { collection, getDocs, addDoc } from 'firebase/firestore';

export const ActivityLog: React.FC = () => {
  const { activityLogs } = useData();
  const logActivity = useActivityLogger();

  const [filterUser, setFilterUser] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterAction, setFilterAction] = useState('');

  const uniqueActions = useMemo(() => 
    [...new Set(activityLogs.map(log => log.action))].sort(), 
    [activityLogs]
  );

  const filteredLogs = useMemo(() => {
    return activityLogs.filter(log => {
      const userMatch = filterUser ? log.userName.toLowerCase().includes(filterUser.toLowerCase()) : true;
      const dateMatch = filterDate ? new Date(log.timestamp).toISOString().split('T')[0] === filterDate : true;
      const actionMatch = filterAction ? log.action === filterAction : true;
      return userMatch && dateMatch && actionMatch;
    });
  }, [activityLogs, filterUser, filterDate, filterAction]);

  const columns = [
    { header: 'User', accessor: 'userName' as const },
    { header: 'Role', accessor: 'userRole' as const },
    { header: 'Action', accessor: 'action' as const },
    { header: 'Details', accessor: 'details' as const },
    { header: 'Timestamp', accessor: (item: any) => new Date(item.timestamp).toLocaleString() },
  ];
  
  const handleExportPDF = () => {
    const headers = [['User', 'Role', 'Action', 'Details', 'Timestamp']];
    const body = filteredLogs.map(log => [log.userName, log.userRole, log.action, log.details, new Date(log.timestamp).toLocaleString()]);
    exportToPdf('Activity Log Report', headers, body, 'activity_log');
    logActivity('Export PDF', 'Exported activity logs.');
  };
  
  const handleExportExcel = () => {
      const data = filteredLogs.map(log => ({
          User: log.userName,
          Role: log.userRole,
          Action: log.action,
          Details: log.details,
          Timestamp: new Date(log.timestamp).toLocaleString(),
      }));
      exportToExcel(data, 'activity_log', 'Logs');
      logActivity('Export Excel', 'Exported activity logs.');
  };

  // Example function to fetch activity logs from Firestore
  const fetchActivityLogsFromFirestore = async () => {
    const logsCol = collection(db, 'activityLogs');
    const logsSnapshot = await getDocs(logsCol);
    return logsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  };

  // Example function to add an activity log to Firestore
  const addActivityLogToFirestore = async (log) => {
    await addDoc(collection(db, 'activityLogs'), log);
  };

  return (
    <PageWrapper title="Activity Log">
      <Card>
        <div className="flex flex-wrap gap-4 items-center mb-4 p-4 border rounded-lg bg-gray-50">
          <input
            type="text"
            placeholder="Filter by user..."
            value={filterUser}
            onChange={e => setFilterUser(e.target.value)}
            className="p-2 border border-gray-300 rounded-md bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:border-brand-secondary"
          />
          <select 
            value={filterAction} 
            onChange={e => setFilterAction(e.target.value)} 
            className="p-2 border border-gray-300 rounded-md bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:border-brand-secondary"
          >
            <option value="">All Actions</option>
            {uniqueActions.map(action => <option key={action} value={action}>{action}</option>)}
          </select>
          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="p-2 border border-gray-300 rounded-md bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:border-brand-secondary"
          />
          <div className="ml-auto flex space-x-2">
            <Button onClick={handleExportPDF} variant="ghost" size="sm"><Download className="mr-1" size={16}/> PDF</Button>
            <Button onClick={handleExportExcel} variant="ghost" size="sm"><Download className="mr-1" size={16}/> Excel</Button>
          </div>
        </div>
        <Table columns={columns} data={filteredLogs} />
      </Card>
    </PageWrapper>
  );
};
