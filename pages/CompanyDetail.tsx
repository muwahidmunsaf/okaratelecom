
import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Table } from '../components/ui/Table';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { ProjectTable } from '../components/projects/ProjectTable';
import { ProjectForm } from '../components/projects/ProjectForm';
import { useData, useDataDispatch, useActivityLogger } from '../contexts/DataContext';
import { usePermissions } from '../hooks/usePermissions';
import { Project, SubDomain, User, Role } from '../types';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { generateProjectSummary } from '../services/geminiService';
import { db } from '../firebaseConfig';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

// Example function to fetch companies from Firestore
const fetchCompaniesFromFirestore = async () => {
  const companiesCol = collection(db, 'companies');
  const companySnapshot = await getDocs(companiesCol);
  return companySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
};

// Example function to add a company to Firestore
const addCompanyToFirestore = async (company) => {
  await addDoc(collection(db, 'companies'), company);
};

// Example function to update a company in Firestore
const updateCompanyInFirestore = async (company) => {
  await updateDoc(doc(db, 'companies', company.id), company);
};

// Example function to delete a company from Firestore
const deleteCompanyFromFirestore = async (companyId) => {
  await deleteDoc(doc(db, 'companies', companyId));
};

// Example function to add a subdomain to Firestore
const addSubDomainToFirestore = async (companyId, subDomain) => {
  await addDoc(collection(db, `companies/${companyId}/subDomains`), subDomain);
};

export const CompanyDetail: React.FC = () => {
    const { companyId } = useParams<{ companyId: string }>();
    const navigate = useNavigate();
    const { companies, users } = useData();
    const dispatch = useDataDispatch();
    const logActivity = useActivityLogger();
    const { canEdit, canDelete } = usePermissions();

    const company = useMemo(() => companies.find(c => c.id === companyId), [companies, companyId]);
    const supervisors = useMemo(() => users.filter(u => u.role === Role.SUPERVISOR), [users]);

    const [modal, setModal] = useState<{
        isOpen: boolean;
        type: 'subDomain' | 'project' | 'summary' | null;
        data?: any;
    }>({ isOpen: false, type: null, data: {} });
        
    const [isGenerating, setIsGenerating] = useState(false);

    const closeModal = () => setModal({ isOpen: false, type: null, data: {} });

    const handleSubDomainSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        
        if (modal.data?.subDomain) { // Editing
            dispatch({ type: 'UPDATE_SUB_DOMAIN', payload: { companyId: company!.id, subDomain: { id: modal.data.subDomain.id, name } } });
            logActivity('Update Sub-Domain', `Updated sub-domain ${name} in company ${company!.name}`);
        } else { // Adding
            const newSubDomain: SubDomain = { id: `sd_${Date.now()}`, name, projects: [] };
            dispatch({ type: 'ADD_SUB_DOMAIN', payload: { companyId: company!.id, subDomain: newSubDomain } });
            logActivity('Add Sub-Domain', `Added sub-domain ${name} to company ${company!.name}`);
        }
        closeModal();
    };
    
    const handleProjectSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        
        // The subDomainId might come from the form if it wasn't pre-set
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
            // Note: This simple update doesn't handle moving projects between companies/subdomains.
            // That would require a more complex dispatch action.
            dispatch({ type: 'UPDATE_PROJECT', payload: updatedProject });
            logActivity('Update Project', `Updated project: ${projectData.name}`);
        } else { // Adding
            const newProject: Project = { ...projectData, id: `proj_${Date.now()}` };
            dispatch({ 
                type: 'ADD_PROJECT', 
                payload: { 
                    companyId: company!.id, 
                    subDomainId: subDomainId || undefined,
                    project: newProject 
                } 
            });
            logActivity('Add Project', `Added project ${projectData.name} to company ${company!.name}`);
        }
        closeModal();
    };

    const handleDeleteSubDomain = (subDomain: SubDomain) => {
        if(window.confirm(`Delete "${subDomain.name}"? This will delete all projects within it.`)){
            dispatch({type: 'DELETE_SUB_DOMAIN', payload: {companyId: company!.id, subDomainId: subDomain.id}});
            logActivity('Delete Sub-Domain', `Deleted sub-domain: ${subDomain.name}`);
        }
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

    if (!company) {
        return (
            <PageWrapper title="Company Not Found">
                <div className="text-center p-8">
                    <p className="text-gray-500">The company you are looking for does not exist or could not be loaded.</p>
                </div>
            </PageWrapper>
        );
    }
    
    const subDomainColumns = [
        { header: 'Sub-Domain Name', accessor: 'name' as const },
        { header: 'Projects', accessor: (sd: SubDomain) => sd.projects.length },
        { header: 'Actions', accessor: (sd: SubDomain) => (
            <div className="flex space-x-1">
                <Button size="sm" onClick={() => navigate(`/companies/${companyId}/sub-domains/${sd.id}`)}>View Projects</Button>
                {canEdit() && <Button variant="ghost" size="sm" onClick={() => setModal({isOpen: true, type: 'subDomain', data: {subDomain: sd}})}><Edit size={16}/></Button>}
                {canDelete() && <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDeleteSubDomain(sd)}><Trash2 size={16}/></Button>}
            </div>
        )}
    ];

    return (
        <PageWrapper title={company.name}>
            <Breadcrumbs items={[{ name: 'Companies', href: '/companies' }, { name: company.name }]} />
            
            <Card className="mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-brand-dark">Sub-Domains</h2>
                    {canEdit() && <Button onClick={() => setModal({isOpen: true, type: 'subDomain'})}><PlusCircle className="mr-2" size={16}/>Add Sub-Domain</Button>}
                </div>
                <Table columns={subDomainColumns} data={company.subDomains} onRowClick={(sd) => navigate(`/companies/${companyId}/sub-domains/${sd.id}`)} />
            </Card>

            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-brand-dark">Direct Projects</h2>
                    {canEdit() && <Button onClick={() => setModal({isOpen: true, type: 'project'})}><PlusCircle className="mr-2" size={16}/>Add Project</Button>}
                </div>
                <ProjectTable projects={company.projects} onEdit={(p) => setModal({isOpen: true, type: 'project', data: {project: p}})} onDelete={handleDeleteProject} onGenerateSummary={handleGenerateSummary} />
            </Card>

            <Modal isOpen={modal.isOpen} onClose={closeModal} title={
                modal.type === 'subDomain' ? (modal.data?.subDomain ? 'Edit Sub-Domain' : 'Add Sub-Domain') :
                modal.type === 'project' ? (modal.data?.project ? 'Edit Project' : 'Add Project') : 'AI Summary'
            }>
                {modal.type === 'subDomain' && (
                    <form onSubmit={handleSubDomainSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Sub-Domain Name</label>
                            <input type="text" id="name" name="name" defaultValue={modal.data?.subDomain?.name || ''} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"/>
                        </div>
                        <div className="flex justify-end space-x-2 pt-4">
                            <Button type="button" variant="ghost" onClick={closeModal}>Cancel</Button>
                            <Button type="submit">{modal.data?.subDomain ? 'Update' : 'Add'}</Button>
                        </div>
                    </form>
                )}
                {modal.type === 'project' && (
                    <ProjectForm 
                        project={modal.data?.project} 
                        supervisors={supervisors} 
                        companies={companies}
                        initialCompanyId={company.id}
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