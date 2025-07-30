
import React from 'react';

interface PageWrapperProps {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export const PageWrapper: React.FC<PageWrapperProps> = ({ title, children, actions }) => {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-brand-dark">{title}</h1>
        {actions && <div className="flex items-center space-x-2">{actions}</div>}
      </div>
      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
};
