export enum Role {
  ADMIN = 'Admin',
  SUPERVISOR = 'Supervisor',
  EMPLOYEE = 'Employee',
}

// Represents a user account that can log in
export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
}

// Represents an employee of the company (no login)
export interface Employee {
  id: string;
  name: string;
  basicSalary: number;
}


export interface Project {
  id: string;
  name:string;
  location: string;
  duration: string; // e.g., "3 months"
  cost: number;
  supervisorId: string;
  progress: number; // 0-100
  status: 'Not Started' | 'In Progress' | 'Completed' | 'On Hold';
}

export interface SubDomain {
  id: string;
  name: string;
  projects: Project[];
}

export interface Company {
  id: string;
  name: string;
  subDomains: SubDomain[];
  projects: Project[];
}

export enum AttendanceStatus {
    PRESENT = 'Present',
    ABSENT = 'Absent',
    LATE = 'Late Arrival',
    EARLY_DEPARTURE = 'Early Departure',
    HOLIDAY = 'Holiday'
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  clockIn?: string; // HH:mm
  clockOut?: string; // HH:mm
  status: AttendanceStatus;
}

export interface FinancialRecord {
    id: string;
    employeeId: string;
    type: 'Penalty' | 'Advance';
    amount: number;
    date: string; // YYYY-MM-DD
    reason: string;
    deducted: boolean;
}

export interface ActivityLog {
    id: string;
    userId: string;
    userName: string;
    userRole: Role;
    action: string;
    timestamp: Date;
    details: string;
}

export type DataState = {
    users: User[];
    employees: Employee[];
    companies: Company[];
    attendance: AttendanceRecord[];
    financialRecords: FinancialRecord[];
    activityLogs: ActivityLog[];
    companyName: string;
};

export type DataAction =
  | { type: 'SET_DATA'; payload: DataState }
  | { type: 'ADD_USER'; payload: User }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'DELETE_USER'; payload: string } // payload is userId
  | { type: 'ADD_EMPLOYEE'; payload: Employee }
  | { type: 'UPDATE_EMPLOYEE'; payload: Employee }
  | { type: 'DELETE_EMPLOYEE'; payload: string } // payload is employeeId
  | { type: 'ADD_COMPANY'; payload: Company }
  | { type: 'UPDATE_COMPANY'; payload: { id: string, name: string } }
  | { type: 'DELETE_COMPANY'; payload: string } // companyId
  | { type: 'ADD_SUB_DOMAIN'; payload: { companyId: string; subDomain: SubDomain } }
  | { type: 'UPDATE_SUB_DOMAIN'; payload: { companyId: string; subDomain: { id: string; name:string } } }
  | { type: 'DELETE_SUB_DOMAIN'; payload: { companyId: string; subDomainId: string } }
  | { type: 'ADD_PROJECT'; payload: { companyId: string; subDomainId?: string; project: Project } }
  | { type: 'UPDATE_PROJECT'; payload: Project }
  | { type: 'DELETE_PROJECT'; payload: { projectId: string } }
  | { type: 'ADD_FINANCIAL_RECORD'; payload: FinancialRecord }
  | { type: 'UPDATE_FINANCIAL_RECORD'; payload: FinancialRecord }
  | { type: 'DELETE_FINANCIAL_RECORD'; payload: string } // payload is recordId
  | { type: 'UPDATE_ATTENDANCE'; payload: AttendanceRecord }
  | { type: 'LOG_ACTIVITY'; payload: Omit<ActivityLog, 'id' | 'timestamp'> };