
import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { ProjectTable } from '../components/projects/ProjectTable';
import { ProjectForm } from '../components/projects/ProjectForm';
import { useData, useDataDispatch, useActivityLogger } from '../contexts/DataContext';
import { usePermissions } from '../hooks/usePermissions';
import { Project, Role } from '../types';
import { PlusCircle } from 'lucide-react';
import { generateProjectSummary } from '../services/geminiService';
import { db } from '../firebaseConfig';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';


export const SubDomainDetail: React.FC = () => {
    const { companyId, subDomainId } = useParams<{ companyId: string, subDomainId: string }>();
    const { companies, users } = useData();
    const dispatch = useDataDispatch();
    const logActivity = useActivityLogger();
    const { canEdit } = usePermissions();

    const company = useMemo(() => companies.find(c => c.id === companyId), [companies, companyId]);
    const subDomain = useMemo(() => company?.subDomains.find(sd => sd.id === subDomainId), [company, subDomainId]);
    const supervisors = useMemo(() => users.filter(u => u.role === Role.SUPERVISOR), [users]);
    
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
            dispatch({ type: 'ADD_PROJECT', payload: { companyId: company!.id, subDomainId: subDomain!.id, project: newProject } });
            logActivity('Add Project', `Added project ${projectData.name} to sub-domain ${subDomain!.name}`);
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

    // Example function to fetch subdomain details from Firestore
    const fetchSubDomainDetailFromFirestore = async (subDomainId: string) => {
      const subDomainDoc = doc(db, 'subDomains', subDomainId);
      const subDomainSnapshot = await getDocs(subDomainDoc);
      return { ...subDomainSnapshot.data(), id: subDomainSnapshot.id };
    };

    // Example function to update a subdomain in Firestore
    const updateSubDomainInFirestore = async (subDomain: any) => {
      await updateDoc(doc(db, 'subDomains', subDomain.id), subDomain);
    };

    if (!company || !subDomain) {
        return (
            <PageWrapper title="Content Not Found">
                <div className="text-center p-8">
                    <p className="text-gray-500">The content you are looking for could not be found.</p>
                </div>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper title={`${subDomain.name} Projects`} actions={
            canEdit() && <Button onClick={() => setModal({isOpen: true, type: 'project'})}><PlusCircle className="mr-2" size={16}/>Add Project</Button>
        }>
            <Breadcrumbs items={[
                { name: 'Companies', href: '/companies' }, 
                { name: company.name, href: `/companies/${company.id}` },
                { name: subDomain.name }
            ]} />
            
            <Card>
                 <ProjectTable projects={subDomain.projects} onEdit={(p) => setModal({isOpen: true, type: 'project', data: {project: p}})} onDelete={handleDeleteProject} onGenerateSummary={handleGenerateSummary} />
            </Card>

            <Modal isOpen={modal.isOpen} onClose={closeModal} title={
                modal.type === 'project' ? (modal.data?.project ? 'Edit Project' : 'Add Project') : 'AI Project Summary'
            }>
                {modal.type === 'project' && (
                    <ProjectForm 
                        project={modal.data?.project} 
                        supervisors={supervisors}
                        companies={companies}
                        initialCompanyId={company.id}
                        initialSubDomainId={subDomain.id}
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