import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  name: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  return (
    <nav className="flex mb-4" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-2">
        {items.map((item, index) => (
          <li key={index} className="inline-flex items-center">
            {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400 mx-1" />}
            {item.href ? (
              <Link to={item.href} className="text-sm font-medium text-brand-secondary hover:text-brand-primary">
                {item.name}
              </Link>
            ) : (
              <span className="text-sm font-medium text-gray-500">{item.name}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};
