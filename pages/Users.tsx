
import React, { useState, useMemo, useEffect } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Table } from '../components/ui/Table';
import { useData, useDataDispatch, useActivityLogger } from '../contexts/DataContext';
import { usePermissions } from '../hooks/usePermissions';
import { useNotification } from '../contexts/NotificationContext';
import { User, Role } from '../types';
import { PlusCircle, Edit, Trash2, Download } from 'lucide-react';
import { exportToExcel, exportToPdf } from '../services/exportService';
import { db } from '../firebaseConfig';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut, signInWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { auth } from '../firebaseConfig';

const UserForm: React.FC<{
    user?: User | null,
    onClose: () => void,
}> = ({ user, onClose }) => {
    const dispatch = useDataDispatch();
    const logActivity = useActivityLogger();
    const { addNotification } = useNotification();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        try {
            const formData = new FormData(e.currentTarget);
            const name = formData.get('name') as string;
            const email = formData.get('email') as string;
            const password = formData.get('password') as string;
            const role = formData.get('role') as Role;

            if (user) { // Editing existing user
                try {
                    // Update in Firestore
                    await updateDoc(doc(db, 'users', user.id), {
                        name,
                        email,
                        role,
                    });
                    
                    logActivity('Update User', `Updated user: ${name}`);
                    addNotification('User updated successfully!', 'success');
                } catch (error) {
                    console.error('Error updating user:', error);
                    addNotification('Error updating user.', 'error');
                }
            } else { // Adding new user
                if (!password) {
                    addNotification('Password is required for new users.', 'error');
                    setIsSubmitting(false);
                    return;
                }

                // Store current admin credentials
                const currentUser = auth.currentUser;
                if (!currentUser) {
                    addNotification('You must be logged in as admin to create users.', 'error');
                    setIsSubmitting(false);
                    return;
                }

                try {
                    // Create user in Firebase Auth
                    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                    const uid = userCredential.user.uid;

                    // Create user document in Firestore
                    await setDoc(doc(db, 'users', uid), {
                        id: uid,
                        name,
                        email,
                        role,
                    });

                    // Immediately sign out and sign back in as admin
                    await signOut(auth);
                    await signInWithEmailAndPassword(auth, 'admin@mail.com', 'admin123');

                    // Don't add to local state - users will be fetched from Firestore
                    logActivity('Add User', `Added new ${role.toLowerCase()}: ${name}`);
                    addNotification(`${role} account for ${name} created successfully!`, 'success');

                } catch (error: any) {
                    console.error('Error creating user:', error);
                    if (error.code === 'auth/email-already-in-use') {
                        addNotification('Email already exists. Please use a different email.', 'error');
                    } else {
                        addNotification('Error creating user. Please try again.', 'error');
                    }
                }
            }
            onClose();
        } catch (error: any) {
            console.error('Error creating user:', error);
            if (error.code === 'auth/email-already-in-use') {
                addNotification('Email already exists. Please use a different email.', 'error');
            } else {
                addNotification('Error creating user. Please try again.', 'error');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
                    <input type="text" id="name" name="name" defaultValue={user?.name} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"/>
                </div>
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                    <input type="email" id="email" name="email" defaultValue={user?.email} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"/>
                </div>
                <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role</label>
                    <select id="role" name="role" defaultValue={user?.role || Role.SUPERVISOR} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                        {Object.values(Role).map(r => (
                            <option key={r} value={r}>{r}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                    <input type="password" id="password" name="password" defaultValue={user?.password} required={!user} placeholder={user ? "Enter new password (optional)" : "Set password"} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"/>
                </div>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating...' : (user ? 'Update User' : 'Add User')}
                </Button>
            </div>
        </form>
    );
};

export const Users: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const { canDelete } = usePermissions();
    const logActivity = useActivityLogger();
    const { addNotification } = useNotification();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [filterText, setFilterText] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // Fetch users from Firestore
    const fetchUsers = async () => {
        try {
            const usersCol = collection(db, 'users');
            const userSnapshot = await getDocs(usersCol);
            const usersData = userSnapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id,
            })) as User[];
            setUsers(usersData);
        } catch (error) {
            console.error('Error fetching users:', error);
            addNotification('Error loading users.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Load users on component mount
    useEffect(() => {
        fetchUsers();
    }, []);

    const handleOpenModal = (user: User | null = null) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
        // Refresh users after modal closes
        fetchUsers();
    };
    
    const handleDeleteUser = async (user: User) => {
        if (user.role === Role.ADMIN) {
            addNotification('Cannot delete an Admin user.', 'error');
            return;
        }
        if(window.confirm(`Are you sure you want to delete user ${user.name}?`)) {
            try {
                // Delete from Firestore
                await deleteDoc(doc(db, 'users', user.id));
                
                // Note: Firebase Auth user deletion requires admin SDK
                // For now, we'll just delete from Firestore and show a note
                logActivity('Delete User', `Deleted user: ${user.name} (ID: ${user.id})`);
                addNotification('User deleted from database. Note: Firebase Auth user needs to be deleted manually from Firebase Console.', 'success');
                
                // Refresh users list
                fetchUsers();
            } catch (error) {
                console.error('Error deleting user:', error);
                addNotification('Error deleting user.', 'error');
            }
        }
    }

    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            const textMatch = user.name.toLowerCase().includes(filterText.toLowerCase()) || user.email.toLowerCase().includes(filterText.toLowerCase());
            const roleMatch = filterRole ? user.role === filterRole : true;
            return textMatch && roleMatch;
        });
    }, [users, filterText, filterRole]);

    const handleExportPDF = () => {
        const headers = [['Name', 'Email', 'Role']];
        const body = filteredUsers.map(u => [u.name, u.email, u.role]);
        exportToPdf('User List', headers, body, 'users_list');
        logActivity('Export PDF', 'Exported user list.');
    };

    const handleExportExcel = () => {
        const data = filteredUsers.map(u => ({ Name: u.name, Email: u.email, Role: u.role }));
        exportToExcel(data, 'users_list', 'Users');
        logActivity('Export Excel', 'Exported user list.');
    };

    const columns = [
        { header: 'Name', accessor: 'name' as const },
        { header: 'Email', accessor: 'email' as const },
        { header: 'Role', accessor: 'role' as const },
        {
            header: 'Actions',
            accessor: (item: User) => (
                <div className="flex space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenModal(item)}>
                        <Edit size={16} />
                    </Button>
                    {canDelete() && (
                         <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDeleteUser(item)}>
                            <Trash2 size={16} />
                        </Button>
                    )}
                </div>
            )
        },
    ];

    const availableRoles = Object.values(Role);

    return (
        <PageWrapper title="User Management" actions={
            <Button onClick={() => handleOpenModal()}><PlusCircle className="mr-2" size={16}/>Add User</Button>
        }>
            <Card>
                <div className="flex flex-wrap gap-4 items-center mb-4">
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={filterText}
                        onChange={e => setFilterText(e.target.value)}
                        className="p-2 border border-gray-300 rounded-md w-full md:w-1/3 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:border-brand-secondary"
                    />
                    <select
                        value={filterRole}
                        onChange={e => setFilterRole(e.target.value)}
                        className="p-2 border border-gray-300 rounded-md bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:border-brand-secondary"
                    >
                        <option value="">All Roles</option>
                        {availableRoles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <div className="ml-auto flex space-x-2">
                        <Button onClick={handleExportPDF} variant="ghost" size="sm"><Download className="mr-1" size={16}/> PDF</Button>
                        <Button onClick={handleExportExcel} variant="ghost" size="sm"><Download className="mr-1" size={16}/> Excel</Button>
                    </div>
                </div>
                <Table columns={columns} data={filteredUsers} />
            </Card>
            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingUser ? 'Edit User' : 'Add New User'}>
                <UserForm user={editingUser} onClose={handleCloseModal} />
            </Modal>
        </PageWrapper>
    );
};
