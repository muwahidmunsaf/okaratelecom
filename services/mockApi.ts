import { Role, User, Company, AttendanceRecord, FinancialRecord, DataState, AttendanceStatus, Employee } from '../types';

export const mockUsers: User[] = [
    { id: 'user_1', name: 'Admin User', email: 'admin@mail.com', password: 'admin123', role: Role.ADMIN },
    { id: 'user_3', name: 'Hassan Ali', email: 'hassan.ali@inteltech.ae', password: 'password123', role: Role.SUPERVISOR },
    { id: 'user_6', name: 'Aisha Noor', email: 'aisha.noor@inteltech.ae', password: 'password123', role: Role.SUPERVISOR },
];

export const mockEmployees: Employee[] = [
    { id: 'emp_1', name: 'Karim Ahmed', basicSalary: 25000 },
    { id: 'emp_2', name: 'Fatima Al-Jaber', basicSalary: 18000 },
    { id: 'emp_3', name: 'Yusuf Khan', basicSalary: 15000 },
    { id: 'emp_4', name: 'Layla Mohamed', basicSalary: 8000 },
    { id: 'emp_5', name: 'Omar Abdullah', basicSalary: 8500 },
    { id: 'emp_6', name: 'Sana Khalid', basicSalary: 16000 },
    { id: 'emp_7', name: 'Ali Raza', basicSalary: 12000 },
    // Add supervisors to employee list as well for consistency
    { id: 'user_3', name: 'Hassan Ali', basicSalary: 30000 },
    { id: 'user_6', name: 'Aisha Noor', basicSalary: 32000 },
];


export const mockCompanies: Company[] = [
    {
        id: 'comp_1',
        name: 'Inteltech UAE (Client Contracts)',
        projects: [],
        subDomains: [
            {
                id: 'sd_1',
                name: 'DU Telecom',
                projects: [
                    { id: 'proj_1', name: '5G Tower Rollout - Phase 1', location: 'Dubai Marina', duration: '6 months', cost: 5000000, supervisorId: 'user_3', progress: 75, status: 'In Progress' },
                    { id: 'proj_2', name: 'Fiber Optic Network Upgrade', location: 'Abu Dhabi', duration: '1 year', cost: 12000000, supervisorId: 'user_6', progress: 40, status: 'In Progress' },
                ],
            },
            {
                id: 'sd_2',
                name: 'Etisalat E&',
                projects: [
                    { id: 'proj_3', name: 'Data Center Maintenance', location: 'Sharjah', duration: '3 months', cost: 2500000, supervisorId: 'user_3', progress: 100, status: 'Completed' },
                    { id: 'proj_4', name: 'Customer Service Platform', location: 'Remote', duration: '4 months', cost: 1800000, supervisorId: 'user_6', progress: 15, status: 'On Hold' },
                ]
            }
        ]
    },
    {
        id: 'comp_2',
        name: 'Internal Inteltech Projects',
        subDomains: [],
        projects: [
            { id: 'proj_5', name: 'New HR Portal Development', location: 'Internal', duration: '2 months', cost: 350000, supervisorId: 'user_6', progress: 90, status: 'In Progress' }
        ]
    }
];

const today = new Date().toISOString().split('T')[0];

export const mockAttendance: AttendanceRecord[] = [
    { id: `att_emp_3_${today}`, employeeId: 'emp_3', date: today, clockIn: '08:55', clockOut: '17:05', status: AttendanceStatus.PRESENT },
    { id: `att_emp_4_${today}`, employeeId: 'emp_4', date: today, clockIn: '09:15', status: AttendanceStatus.LATE, clockOut: undefined },
];

export const mockFinancials: FinancialRecord[] = [
    { id: 'fin_1', employeeId: 'emp_4', type: 'Advance', amount: 200, date: '2023-10-05', reason: 'Emergency medical expense', deducted: false },
    { id: 'fin_2', employeeId: 'emp_5', type: 'Penalty', amount: 150, date: '2023-10-10', reason: 'Late arrival (3 instances)', deducted: false },
];

export const initialData: DataState = {
    users: mockUsers,
    employees: mockEmployees,
    companies: mockCompanies,
    attendance: mockAttendance,
    financialRecords: mockFinancials,
    companyName: mockCompanies[0]?.name || 'Inteltech',
    activityLogs: [{
        id: 'log_init',
        userId: 'system',
        userName: 'System',
        userRole: Role.ADMIN,
        action: 'System Start',
        timestamp: new Date(),
        details: 'Initial data loaded into the application.',
    }],
};