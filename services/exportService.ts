import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Company } from '../types';

export const exportToPdf = (title: string, headers: string[][], body: (string|number)[][], fileName:string) => {
  const doc = new jsPDF();
  doc.text(title, 14, 15);
  autoTable(doc, {
    head: headers,
    body: body,
    startY: 20,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [0, 51, 102] }, // brand-primary
  });
  doc.save(`${fileName}.pdf`);
};

export const exportToExcel = (data: any[], fileName: string, sheetName: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

export const exportCompanyReportExcel = (company: Company, fileName: string) => {
    const wb = XLSX.utils.book_new();

    // Direct projects
    if (company.projects.length > 0) {
        const wsData = company.projects.map(p => ({
            'Project Name': p.name,
            'Location': p.location,
            'Duration': p.duration,
            'Cost (AED)': p.cost,
            'Progress (%)': p.progress,
            'Status': p.status,
            'Supervisor ID': p.supervisorId,
        }));
        const ws = XLSX.utils.json_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, 'Direct Projects');
    }

    // Sub-domain projects
    company.subDomains.forEach(sd => {
        if (sd.projects.length > 0) {
            const wsData = sd.projects.map(p => ({
                'Project Name': p.name,
                'Location': p.location,
                'Duration': p.duration,
                'Cost (AED)': p.cost,
                'Progress (%)': p.progress,
                'Status': p.status,
                'Supervisor ID': p.supervisorId,
            }));
            const ws = XLSX.utils.json_to_sheet(wsData);
            const sheetName = sd.name.replace(/[\[\]*?\/\\:]/g, "").substring(0, 31);
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        }
    });
    
    if (wb.SheetNames.length > 0) {
        XLSX.writeFile(wb, `${fileName}.xlsx`);
    } else {
        alert("No project data to export for this company.");
    }
};