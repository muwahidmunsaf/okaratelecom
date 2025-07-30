import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types';

export const usePermissions = () => {
    const { user } = useAuth();

    if (!user) {
        return {
            canView: () => false,
            canEdit: () => false,
            canDelete: () => false,
            isRole: () => false,
            userRole: null,
        };
    }
    
    const userRole = user.role;

    const permissions = {
        [Role.ADMIN]: { view: true, edit: true, delete: true },
        [Role.SUPERVISOR]: { view: true, edit: true, delete: false },
        [Role.EMPLOYEE]: { view: true, edit: false, delete: false },
    };

    const canView = () => permissions[userRole].view;
    const canEdit = () => permissions[userRole].edit;
    const canDelete = () => permissions[userRole].delete;
    const isRole = (role: Role | Role[]) => Array.isArray(role) ? role.includes(userRole) : userRole === role;

    return { canView, canEdit, canDelete, isRole, userRole };
};