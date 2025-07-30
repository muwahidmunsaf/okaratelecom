
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { useData, useActivityLogger } from '../contexts/DataContext';
import { Button } from '../components/ui/Button';
import { exportCompanyReportExcel } from '../services/exportService';
import { Download, ChevronsRight } from 'lucide-react';
import { Company } from '../types';
import { db } from '../firebaseConfig';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

export const Companies: React.FC = () => {
    const { companies } = useData();
    const navigate = useNavigate();
    const logActivity = useActivityLogger();
    const [searchText, setSearchText] = useState('');

    const filteredCompanies = useMemo(() =>
        companies.filter(company =>
            company.name.toLowerCase().includes(searchText.toLowerCase())
        ),
        [companies, searchText]
    );

    const handleExport = (company: Company) => {
        const reportName = `${company.name.replace(/ /g, '_')}_report`;
        exportCompanyReportExcel(company, reportName);
        logActivity('Export Excel', `Exported full report for company: ${company.name}`);
    }

    // Example function to fetch projects from Firestore
    const fetchProjectsFromFirestore = async () => {
      const projectsCol = collection(db, 'projects');
      const projectSnapshot = await getDocs(projectsCol);
      return projectSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    };

    // Example function to add a project to Firestore
    const addProjectToFirestore = async (project) => {
      await addDoc(collection(db, 'projects'), project);
    };

    // Example function to update a project in Firestore
    const updateProjectInFirestore = async (project) => {
      await updateDoc(doc(db, 'projects', project.id), project);
    };

    // Example function to delete a project from Firestore
    const deleteProjectFromFirestore = async (projectId) => {
      await deleteDoc(doc(db, 'projects', projectId));
    };

    return (
        <PageWrapper title="Companies">
            <div className="mb-6">
                <input
                    type="text"
                    placeholder="Search companies..."
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    className="p-2 border border-gray-300 rounded-md w-full md:w-1/3 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:border-brand-secondary"
                />
            </div>

            {filteredCompanies.length > 0 ? (
                filteredCompanies.map(company => (
                    <Card key={company.id} className="mb-6 hover:shadow-lg transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-xl font-bold text-brand-dark">{company.name}</h2>
                                <p className="text-sm text-gray-500">
                                    {company.subDomains.length} Sub-Domains, {company.projects.length} Direct Projects
                                </p>
                            </div>
                             <div className="flex items-center space-x-2">
                                 <Button variant="ghost" size="sm" onClick={() => handleExport(company)}>
                                    <Download className="mr-2" size={16}/> Export Full Report
                                </Button>
                                 <Button size="sm" onClick={() => navigate(`/companies/${company.id}`)}>
                                    View Details <ChevronsRight className="ml-2" size={16}/>
                                </Button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-500">Total Projects</p>
                                <p className="text-2xl font-bold text-brand-primary">{company.projects.length + company.subDomains.reduce((acc, sd) => acc + sd.projects.length, 0)}</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-500">Completed</p>
                                <p className="text-2xl font-bold text-green-600">{
                                    [...company.projects, ...company.subDomains.flatMap(sd => sd.projects)].filter(p => p.status === 'Completed').length
                                }</p>
                            </div>
                             <div className="p-4 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-500">In Progress</p>
                                <p className="text-2xl font-bold text-blue-600">{
                                     [...company.projects, ...company.subDomains.flatMap(sd => sd.projects)].filter(p => p.status === 'In Progress').length
                                }</p>
                            </div>
                        </div>
                    </Card>
                ))
            ) : (
                <Card>
                    <p>No companies found matching your search.</p>
                </Card>
            )}
        </PageWrapper>
    );
};
