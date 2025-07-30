import React, { useState, useEffect } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useData, useDataDispatch, useActivityLogger } from '../contexts/DataContext';
import { useNotification } from '../contexts/NotificationContext';
import { usePermissions } from '../hooks/usePermissions';
import { Navigate } from 'react-router-dom';
import { Role } from '../types';
import { db } from '../firebaseConfig';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

// Example function to fetch company profile from Firestore
const fetchCompanyProfileFromFirestore = async (companyId) => {
  const companyDoc = doc(db, 'companies', companyId);
  const companySnapshot = await getDocs(companyDoc);
  return { ...companySnapshot.data(), id: companySnapshot.id };
};

// Example function to update company profile in Firestore
const updateCompanyProfileInFirestore = async (company) => {
  await updateDoc(doc(db, 'companies', company.id), company);
};

export const CompanyProfile: React.FC = () => {
    const { companies } = useData();
    const dispatch = useDataDispatch();
    const { addNotification } = useNotification();
    const logActivity = useActivityLogger();
    const { isRole } = usePermissions();

    // Assuming we edit the first company in the list as the "main" company
    const companyToEdit = companies[0]; 
    const [companyName, setCompanyName] = useState(companyToEdit?.name || '');
    
    useEffect(() => {
        if(companyToEdit) {
            setCompanyName(companyToEdit.name);
        }
    }, [companyToEdit]);

    if (!isRole(Role.ADMIN)) {
        // This is a client-side redirect, good for UX but not a security feature.
        // Real security would be API-level.
        addNotification("You don't have permission to access this page.", 'error');
        return <Navigate to="/" />;
    }
    
    if (!companyToEdit) {
        return <PageWrapper title="Company Profile"><Card>No company data found. Please add a company first.</Card></PageWrapper>;
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        dispatch({
            type: 'UPDATE_COMPANY',
            payload: { id: companyToEdit.id, name: companyName }
        });
        addNotification('Company name updated successfully!', 'success');
        logActivity('Update Company Profile', `Changed company name to "${companyName}"`);
    };

    return (
        <PageWrapper title="Company Profile">
            <Card className="max-w-2xl mx-auto">
                <h2 className="text-xl font-bold text-brand-dark mb-4">Edit Company Information</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                            Company Name
                        </label>
                        <input
                            id="companyName"
                            type="text"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary"
                        />
                    </div>
                    <div className="flex justify-end">
                        <Button type="submit">Save Changes</Button>
                    </div>
                </form>
            </Card>
        </PageWrapper>
    );
};
