
import React, { useState, useMemo } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Table } from '../components/ui/Table';
import { useData, useDataDispatch, useActivityLogger } from '../contexts/DataContext';
import { usePermissions } from '../hooks/usePermissions';
import { useNotification } from '../contexts/NotificationContext';
import { Employee, Role, AttendanceStatus, AttendanceRecord } from '../types';
import { PlusCircle, Edit, Trash2, Download, CalendarDays } from 'lucide-react';
import { exportToExcel, exportToPdf } from '../services/exportService';
import { db } from '../firebaseConfig';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

const EmployeeForm: React.FC<{
    employee?: Employee | null,
    onClose: () => void,
}> = ({ employee, onClose }) => {
    const dispatch = useDataDispatch();
    const logActivity = useActivityLogger();
    const { addNotification } = useNotification();

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;

        if (employee) { // Editing existing employee
            const updatedEmployee: Employee = {
                ...employee,
                name,
                basicSalary: Number(formData.get('basicSalary')),
            };
            dispatch({ type: 'UPDATE_EMPLOYEE', payload: updatedEmployee });
            logActivity('Update Employee', `Updated employee: ${name}`);
            addNotification('Employee updated successfully!', 'success');

        } else { // Adding new employee
            const newEmployee: Employee = {
                id: `emp_${Date.now()}`,
                name,
                basicSalary: Number(formData.get('basicSalary')),
            };

            dispatch({ type: 'ADD_EMPLOYEE', payload: newEmployee });
            logActivity('Add Employee', `Added new employee: ${name}`);
            addNotification('Employee created!', 'success');
        }
        onClose();
    };


    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
                    <input type="text" id="name" name="name" defaultValue={employee?.name} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"/>
                </div>
                <div>
                    <label htmlFor="basicSalary" className="block text-sm font-medium text-gray-700">Basic Salary (AED)</label>
                    <input type="number" id="basicSalary" name="basicSalary" defaultValue={employee?.basicSalary} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"/>
                </div>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                <Button type="submit">{employee ? 'Update Employee' : 'Add Employee'}</Button>
            </div>
        </form>
    );
};

