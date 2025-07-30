import React from 'react';
import { Project, User } from '../../types';
import { Table } from '../ui/Table';
import { Button } from '../ui/Button';
import { Edit, Trash2, Bot } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import { useData } from '../../contexts/DataContext';
import { db } from '../../firebaseConfig';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

interface ProjectTableProps {
    projects: Project[];
    onEdit: (project: Project) => void;
    onDelete: (project: Project) => void;
    onGenerateSummary: (project: Project) => void;
}

export const ProjectTable: React.FC<ProjectTableProps> = ({ projects, onEdit, onDelete, onGenerateSummary }) => {
    const { canEdit, canDelete } = usePermissions();
    const { users } = useData();

    const columns = [
        { header: 'Project Name', accessor: 'name' as const },
        { header: 'Status', accessor: (p: Project) => (
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ p.status === 'Completed' ? 'bg-green-100 text-green-800' : p.status === 'In Progress' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800' }`}>{p.status}</span>
        ) },
        { header: 'Progress', accessor: (p: Project) => `${p.progress}%` },
        { header: 'Supervisor', accessor: (p: Project) => users.find(u => u.id === p.supervisorId)?.name || 'N/A' },
        { header: 'Actions', accessor: (p: Project) => (
            <div className="flex space-x-1">
                 <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onGenerateSummary(p);}} title="AI Summary"><Bot size={16}/></Button>
                {canEdit() && <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(p);}} title="Edit"><Edit size={16}/></Button>}
                {canDelete() && <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={(e) => { e.stopPropagation(); onDelete(p);}} title="Delete"><Trash2 size={16}/></Button>}
            </div>
        ) }
    ];

    if (!projects) return <div>Loading projects...</div>

    return <Table columns={columns} data={projects} />;
};