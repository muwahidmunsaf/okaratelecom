
import React, { useState, useMemo } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { useData, useDataDispatch, useActivityLogger } from '../contexts/DataContext';
import { usePermissions } from '../hooks/usePermissions';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { AttendanceRecord, AttendanceStatus, Employee } from '../types';
import { exportToExcel, exportToPdf } from '../services/exportService';
import { Download, Edit } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { db } from '../firebaseConfig';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

const today = new Date().toISOString().split('T')[0];

interface AttendanceViewRecord extends Employee {
    attendance?: AttendanceRecord;
}

export const Attendance: React.FC = () => {
    const { attendance, employees } = useData();
    const dispatch = useDataDispatch();
    const { canEdit } = usePermissions();
    const logActivity = useActivityLogger();

    const [filterDate, setFilterDate] = useState(today);
    const [filterName, setFilterName] = useState('');
    const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

    const handleOpenModal = (employee: Employee, record?: AttendanceRecord) => {
        setSelectedEmployee(employee);
        setEditingRecord(record || null);
    };

    const handleCloseModal = () => {
        setSelectedEmployee(null);
        setEditingRecord(null);
    }
    
    const attendanceMap = useMemo(() => {
        const map = new Map<string, AttendanceRecord>();
        attendance
            .filter(a => a.date === filterDate)
            .forEach(a => map.set(a.employeeId, a));
        return map;
    }, [attendance, filterDate]);

    const employeeAttendanceList: AttendanceViewRecord[] = useMemo(() => {
        return employees
            .filter(emp => emp.name.toLowerCase().includes(filterName.toLowerCase()))
            .map(emp => ({
                ...emp,
                attendance: attendanceMap.get(emp.id)
            }));
    }, [employees, attendanceMap, filterName]);
    
    const handleExportPDF = () => {
        const headers = [['Employee', 'Date', 'Clock In', 'Clock Out', 'Status']];
        const body = employeeAttendanceList.map(e => [
            e.name, 
            filterDate, 
            e.attendance?.clockIn || '-', 
            e.attendance?.clockOut || '-', 
            e.attendance?.status || 'N/A'
        ]);
        exportToPdf(`Attendance Report for ${filterDate}`, headers, body, `attendance_${filterDate}`);
        logActivity('Export PDF', `Exported attendance for ${filterDate}.`);
    };

    const handleExportExcel = () => {
        const data = employeeAttendanceList.map(e => ({
            Employee: e.name,
            Date: filterDate,
            'Clock In': e.attendance?.clockIn || '-',
            'Clock Out': e.attendance?.clockOut || '-',
            Status: e.attendance?.status || 'N/A',
        }));
        exportToExcel(data, `attendance_${filterDate}`, 'Attendance');
        logActivity('Export Excel', `Exported attendance for ${filterDate}.`);
    };

    const handleUpdateRecord = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if(!selectedEmployee) return;
        
        const formData = new FormData(e.currentTarget);
        const recordId = editingRecord?.id || `att_${selectedEmployee.id}_${filterDate}`;
        
        const updatedRecord: AttendanceRecord = {
            id: recordId,
            employeeId: selectedEmployee.id,
            date: filterDate,
            clockIn: formData.get('clockIn') as string | undefined,
            clockOut: formData.get('clockOut') as string | undefined,
            status: formData.get('status') as AttendanceStatus,
        };

        dispatch({type: 'UPDATE_ATTENDANCE', payload: updatedRecord});
        logActivity('Update Attendance', `Updated attendance for ${selectedEmployee.name} on ${filterDate}.`);
        handleCloseModal();
    }

    const columns = [
        { header: 'Employee', accessor: 'name' as const },
        { header: 'Status', accessor: (item: AttendanceViewRecord) => item.attendance?.status || <span className="text-gray-400">Not Marked</span> },
        { header: 'Clock In', accessor: (item: AttendanceViewRecord) => item.attendance?.clockIn || '-' },
        { header: 'Clock Out', accessor: (item: AttendanceViewRecord) => item.attendance?.clockOut || '-' },
        ...(canEdit() ? [{
            header: 'Actions',
            accessor: (item: AttendanceViewRecord) => (
                <Button variant="ghost" size="sm" onClick={() => handleOpenModal(item, item.attendance)}>
                    <Edit size={16} /> Edit
                </Button>
            ),
        }] : []),
    ];

    return (
        <PageWrapper title="Attendance Management">
             <Card>
                <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                    <h2 className="text-xl font-bold text-brand-dark">Attendance Records</h2>
                    <div className="flex items-center space-x-2 flex-wrap">
                       <input
                           type="text"
                           placeholder="Search employee..."
                           value={filterName}
                           onChange={e => setFilterName(e.target.value)}
                           className="p-2 border border-gray-300 rounded-md bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:border-brand-secondary"
                       />
                       <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="p-2 border border-gray-300 rounded-md bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:border-brand-secondary" />
                       <Button onClick={handleExportPDF} variant="ghost" size="sm"><Download className="mr-1" size={16}/> PDF</Button>
                       <Button onClick={handleExportExcel} variant="ghost" size="sm"><Download className="mr-1" size={16}/> Excel</Button>
                    </div>
                </div>
                <Table columns={columns} data={employeeAttendanceList} />
            </Card>

            <Modal isOpen={!!selectedEmployee} onClose={handleCloseModal} title={`Edit Attendance for ${selectedEmployee?.name}`}>
               {selectedEmployee && (
                    <form onSubmit={handleUpdateRecord} className="space-y-4">
                        <div>
                            <p>Editing attendance for <strong>{selectedEmployee.name}</strong> on <strong>{filterDate}</strong></p>
                        </div>
                        <div>
                            <label htmlFor="clockIn" className="block text-sm font-medium text-gray-700">Clock In</label>
                            <input type="time" id="clockIn" name="clockIn" defaultValue={editingRecord?.clockIn} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
                        </div>
                         <div>
                            <label htmlFor="clockOut" className="block text-sm font-medium text-gray-700">Clock Out</label>
                            <input type="time" id="clockOut" name="clockOut" defaultValue={editingRecord?.clockOut} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
                        </div>
                        <div>
                            <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                            <select id="status" name="status" defaultValue={editingRecord?.status || AttendanceStatus.PRESENT} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                                {Object.values(AttendanceStatus).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="flex justify-end space-x-2">
                            <Button type="button" variant="ghost" onClick={handleCloseModal}>Cancel</Button>
                            <Button type="submit">Save Changes</Button>
                        </div>
                    </form>
               )}
            </Modal>
        </PageWrapper>
    );
};