const AttendanceSummaryModal: React.FC<{
    employee: Employee,
    attendanceRecords: AttendanceRecord[],
    onClose: () => void,
}> = ({ employee, attendanceRecords, onClose }) => {
    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState(currentYear);
    const [month, setMonth] = useState(new Date().getMonth()); // 0-11

    const summary = useMemo(() => {
        const counts = {
            [AttendanceStatus.PRESENT]: 0,
            [AttendanceStatus.ABSENT]: 0,
            [AttendanceStatus.LATE]: 0,
            [AttendanceStatus.EARLY_DEPARTURE]: 0,
            [AttendanceStatus.HOLIDAY]: 0,
        };
        
        attendanceRecords
            .filter(r => r.employeeId === employee.id && new Date(r.date).getFullYear() === year && new Date(r.date).getMonth() === month)
            .forEach(r => {
                if(r.status in counts) {
                    counts[r.status]++;
                }
            });

        return counts;
    }, [employee, attendanceRecords, year, month]);
    
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const years = Array.from({length: 5}, (_, i) => currentYear - i);

    return (
         <Modal isOpen={true} onClose={onClose} title={`Attendance Summary for ${employee.name}`}>
            <div className="space-y-4">
                <div className="flex gap-4 items-center p-4 bg-gray-50 rounded-lg">
                    <div>
                        <label className="text-sm font-medium text-gray-700">Month</label>
                        <select value={month} onChange={e => setMonth(Number(e.target.value))} className="p-2 border border-gray-300 rounded-md w-full mt-1 bg-white shadow-sm">
                            {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">Year</label>
                        <select value={year} onChange={e => setYear(Number(e.target.value))} className="p-2 border border-gray-300 rounded-md w-full mt-1 bg-white shadow-sm">
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                    {Object.entries(summary).map(([status, count]) => (
                         <div key={status} className="p-4 bg-brand-light rounded-lg">
                            <p className="font-semibold text-brand-primary">{status}</p>
                            <p className="text-3xl font-bold text-brand-dark">{count}</p>
                        </div>
                    ))}
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" onClick={onClose}>Close</Button>
                </div>
            </div>
         </Modal>
    );
};

export const Employees: React.FC = () => {
    const { employees, attendance } = useData();
    const dispatch = useDataDispatch();
    const { isRole, canEdit } = usePermissions();
    const logActivity = useActivityLogger();
    const { addNotification } = useNotification();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [filterText, setFilterText] = useState('');

    const handleOpenModal = (employee: Employee | null = null) => {
        setEditingEmployee(employee);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingEmployee(null);
    };
    
    const handleOpenAttendanceModal = (employee: Employee) => {
        setSelectedEmployee(employee);
        setIsAttendanceModalOpen(true);
    };

    const handleCloseAttendanceModal = () => {
        setSelectedEmployee(null);
        setIsAttendanceModalOpen(false);
    };

    const handleDeleteEmployee = (employee: Employee) => {
        if(window.confirm(`Are you sure you want to delete ${employee.name}?`)) {
            dispatch({ type: 'DELETE_EMPLOYEE', payload: employee.id });
            logActivity('Delete Employee', `Deleted employee: ${employee.name} (ID: ${employee.id})`);
            addNotification('Employee deleted successfully!', 'success');
        }
    }

    const filteredEmployees = useMemo(() =>
        employees.filter(employee =>
            employee.name.toLowerCase().includes(filterText.toLowerCase())
        ), [employees, filterText]);

    const handleExportPDF = () => {
        const headers = [['Name', 'Basic Salary (AED)']];
        const body = filteredEmployees.map(e => [e.name, e.basicSalary.toLocaleString()]);
        exportToPdf('Employee List', headers, body, 'employees');
        logActivity('Export PDF', 'Exported employee list.');
    };

    const handleExportExcel = () => {
        const data = filteredEmployees.map(e => ({
            Name: e.name,
            'Basic Salary (AED)': e.basicSalary,
        }));
        exportToExcel(data, 'employees', 'Employees');
        logActivity('Export Excel', 'Exported employee list.');
    };

    const columns = [
        { header: 'Name', accessor: 'name' as const },
        { header: 'Basic Salary (AED)', accessor: (item: Employee) => item.basicSalary.toLocaleString() },
        ...(canEdit() ? [{
            header: 'Actions',
            accessor: (item: Employee) => (
                <div className="flex space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenAttendanceModal(item)} title="View Attendance Summary">
                        <CalendarDays size={16} />
                    </Button>
                    {isRole(Role.ADMIN) && (
                        <>
                            <Button variant="ghost" size="sm" onClick={() => handleOpenModal(item)} title="Edit Employee">
                                <Edit size={16} />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDeleteEmployee(item)} title="Delete Employee">
                                <Trash2 size={16} />
                            </Button>
                        </>
                    )}
                </div>
            )
        }] : []),
    ];

    return (
        <PageWrapper title="Employee Management" actions={
            isRole(Role.ADMIN) && <Button onClick={() => handleOpenModal()}><PlusCircle className="mr-2" size={16}/>Add Employee</Button>
        }>
            <Card>
                <div className="flex flex-wrap gap-4 items-center mb-4">
                     <input
                        type="text"
                        placeholder="Filter by name..."
                        value={filterText}
                        onChange={e => setFilterText(e.target.value)}
                        className="p-2 border border-gray-300 rounded-md w-full md:w-1/3 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:border-brand-secondary"
                    />
                    <div className="ml-auto flex space-x-2">
                         <Button onClick={handleExportPDF} variant="ghost" size="sm"><Download className="mr-1" size={16}/> PDF</Button>
                         <Button onClick={handleExportExcel} variant="ghost" size="sm"><Download className="mr-1" size={16}/> Excel</Button>
                    </div>
                </div>
                <Table columns={columns} data={filteredEmployees} />
            </Card>
            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingEmployee ? 'Edit Employee' : 'Add New Employee'}>
                <EmployeeForm employee={editingEmployee} onClose={handleCloseModal} />
            </Modal>
            {isAttendanceModalOpen && selectedEmployee && (
                <AttendanceSummaryModal
                    employee={selectedEmployee}
                    attendanceRecords={attendance}
                    onClose={handleCloseAttendanceModal}
                />
            )}
        </PageWrapper>
    );
};