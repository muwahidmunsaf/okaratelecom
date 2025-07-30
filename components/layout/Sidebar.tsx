
import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { useData } from '../../contexts/DataContext';
import { navLinks, bottomNavLinks } from '../../constants';
import { Role } from '../../types';
import { db } from '../../firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';

// Example function to fetch companies from Firestore
const fetchCompaniesFromFirestore = async () => {
  const companiesCol = collection(db, 'companies');
  const companySnapshot = await getDocs(companiesCol);
  return companySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
};

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const { isRole } = usePermissions();
  const { companyName } = useData();
  const location = useLocation();

  console.log('Sidebar - user:', user); // Debug log
  console.log('Sidebar - user role:', user?.role); // Debug log

  if (!user) {
    console.log('Sidebar - no user, returning null'); // Debug log
    return null;
  }

  const renderLink = (link: { name: string; href: string; icon: React.ElementType; roles: Role[] }) => {
      const Icon = link.icon;
      const isActive = location.pathname === link.href;
      const hasRole = isRole(link.roles);
      
      console.log(`Sidebar - link ${link.name}, roles:`, link.roles, 'hasRole:', hasRole); // Debug log
      
      return (
        <Link
          key={link.name}
          to={link.href}
          onClick={link.name === 'Logout' ? logout : undefined}
          className={`flex items-center p-3 my-1 rounded-lg text-white/80 hover:bg-brand-secondary/80 hover:text-white transition-colors duration-200 ${
            isActive ? 'bg-brand-secondary' : ''
          }`}
        >
          <Icon className="w-5 h-5 mr-3" />
          <span className="font-medium">{link.name}</span>
        </Link>
      );
  }

  const filteredNavLinks = navLinks.filter(link => isRole(link.roles));
  const filteredBottomLinks = bottomNavLinks.filter(link => isRole(link.roles));
  
  console.log('Sidebar - filtered nav links:', filteredNavLinks.length); // Debug log
  console.log('Sidebar - filtered bottom links:', filteredBottomLinks.length); // Debug log

  return (
    <aside className="w-64 bg-brand-primary text-white flex flex-col h-screen fixed">
      <div className="p-6 text-center border-b border-white/20">
        <h1 className="text-2xl font-bold">{companyName}</h1>
        <p className="text-sm text-white/70">Pro Suite</p>
      </div>
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul>
          {filteredNavLinks.map(renderLink)}
        </ul>
      </nav>
      <div className="p-4 border-t border-white/20">
        {filteredBottomLinks.map(renderLink)}
      </div>
    </aside>
  );
};
