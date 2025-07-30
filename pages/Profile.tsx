
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDataDispatch, useActivityLogger } from '../contexts/DataContext';
import { useNotification } from '../contexts/NotificationContext';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { UserCircle } from 'lucide-react';

export const Profile: React.FC = () => {
  const { user } = useAuth();
  const dispatch = useDataDispatch();
  const { addNotification } = useNotification();
  const logActivity = useActivityLogger();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  if (!user) {
    return <PageWrapper title="Profile">Loading...</PageWrapper>;
  }

  const handlePasswordChange = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      addNotification('New passwords do not match.', 'error');
      return;
    }
    if (user.password !== currentPassword) {
      addNotification('Current password is incorrect.', 'error');
      return;
    }
    
    const updatedUser = { ...user, password: newPassword };
    dispatch({ type: 'UPDATE_USER', payload: updatedUser });
    logActivity('Update Profile', 'User changed their own password.');
    addNotification('Password updated successfully!', 'success');
    
    // Reset form
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <PageWrapper title="My Profile">
      <Card className="max-w-2xl mx-auto mb-6">
        <div className="flex flex-col items-center md:flex-row md:items-start md:space-x-8">
            <div className="p-4 bg-brand-light rounded-full mb-4 md:mb-0">
                <UserCircle size={80} className="text-brand-primary" />
            </div>
            <div className="text-center md:text-left">
                <h2 className="text-3xl font-bold text-brand-dark">{user.name}</h2>
                <p className="text-brand-secondary font-semibold">{user.role}</p>
                <p className="text-gray-500 mt-1">{user.email}</p>
            </div>
        </div>
      </Card>
      
      <Card className="max-w-2xl mx-auto">
        <h3 className="text-xl font-bold text-brand-dark mb-4">Change Password</h3>
        <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label htmlFor="currentPassword"className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary"
              />
            </div>
             <div>
              <label htmlFor="newPassword"className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary"
              />
            </div>
             <div>
              <label htmlFor="confirmPassword"className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary"
              />
            </div>
            <div className="flex justify-end">
                <Button type="submit">Update Password</Button>
            </div>
        </form>
      </Card>
    </PageWrapper>
  );
};