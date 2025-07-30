
import React, { useState, useMemo } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Table } from '../components/ui/Table';
import { useData, useDataDispatch, useActivityLogger } from '../contexts/DataContext';
import { usePermissions } from '../hooks/usePermissions';
import { SubDomain, Company } from '../types';
import { PlusCircle, Edit, Trash2, Download } from 'lucide-react';
import { exportToExcel, exportToPdf } from '../services/exportService';
import { db } from '../firebaseConfig';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

interface FlatSubDomain extends SubDomain {
    companyId: string;
    companyName: string;
}

export const SubDomainsPage: React.FC = () => {
    const { companies } = useData();
    const dispatch = useDataDispatch();
    const logActivity = useActivityLogger();
    const { canEdit, canDelete } = usePermissions();

    const [modal, setModal] = useState<{
        isOpen: boolean;
        data?: FlatSubDomain;
    }>({ isOpen: false });
    
    const [filterText, setFilterText] = useState('');
    const [filterCompany, setFilterCompany] = useState('');

    const flatSubDomains: FlatSubDomain[] = useMemo(() => {
        const allSubDomains: FlatSubDomain[] = [];
        companies.forEach(company => {
            company.subDomains.forEach(sd => {
                allSubDomains.push({
                    ...sd,
                    companyId: company.id,
                    companyName: company.name
                });
            });
        });
        return allSubDomains;
    }, [companies]);

    const filteredSubDomains = useMemo(() => {
        return flatSubDomains.filter(sd => {
            const textMatch = sd.name.toLowerCase().includes(filterText.toLowerCase());
            const companyMatch = filterCompany ? sd.companyId === filterCompany : true;
            return textMatch && companyMatch;
        });
    }, [flatSubDomains, filterText, filterCompany]);
    
    const closeModal = () => setModal({ isOpen: false });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        const companyId = formData.get('companyId') as string;
        const company = companies.find(c => c.id === companyId);
        if(!company) return;

        if (modal.data) { // Editing
            dispatch({ type: 'UPDATE_SUB_DOMAIN', payload: { companyId: modal.data.companyId, subDomain: { id: modal.data.id, name } } });
            logActivity('Update Sub-Domain', `Updated sub-domain ${name}`);
        } else { // Adding
            const newSubDomain: SubDomain = { id: `sd_${Date.now()}`, name, projects: [] };
            dispatch({ type: 'ADD_SUB_DOMAIN', payload: { companyId: companyId, subDomain: newSubDomain } });
            logActivity('Add Sub-Domain', `Added sub-domain ${name} to company ${company.name}`);
        }
        closeModal();
    };
    
    const handleDelete = (subDomain: FlatSubDomain) => {
         if(window.confirm(`Delete "${subDomain.name}"? This will delete all projects within it.`)){
            dispatch({type: 'DELETE_SUB_DOMAIN', payload: {companyId: subDomain.companyId, subDomainId: subDomain.id}});
            logActivity('Delete Sub-Domain', `Deleted sub-domain: ${subDomain.name}`);
        }
    };
    
    const handleExportPDF = () => {
        const headers = [['Sub-Domain Name', 'Parent Company', 'Project Count']];
        const body = filteredSubDomains.map(sd => [sd.name, sd.companyName, sd.projects.length]);
        exportToPdf('All Sub-Domains Report', headers, body, 'all_sub_domains');
        logActivity('Export PDF', 'Exported all sub-domains report.');
    };

    const handleExportExcel = () => {
        const data = filteredSubDomains.map(sd => ({
            'Sub-Domain Name': sd.name,
            'Parent Company': sd.companyName,
            'Project Count': sd.projects.length
        }));
        exportToExcel(data, 'all_sub_domains', 'Sub-Domains');
        logActivity('Export Excel', 'Exported all sub-domains report.');
    };

    const columns = [
        { header: 'Sub-Domain Name', accessor: 'name' as const },
        { header: 'Parent Company', accessor: 'companyName' as const },
        { header: 'Project Count', accessor: (sd: FlatSubDomain) => sd.projects.length },
        { header: 'Actions', accessor: (sd: FlatSubDomain) => (
            <div className="flex space-x-1">
                {canEdit() && <Button variant="ghost" size="sm" onClick={() => setModal({isOpen: true, data: sd})}><Edit size={16}/></Button>}
                {canDelete() && <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(sd)}><Trash2 size={16}/></Button>}
            </div>
        )}
    ];

    return (
        <PageWrapper title="All Sub-Domains" actions={
            canEdit() && <Button onClick={() => setModal({isOpen: true})}><PlusCircle className="mr-2" size={16}/>Add Sub-Domain</Button>
        }>
            <Card>
                <div className="flex flex-wrap gap-4 items-center mb-4">
                    <input
                        type="text"
                        placeholder="Search sub-domain..."
                        value={filterText}
                        onChange={e => setFilterText(e.target.value)}
                        className="p-2 border border-gray-300 rounded-md w-full md:w-1/3 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:border-brand-secondary"
                    />
                    <select
                        value={filterCompany}
                        onChange={e => setFilterCompany(e.target.value)}
                        className="p-2 border border-gray-300 rounded-md bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:border-brand-secondary"
                    >
                        <option value="">All Companies</option>
                        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <div className="ml-auto flex space-x-2">
                         <Button onClick={handleExportPDF} variant="ghost" size="sm"><Download className="mr-1" size={16}/> PDF</Button>
                         <Button onClick={handleExportExcel} variant="ghost" size="sm"><Download className="mr-1" size={16}/> Excel</Button>
                    </div>
                </div>
                <Table columns={columns} data={filteredSubDomains} />
            </Card>

            <Modal isOpen={modal.isOpen} onClose={closeModal} title={ modal.data ? 'Edit Sub-Domain' : 'Add Sub-Domain'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Sub-Domain Name</label>
                        <input type="text" id="name" name="name" defaultValue={modal.data?.name || ''} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"/>
                    </div>
                    <div>
                        <label htmlFor="companyId" className="block text-sm font-medium text-gray-700">Company</label>
                        <select 
                            id="companyId" 
                            name="companyId" 
                            defaultValue={modal.data?.companyId || ''} 
                            required 
                            disabled={!!modal.data}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm disabled:bg-gray-100">
                            <option value="">Select Company</option>
                            {companies.map((c: Company) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                         {!!modal.data && <p className="text-xs text-gray-500 mt-1">Cannot change the parent company of an existing sub-domain.</p>}
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="ghost" onClick={closeModal}>Cancel</Button>
                        <Button type="submit">{modal.data ? 'Update' : 'Add'}</Button>
                    </div>
                </form>
            </Modal>
        </PageWrapper>
    )
}
