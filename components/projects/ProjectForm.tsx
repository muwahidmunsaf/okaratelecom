
import React, { useState, useEffect } from 'react';
import { Project, User, Company, SubDomain } from '../../types';
import { Button } from '../ui/Button';
import { db } from '../../firebaseConfig';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';

interface ProjectFormProps {
    project?: (Project & { companyId?: string }) | null;
    supervisors: User[];
    companies: Company[];
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    onClose: () => void;
    initialCompanyId?: string;
    initialSubDomainId?: string;
}

export const ProjectForm: React.FC<ProjectFormProps> = ({ 
    project, 
    supervisors, 
    companies, 
    onSubmit, 
    onClose,
    initialCompanyId,
    initialSubDomainId
}) => {
    const [progressValue, setProgressValue] = useState(project?.progress || 0);

    const [selectedCompanyId, setSelectedCompanyId] = useState<string | undefined>(initialCompanyId || project?.companyId);
    const [availableSubDomains, setAvailableSubDomains] = useState<SubDomain[]>([]);

    useEffect(() => {
        if (selectedCompanyId) {
            const company = companies.find(c => c.id === selectedCompanyId);
            setAvailableSubDomains(company ? company.subDomains : []);
        } else {
            setAvailableSubDomains([]);
        }
    }, [selectedCompanyId, companies]);
    
    // Find project's company and subdomain if editing
    useEffect(() => {
        if (project && !initialCompanyId) {
            for (const company of companies) {
                if (company.projects.some(p => p.id === project.id)) {
                    setSelectedCompanyId(company.id);
                    break;
                }
                for (const sd of company.subDomains) {
                    if (sd.projects.some(p => p.id === project.id)) {
                        setSelectedCompanyId(company.id);
                        break;
                    }
                }
            }
        }
    }, [project, companies, initialCompanyId]);

    const findSubDomainIdForProject = (proj: Project) => {
        if (!selectedCompanyId) return undefined;
        const company = companies.find(c => c.id === selectedCompanyId);
        if (!company) return undefined;
        for (const sd of company.subDomains) {
            if (sd.projects.some(p => p.id === proj.id)) {
                return sd.id;
            }
        }
        return undefined;
    };
    
    const defaultSubDomainId = initialSubDomainId || (project ? findSubDomainIdForProject(project) : undefined);

    // Example function to add a project to Firestore
    const addProjectToFirestore = async (project) => {
      await addDoc(collection(db, 'projects'), project);
    };

    // Example function to update a project in Firestore
    const updateProjectInFirestore = async (project) => {
      await updateDoc(doc(db, 'projects', project.id), project);
    };

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="companyId" className="block text-sm font-medium text-gray-700">Company</label>
                    <select 
                        id="companyId" 
                        name="companyId" 
                        value={selectedCompanyId || ''}
                        onChange={e => setSelectedCompanyId(e.target.value)}
                        required 
                        disabled={!!initialCompanyId}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm disabled:bg-gray-100"
                    >
                        <option value="">Select Company</option>
                        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                 <div>
                    <label htmlFor="subDomainId" className="block text-sm font-medium text-gray-700">Sub-Domain (Optional)</label>
                    <select 
                        id="subDomainId" 
                        name="subDomainId"
                        defaultValue={defaultSubDomainId || ''}
                        disabled={!!initialSubDomainId || !selectedCompanyId}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm disabled:bg-gray-100"
                    >
                        <option value="">None (Direct Project)</option>
                        {availableSubDomains.map(sd => <option key={sd.id} value={sd.id}>{sd.name}</option>)}
                    </select>
                </div>
                 <div className="md:col-span-2">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Project Name</label>
                    <input type="text" id="name" name="name" defaultValue={project?.name} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"/>
                </div>
                <div>
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location</label>
                    <input type="text" id="location" name="location" defaultValue={project?.location} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"/>
                </div>
                 <div>
                    <label htmlFor="duration" className="block text-sm font-medium text-gray-700">Duration</label>
                    <input type="text" id="duration" name="duration" defaultValue={project?.duration} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"/>
                </div>
                 <div>
                    <label htmlFor="cost" className="block text-sm font-medium text-gray-700">Cost (AED)</label>
                    <input type="number" id="cost" name="cost" defaultValue={project?.cost} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"/>
                </div>
                 <div>
                    <label htmlFor="supervisorId" className="block text-sm font-medium text-gray-700">Supervisor</label>
                    <select id="supervisorId" name="supervisorId" defaultValue={project?.supervisorId} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                        <option value="">Select Supervisor</option>
                        {supervisors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                 <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                    <select id="status" name="status" defaultValue={project?.status || 'Not Started'} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                        <option>Not Started</option>
                        <option>In Progress</option>
                        <option>Completed</option>
                        <option>On Hold</option>
                    </select>
                </div>
                 <div className="md:col-span-2">
                    <label htmlFor="progress" className="block text-sm font-medium text-gray-700">Progress ({progressValue}%)</label>
                    <input type="range" id="progress" name="progress" min="0" max="100" value={progressValue} className="mt-1 block w-full" onChange={e => {
                        setProgressValue(Number(e.target.value));
                    }}/>
                </div>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                <Button type="submit">{project ? 'Update Project' : 'Add Project'}</Button>
            </div>
        </form>
    );
};
