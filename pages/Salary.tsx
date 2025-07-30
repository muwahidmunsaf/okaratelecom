
import React, { useState, useMemo } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Table } from '../components/ui/Table';
import { useData, useDataDispatch, useActivityLogger } from '../contexts/DataContext';
import { usePermissions } from '../hooks/usePermissions';
import { FinancialRecord, Employee, Role } from '../types';
import { PlusCircle, Edit, Trash2, Download } from 'lucide-react';
import { useNotification } from '../contexts/NotificationContext';
import { exportToExcel, exportToPdf } from '../services/exportService';
import { db } from '../firebaseConfig';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

const FinancialRecordForm: React.FC<{
    onClose: () => void, 
    employees: Employee[],
    record?: FinancialRecord | null 
}> = ({ onClose, employees, record }) => {
    const dispatch = useDataDispatch();
    const logActivity = useActivityLogger();
    const { addNotification } = useNotification();

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const employeeId = formData.get('employeeId') as string;
        const type = formData.get('type') as 'Penalty' | 'Advance';
        const amount = Number(formData.get('amount'));
        const reason = formData.get('reason') as string;

        if(record) { // Editing
             const updatedRecord: FinancialRecord = {
                ...record,
                employeeId,
                type,
                amount,
                reason,
             };
             dispatch({type: 'UPDATE_FINANCIAL_RECORD', payload: updatedRecord});
             logActivity('Update Financial Record', `Updated ${type} of ${amount} for employee ID ${employeeId}`);
             addNotification('Record updated successfully!', 'success');
        } else { // Adding
            const newRecord: FinancialRecord = {
                id: `fin_${Date.now()}`,
                employeeId,
                type,
                amount,
                date: new Date().toISOString().split('T')[0],
                reason,
                deducted: false
            };
            dispatch({type: 'ADD_FINANCIAL_RECORD', payload: newRecord});
            logActivity(newRecord.type, `Added ${newRecord.type} of ${newRecord.amount} for employee ID ${newRecord.employeeId}`);
            addNotification('Record added successfully!', 'success');
        }

        onClose();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
             <div>
                <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700">Employee</label>
                <select id="employeeId" name="employeeId" defaultValue={record?.employeeId} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700">Record Type</label>
                <select id="type" name="type" defaultValue={record?.type} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                    <option value="Penalty">Penalty</option>
                    <option value="Advance">Advance Salary</option>
                </select>
            </div>
            <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Amount (AED)</label>
                <input type="number" id="amount" name="amount" defaultValue={record?.amount} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"/>
            </div>
            <div>
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700">Reason</label>
                <textarea id="reason" name="reason" defaultValue={record?.reason} required rows={3} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"/>
            </div>
            <div className="flex justify-end space-x-2">
                <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                <Button type="submit">{record ? 'Update Record' : 'Add Record'}</Button>
            </div>
        </form>
    );
};


