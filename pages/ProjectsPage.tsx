
import React, { useState, useMemo } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Table } from '../components/ui/Table';
import { ProjectForm } from '../components/projects/ProjectForm';
import { useData, useDataDispatch, useActivityLogger } from '../contexts/DataContext';
import { usePermissions } from '../hooks/usePermissions';
import { Project, Role } from '../types';
import { PlusCircle, Edit, Trash2, Bot, Download } from 'lucide-react';
import { generateProjectSummary } from '../services/geminiService';
import { exportToExcel, exportToPdf } from '../services/exportService';

interface FlatProject extends Project {
    companyId: string;
    companyName: string;
    subDomainId?: string;
    subDomainName?: string;
}

export const ProjectsPage: React.FC = () => {
    const { companies, users } = useData();
    const dispatch = useDataDispatch();
    const logActivity = useActivityLogger();
    const { canEdit, canDelete } = usePermissions();

    const supervisors = useMemo(() => users.filter(u => u.role === Role.SUPERVISOR), [users]);
    const projectStatuses: Project['status'][] = ['Not Started', 'In Progress', 'Completed', 'On Hold'];

    const [filterText, setFilterText] = useState('');
    const [filterCompany, setFilterCompany] = useState('');
    const [filterSubDomain, setFilterSubDomain] = useState('');
    const [filterSupervisor, setFilterSupervisor] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    const availableSubDomains = useMemo(() => {
        if (!filterCompany) return [];
        const company = companies.find(c => c.id === filterCompany);
        return company ? company.subDomains : [];
    }, [filterCompany, companies]);

    const flatProjects: FlatProject[] = useMemo(() => {
        const allProjects: FlatProject[] = [];
        companies.forEach(company => {
            company.projects.forEach(project => {
                allProjects.push({ ...project, companyId: company.id, companyName: company.name });
            });
            company.subDomains.forEach(sd => {
                sd.projects.forEach(project => {
                    allProjects.push({
                        ...project,
                        companyId: company.id,
                        companyName: company.name,
                        subDomainId: sd.id,
                        subDomainName: sd.name
                    });
                });
            });
        });
        return allProjects;
    }, [companies]);

    const filteredProjects = useMemo(() => 
        flatProjects.filter(p => {
            const textMatch = p.name.toLowerCase().includes(filterText.toLowerCase());
            const companyMatch = filterCompany ? p.companyId === filterCompany : true;
            const subDomainMatch = filterSubDomain ? p.subDomainId === filterSubDomain : true;
            const supervisorMatch = filterSupervisor ? p.supervisorId === filterSupervisor : true;
            const statusMatch = filterStatus ? p.status === filterStatus : true;
            return textMatch && companyMatch && subDomainMatch && supervisorMatch && statusMatch;
        }),
        [flatProjects, filterText, filterCompany, filterSubDomain, filterSupervisor, filterStatus]
    );

    const [modal, setModal] = useState<{
        isOpen: boolean;
        type: 'project' | 'summary' | null;
        data?: any;
    }>({ isOpen: false, type: null, data: {} });

    const [isGenerating, setIsGenerating] = useState(false);

    const closeModal = () => setModal({ isOpen: false, type: null, data: {} });

    const handleProjectSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const companyId = formData.get('companyId') as string;
        const subDomainId = formData.get('subDomainId') as string;

        const projectData = {
            name: formData.get('name') as string,
            location: formData.get('location') as string,
            duration: formData.get('duration') as string,
            cost: Number(formData.get('cost')),
            supervisorId: formData.get('supervisorId') as string,
            progress: Number(formData.get('progress')),
            status: formData.get('status') as Project['status'],
        };

        if (modal.data?.project) { // Editing
            const updatedProject = { ...modal.data.project, ...projectData };
            dispatch({ type: 'UPDATE_PROJECT', payload: updatedProject });
            logActivity('Update Project', `Updated project: ${projectData.name}`);
        } else { // Adding
            const newProject: Project = { ...projectData, id: `proj_${Date.now()}` };
            dispatch({ type: 'ADD_PROJECT', payload: { companyId, subDomainId: subDomainId || undefined, project: newProject } });
            logActivity('Add Project', `Added project ${projectData.name}`);
        }
        closeModal();
    };

    const handleDeleteProject = (project: Project) => {
        if(window.confirm(`Are you sure you want to delete project "${project.name}"?`)){
            dispatch({ type: 'DELETE_PROJECT', payload: { projectId: project.id } });
            logActivity('Delete Project', `Deleted project: ${project.name}`);
        }
    };
    
    const handleGenerateSummary = async (project: Project) => {
        setModal({ isOpen: true, type: 'summary', data: { project } });
        setIsGenerating(true);
        const supervisor = users.find(u => u.id === project.supervisorId);
        const summary = await generateProjectSummary(project, supervisor);
        setModal(prev => ({ ...prev, data: { ...prev.data, summary } }));
        setIsGenerating(false);
    };
    
    const handleExportPDF = () => {
        const headers = [['Project Name', 'Company', 'Sub-Domain', 'Status', 'Progress', 'Supervisor']];
        const body = filteredProjects.map(p => [
            p.name,
            p.companyName,
            p.subDomainName || '-',
            p.status,
            `${p.progress}%`,
            supervisors.find(s => s.id === p.supervisorId)?.name || 'N/A'
        ]);
        exportToPdf('All Projects Report', headers, body, 'all_projects');
        logActivity('Export PDF', 'Exported all projects report.');
    };

    const handleExportExcel = () => {
        const data = filteredProjects.map(p => ({
            'Project Name': p.name,
            'Company': p.companyName,
            'Sub-Domain': p.subDomainName || '-',
            'Status': p.status,
            'Progress': p.progress,
            'Supervisor': supervisors.find(s => s.id === p.supervisorId)?.name || 'N/A',
            'Location': p.location,
            'Duration': p.duration,
            'Cost (AED)': p.cost
        }));
        exportToExcel(data, 'all_projects', 'Projects');
        logActivity('Export Excel', 'Exported all projects report.');
    };

    const columns = [
        { header: 'Project Name', accessor: 'name' as const },
        { header: 'Company', accessor: 'companyName' as const },
        { header: 'Sub-Domain', accessor: (p: FlatProject) => p.subDomainName || <span className="text-gray-400">-</span> },
        { header: 'Status', accessor: (p: Project) => (
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ p.status === 'Completed' ? 'bg-green-100 text-green-800' : p.status === 'In Progress' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800' }`}>{p.status}</span>
        ) },
        { header: 'Progress', accessor: (p: Project) => `${p.progress}%` },
        { header: 'Actions', accessor: (p: FlatProject) => (
            <div className="flex space-x-1">
                 <Button variant="ghost" size="sm" onClick={() => handleGenerateSummary(p)} title="AI Summary"><Bot size={16}/></Button>
                {canEdit() && <Button variant="ghost" size="sm" onClick={() => setModal({isOpen: true, type: 'project', data: {project: p}})} title="Edit"><Edit size={16}/></Button>}
                {canDelete() && <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDeleteProject(p)} title="Delete"><Trash2 size={16}/></Button>}
            </div>
        ) }
    ];

    return (
        <PageWrapper title="All Projects" actions={
            canEdit() && <Button onClick={() => setModal({isOpen: true, type: 'project'})}><PlusCircle className="mr-2" size={16}/>Add Project</Button>
        }>
            <Card>
                <div className="p-4 border rounded-lg bg-gray-50 mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <input
                            type="text"
                            placeholder="Search by project name..."
                            value={filterText}
                            onChange={e => setFilterText(e.target.value)}
                            className="p-2 border border-gray-300 rounded-md lg:col-span-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:border-brand-secondary"
                        />
                        <select value={filterCompany} onChange={e => { setFilterCompany(e.target.value); setFilterSubDomain(''); }} className="p-2 border border-gray-300 rounded-md bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:border-brand-secondary">
                            <option value="">All Companies</option>
                            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <select value={filterSubDomain} onChange={e => setFilterSubDomain(e.target.value)} className="p-2 border border-gray-300 rounded-md bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:border-brand-secondary" disabled={!filterCompany}>
                            <option value="">All Sub-Domains</option>
                            {availableSubDomains.map(sd => <option key={sd.id} value={sd.id}>{sd.name}</option>)}
                        </select>
                        <select value={filterSupervisor} onChange={e => setFilterSupervisor(e.target.value)} className="p-2 border border-gray-300 rounded-md bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:border-brand-secondary">
                            <option value="">All Supervisors</option>
                            {supervisors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="p-2 border border-gray-300 rounded-md bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:border-brand-secondary">
                            <option value="">All Statuses</option>
                            {projectStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
                <div className="flex justify-end mb-4 space-x-2">
                    <Button onClick={handleExportPDF} variant="ghost" size="sm"><Download className="mr-1" size={16}/> PDF</Button>
                    <Button onClick={handleExportExcel} variant="ghost" size="sm"><Download className="mr-1" size={16}/> Excel</Button>
                </div>
                <Table columns={columns} data={filteredProjects} />
            </Card>

            <Modal isOpen={modal.isOpen} onClose={closeModal} title={
                modal.type === 'project' ? (modal.data?.project ? 'Edit Project' : 'Add Project') : 'AI Project Summary'
            }>
                {modal.type === 'project' && (
                    <ProjectForm 
                        project={modal.data?.project} 
                        supervisors={supervisors} 
                        companies={companies}
                        onSubmit={handleProjectSubmit} 
                        onClose={closeModal} 
                    />
                )}
                {modal.type === 'summary' && (
                     isGenerating ? <div className="flex justify-center items-center h-40"><p>Generating summary...</p></div> : (
                        <div className="prose max-w-none">
                            <p style={{whiteSpace: "pre-wrap"}}>{modal.data.summary}</p>
                        </div>
                    )
                )}
            </Modal>
        </PageWrapper>
    );
};
