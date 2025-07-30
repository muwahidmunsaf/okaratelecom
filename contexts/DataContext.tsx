import React, { createContext, useReducer, useContext, ReactNode, Dispatch, useEffect } from 'react';
import { DataState, DataAction, ActivityLog, Role, Project, FinancialRecord, Employee } from '../types';
import { initialData } from '../services/mockApi';
import { db } from '../firebaseConfig';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

const DataContext = createContext<DataState | undefined>(undefined);
const DataDispatchContext = createContext<Dispatch<DataAction> | undefined>(undefined);

const dataReducer = (state: DataState, action: DataAction): DataState => {
  switch (action.type) {
    case 'SET_DATA':
      return action.payload;
    case 'LOG_ACTIVITY': {
        const newLog: ActivityLog = {
            id: `log_${Date.now()}`,
            timestamp: new Date(),
            ...action.payload
        };
        return { ...state, activityLogs: [newLog, ...state.activityLogs] };
    }
    // User (Login Account) Management
    case 'ADD_USER':
        return { ...state, users: [...state.users, action.payload] };
    case 'UPDATE_USER':
        return { 
            ...state, 
            users: state.users.map(u => u.id === action.payload.id ? action.payload : u) 
        };
    case 'DELETE_USER':
        return { ...state, users: state.users.filter(u => u.id !== action.payload) };

    // Employee (Record) Management
    case 'ADD_EMPLOYEE':
        return { ...state, employees: [...state.employees, action.payload] };
    case 'UPDATE_EMPLOYEE':
        return { 
            ...state, 
            employees: state.employees.map(e => e.id === action.payload.id ? action.payload : e) 
        };
    case 'DELETE_EMPLOYEE':
        return { ...state, employees: state.employees.filter(e => e.id !== action.payload) };

    case 'ADD_COMPANY':
        return { ...state, companies: [...state.companies, action.payload] };
    case 'UPDATE_COMPANY':
        return {
            ...state,
            companies: state.companies.map(c => 
                c.id === action.payload.id ? { ...c, name: action.payload.name } : c
            ),
            companyName: action.payload.id === state.companies[0].id ? action.payload.name : state.companyName
        };
    case 'DELETE_COMPANY':
        return { ...state, companies: state.companies.filter(c => c.id !== action.payload) };

    case 'ADD_SUB_DOMAIN': {
        const { companyId, subDomain } = action.payload;
        return {
            ...state,
            companies: state.companies.map(c => {
                if (c.id === companyId) {
                    return { ...c, subDomains: [...c.subDomains, subDomain] };
                }
                return c;
            })
        };
    }
    case 'UPDATE_SUB_DOMAIN': {
        const { companyId, subDomain: updatedSubDomain } = action.payload;
        return {
            ...state,
            companies: state.companies.map(c => {
                if (c.id === companyId) {
                    return {
                        ...c,
                        subDomains: c.subDomains.map(sd =>
                            sd.id === updatedSubDomain.id ? { ...sd, name: updatedSubDomain.name } : sd
                        )
                    };
                }
                return c;
            })
        };
    }
    case 'DELETE_SUB_DOMAIN': {
        const { companyId, subDomainId } = action.payload;
        return {
            ...state,
            companies: state.companies.map(c => {
                if (c.id === companyId) {
                    return { ...c, subDomains: c.subDomains.filter(sd => sd.id !== subDomainId) };
                }
                return c;
            })
        };
    }

    case 'ADD_PROJECT': {
        const { companyId, subDomainId, project } = action.payload;
        const newCompanies = JSON.parse(JSON.stringify(state.companies));
        const company = newCompanies.find(c => c.id === companyId);
        if (company) {
            if (subDomainId) {
                const subDomain = company.subDomains.find(sd => sd.id === subDomainId);
                if (subDomain) {
                    subDomain.projects.push(project);
                }
            } else {
                company.projects.push(project);
            }
        }
        return { ...state, companies: newCompanies };
    }
    case 'UPDATE_PROJECT': {
        const updatedProject = action.payload;
        const newCompanies = JSON.parse(JSON.stringify(state.companies));
        for (const company of newCompanies) {
            let projIndex = company.projects.findIndex(p => p.id === updatedProject.id);
            if (projIndex !== -1) {
                company.projects[projIndex] = updatedProject;
                return { ...state, companies: newCompanies };
            }
            for (const sd of company.subDomains) {
                projIndex = sd.projects.findIndex(p => p.id === updatedProject.id);
                if (projIndex !== -1) {
                    sd.projects[projIndex] = updatedProject;
                    return { ...state, companies: newCompanies };
                }
            }
        }
        return state;
    }
    case 'DELETE_PROJECT': {
        const { projectId } = action.payload;
        const newCompanies = JSON.parse(JSON.stringify(state.companies));
        for (const company of newCompanies) {
            const projIndexDirect = company.projects.findIndex(p => p.id === projectId);
            if (projIndexDirect !== -1) {
                company.projects.splice(projIndexDirect, 1);
                return { ...state, companies: newCompanies };
            }
            for (const sd of company.subDomains) {
                const projIndexSub = sd.projects.findIndex(p => p.id === projectId);
                if (projIndexSub !== -1) {
                    sd.projects.splice(projIndexSub, 1);
                    return { ...state, companies: newCompanies };
                }
            }
        }
        return state;
    }
    case 'ADD_FINANCIAL_RECORD': {
        return { ...state, financialRecords: [...state.financialRecords, action.payload] };
    }
    case 'UPDATE_FINANCIAL_RECORD': {
         return {
            ...state,
            financialRecords: state.financialRecords.map(r => r.id === action.payload.id ? action.payload : r)
        };
    }
    case 'DELETE_FINANCIAL_RECORD': {
        return {
            ...state,
            financialRecords: state.financialRecords.filter(r => r.id !== action.payload)
        };
    }
    case 'UPDATE_ATTENDANCE': {
        const updatedRecord = action.payload;
        const recordExists = state.attendance.some(rec => rec.id === updatedRecord.id);
        const newAttendance = recordExists
            ? state.attendance.map(rec => rec.id === updatedRecord.id ? updatedRecord : rec)
            : [...state.attendance, updatedRecord];
        return { ...state, attendance: newAttendance };
    }
    default:
      return state;
  }
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(dataReducer, initialData);

  // Fetch users from Firestore on mount
  useEffect(() => {
    const fetchUsers = async () => {
      const usersCol = collection(db, 'users');
      const userSnapshot = await getDocs(usersCol);
      const users = userSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      dispatch({ type: 'SET_DATA', payload: { ...state, users } });
    };
    fetchUsers();
  }, []);

  // Intercept add/update/delete user actions to sync with Firestore
  const enhancedDispatch = async (action: DataAction) => {
    switch (action.type) {
      case 'ADD_USER':
        await addDoc(collection(db, 'users'), action.payload);
        break;
      case 'UPDATE_USER':
        await updateDoc(doc(db, 'users', action.payload.id), action.payload);
        break;
      case 'DELETE_USER':
        await deleteDoc(doc(db, 'users', action.payload));
        break;
      default:
        break;
    }
    dispatch(action);
  };

  return (
    <DataContext.Provider value={state}>
      <DataDispatchContext.Provider value={enhancedDispatch as any}>
        {children}
      </DataDispatchContext.Provider>
    </DataContext.Provider>
  );
};

export const useData = (): DataState => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const useDataDispatch = (): Dispatch<DataAction> => {
  const context = useContext(DataDispatchContext);
  if (context === undefined) {
    throw new Error('useDataDispatch must be used within a DataProvider');
  }
  return context;
};

export const useActivityLogger = () => {
    const dispatch = useDataDispatch();
    const { user } = useAuth();

    return (action: string, details: string) => {
        if(user) {
            dispatch({ type: 'LOG_ACTIVITY', payload: { userId: user.id, userName: user.name, userRole: user.role, action, details } });
        }
    };
};

import { useAuth } from './AuthContext';