export const Salary: React.FC = () => {
    const { employees, financialRecords } = useData();
    const dispatch = useDataDispatch();
    const logActivity = useActivityLogger();
    const { addNotification } = useNotification();
    const { isRole } = usePermissions();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<FinancialRecord | null>(null);

    const [filterEmployee, setFilterEmployee] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');

    const handleOpenModal = (record: FinancialRecord | null = null) => {
        if(record && !isRole(Role.ADMIN)){
            addNotification("You don't have permission to edit records.", "error");
            return;
        }
        setEditingRecord(record);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingRecord(null);
        setIsModalOpen(false);
    };

    const handleDeleteRecord = (record: FinancialRecord) => {
        if(window.confirm(`Are you sure you want to delete this ${record.type} record for ${employees.find(e => e.id === record.employeeId)?.name}?`)) {
            dispatch({type: 'DELETE_FINANCIAL_RECORD', payload: record.id});
            logActivity('Delete Financial Record', `Deleted record ID ${record.id}`);
            addNotification('Record deleted successfully!', 'success');
        }
    };
    
    const salaryData = useMemo(() => {
        return employees.map(employee => {
            const userPenalties = financialRecords.filter(r => r.employeeId === employee.id && r.type === 'Penalty' && !r.deducted).reduce((sum, r) => sum + r.amount, 0);
            const userAdvances = financialRecords.filter(r => r.employeeId === employee.id && r.type === 'Advance' && !r.deducted).reduce((sum, r) => sum + r.amount, 0);
            const netSalary = employee.basicSalary - userPenalties - userAdvances;
            return {
                id: employee.id,
                name: employee.name,
                basicSalary: employee.basicSalary,
                penalties: userPenalties,
                advances: userAdvances,
                netSalary
            };
        });
    }, [employees, financialRecords]);
    
    const filteredFinancialRecords = useMemo(() => {
        return financialRecords
            .map(r => ({ ...r, employeeName: employees.find(u => u.id === r.employeeId)?.name || 'N/A'}))
            .filter(r => {
                const employeeMatch = filterEmployee ? r.employeeId === filterEmployee : true;
                const typeMatch = filterType ? r.type === filterType : true;
                const startDateMatch = filterStartDate ? r.date >= filterStartDate : true;
                const endDateMatch = filterEndDate ? r.date <= filterEndDate : true;
                return employeeMatch && typeMatch && startDateMatch && endDateMatch;
            })
            .reverse();
    }, [financialRecords, employees, filterEmployee, filterType, filterStartDate, filterEndDate]);

    const salaryColumns = [
        { header: 'Employee', accessor: 'name' as const },
        { header: 'Basic Salary (AED)', accessor: (item: any) => item.basicSalary.toLocaleString() },
        { header: 'Deductions (Penalty)', accessor: (item: any) => item.penalties.toLocaleString() },
        { header: 'Deductions (Advance)', accessor: (item: any) => item.advances.toLocaleString() },
        { header: 'Net Salary (AED)', accessor: (item: any) => <span className="font-bold text-green-600">{item.netSalary.toLocaleString()}</span> },
    ];
    
    const financialColumns = [
        { header: 'Employee', accessor: 'employeeName' as const },
        { header: 'Type', accessor: 'type' as const },
        { header: 'Amount (AED)', accessor: (item: any) => item.amount.toLocaleString() },
        { header: 'Date', accessor: 'date' as const },
        { header: 'Reason', accessor: 'reason' as const },
        ...(isRole(Role.ADMIN) ? [{
            header: 'Actions', 
            accessor: (item: FinancialRecord) => (
                <div className="flex space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenModal(item)} title="Edit">
                        <Edit size={16} />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDeleteRecord(item)} title="Delete">
                        <Trash2 size={16} />
                    </Button>
                </div>
            )
        }] : []),
    ];

    const handleExportRecordsPDF = () => {
        const headers = [['Employee', 'Type', 'Amount (AED)', 'Date', 'Reason']];
        const body = filteredFinancialRecords.map(r => [r.employeeName, r.type, r.amount, r.date, r.reason]);
        exportToPdf('Financial Records', headers, body, 'financial_records');
        logActivity('Export PDF', 'Exported financial records.');
    };

    const handleExportRecordsExcel = () => {
        const data = filteredFinancialRecords.map(r => ({
            Employee: r.employeeName,
            Type: r.type,
            'Amount (AED)': r.amount,
            Date: r.date,
            Reason: r.reason,
        }));
        exportToExcel(data, 'financial_records', 'Records');
        logActivity('Export Excel', 'Exported financial records.');
    };

    return (
        <PageWrapper title="Salary & Penalties" actions={
            <Button onClick={() => handleOpenModal()}><PlusCircle className="mr-2" size={16}/>Add Record</Button>
        }>
            <Card>
                <h2 className="text-xl font-bold text-brand-dark mb-4">Monthly Salary Sheet (Preview)</h2>
                <Table columns={salaryColumns} data={salaryData} />
            </Card>
            <Card>
                <h2 className="text-xl font-bold text-brand-dark mb-4">Financial Records History</h2>
                <div className="p-4 border rounded-lg bg-gray-50 mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700">Employee</label>
                            <select value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)} className="p-2 border border-gray-300 rounded-md w-full mt-1 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:border-brand-secondary">
                                <option value="">All Employees</option>
                                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Type</label>
                            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="p-2 border border-gray-300 rounded-md w-full mt-1 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:border-brand-secondary">
                                <option value="">All Types</option>
                                <option value="Penalty">Penalty</option>
                                <option value="Advance">Advance</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Start Date</label>
                            <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="p-2 border border-gray-300 rounded-md w-full mt-1 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:border-brand-secondary" />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">End Date</label>
                            <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="p-2 border border-gray-300 rounded-md w-full mt-1 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:border-brand-secondary" />
                        </div>
                    </div>
                </div>
                 <div className="flex justify-end mb-4 space-x-2">
                    <Button onClick={handleExportRecordsPDF} variant="ghost" size="sm"><Download className="mr-1" size={16}/> PDF</Button>
                    <Button onClick={handleExportRecordsExcel} variant="ghost" size="sm"><Download className="mr-1" size={16}/> Excel</Button>
                </div>
                <Table columns={financialColumns} data={filteredFinancialRecords} />
            </Card>
            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingRecord ? 'Edit Financial Record' : 'Add Financial Record'}>
                <FinancialRecordForm onClose={handleCloseModal} employees={employees} record={editingRecord}/>
            </Modal>
        </PageWrapper>
    );
};
