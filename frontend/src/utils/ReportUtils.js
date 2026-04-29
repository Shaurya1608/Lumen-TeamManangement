import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const COLORS = {
  primary: [59, 130, 246], // brand-blue
  secondary: [139, 92, 246], // brand-purple
  dark: [3, 3, 5],
  success: [16, 185, 129],
  danger: [244, 63, 94],
  textMain: [30, 41, 59],
  textLight: [100, 116, 139]
};

const setPrimaryColor = (doc) => doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
const setDarkColor = (doc) => doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
const setTextLight = (doc) => doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2]);

/**
 * Generate a professional single transaction invoice
 */
export const generateSingleInvoice = (client, transaction) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFillColor(3, 3, 5); 
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.text('LUMEN', 20, 25);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('PREMIUM BUSINESS FLOW • FINANCIAL STATEMENT', 20, 32);
  
  // Right side header info
  doc.setFontSize(9);
  doc.text('INVOICE NO:', 150, 18);
  doc.setFont('helvetica', 'bold');
  doc.text(`INV-${transaction._id?.substring(0, 8).toUpperCase()}`, 175, 18);
  
  doc.setFont('helvetica', 'normal');
  doc.text('DATE:', 150, 25);
  doc.setFont('helvetica', 'bold');
  doc.text(new Date(transaction.date).toLocaleDateString('en-GB'), 175, 25);

  // Client Details Section
  setTextLight(doc);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO:', 20, 55);
  
  setDarkColor(doc);
  doc.setFontSize(14);
  doc.text(client.name || 'Client', 20, 63);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  if (client.company) {
    doc.text(client.company, 20, 70);
  }
  if (client.email) {
    doc.text(client.email, 20, client.company ? 76 : 70);
  }

  // Invoice Summary Box
  doc.setFillColor(248, 250, 252);
  doc.rect(130, 50, 60, 25, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(130, 50, 60, 25, 'S');
  
  setTextLight(doc);
  doc.setFontSize(9);
  doc.text('AMOUNT RECEIVED', 135, 58);
  doc.setTextColor(16, 185, 129); // success
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`INR ${transaction.amount.toLocaleString('en-IN')}`, 135, 68);

  // Table
  const tableData = [[
    transaction.title,
    transaction.project?.name || 'General Service',
    transaction.type.toUpperCase(),
    `INR ${transaction.amount.toLocaleString('en-IN')}`
  ]];
  
  autoTable(doc, {
    startY: 90,
    head: [['Description', 'Project', 'Type', 'Amount']],
    body: tableData,
    theme: 'grid',
    headStyles: { 
      fillColor: [59, 130, 246],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    styles: {
      font: 'helvetica',
      fontSize: 10,
      cellPadding: 6
    },
    columnStyles: {
      3: { halign: 'right', fontStyle: 'bold' }
    }
  });
  
  // Footer / Total
  const finalY = doc.previousAutoTable.finalY;
  
  doc.setFontSize(10);
  setTextLight(doc);
  doc.text('Subtotal:', 140, finalY + 15);
  setDarkColor(doc);
  doc.text(`INR ${transaction.amount.toLocaleString('en-IN')}`, 190, finalY + 15, { align: 'right' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Total Paid:', 140, finalY + 25);
  doc.setTextColor(16, 185, 129);
  doc.text(`INR ${transaction.amount.toLocaleString('en-IN')}`, 190, finalY + 25, { align: 'right' });
  
  // Note
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.5);
  doc.line(20, finalY + 40, 40, finalY + 40);
  
  setDarkColor(doc);
  doc.setFontSize(10);
  doc.text('Thank you for your business.', 20, finalY + 50);
  doc.setFontSize(8);
  setTextLight(doc);
  doc.text('This is a computer-generated document and does not require a physical signature.', 20, finalY + 56);
  
  doc.save(`Invoice_${transaction.title.replace(/\s+/g, '_')}.pdf`);
};

/**
 * Generate a full statement of account for a client
 */
export const generateFullStatement = (client, transactions, projects) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFillColor(3, 3, 5); 
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(26);
  doc.text('LUMEN', 20, 25);
  doc.setFontSize(10);
  doc.text('FULL STATEMENT OF ACCOUNT', 20, 32);
  
  doc.setFontSize(9);
  doc.text('STATEMENT DATE:', 150, 25);
  doc.text(new Date().toLocaleDateString('en-GB'), 185, 25);

  // Client Info
  setTextLight(doc);
  doc.setFontSize(10);
  doc.text('CLIENT:', 20, 55);
  setDarkColor(doc);
  doc.setFontSize(14);
  doc.text(client.name || 'Client', 20, 63);
  if (client.company) doc.text(client.company, 20, 70);

  // Summary Metrics
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalProjValue = projects.reduce((s, p) => s + (p.dealValue || 0), 0);
  const totalDealValue = totalProjValue > 0 ? totalProjValue : (client.dealValue || 0);
  const balance = Math.max(totalDealValue - totalIncome, 0);

  // Summary Boxes
  const startX = 20;
  const boxW = 42;
  const boxes = [
    { label: 'TOTAL DEAL', value: totalDealValue, color: [59, 130, 246] },
    { label: 'TOTAL PAID', value: totalIncome, color: [16, 185, 129] },
    { label: 'EXPENSES', value: totalExpense, color: [244, 63, 94] },
    { label: 'BALANCE DUE', value: balance, color: [245, 158, 11] }
  ];

  boxes.forEach((box, i) => {
    const x = startX + (i * (boxW + 3));
    doc.setFillColor(250, 250, 250);
    doc.rect(x, 80, boxW, 20, 'F');
    doc.setDrawColor(230, 230, 230);
    doc.rect(x, 80, boxW, 20, 'S');
    
    setTextLight(doc);
    doc.setFontSize(7);
    doc.text(box.label, x + 5, 86);
    
    doc.setTextColor(box.color[0], box.color[1], box.color[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`INR ${box.value.toLocaleString('en-IN')}`, x + 5, 94);
  });

  // Projects
  setDarkColor(doc);
  doc.setFontSize(12);
  doc.text('PROJECTS OVERVIEW', 20, 115);
  
  const projectTableData = projects.map(p => [
    p.name,
    p.status.toUpperCase(),
    p.deadline ? new Date(p.deadline).toLocaleDateString('en-GB') : 'N/A',
    `INR ${p.dealValue?.toLocaleString('en-IN') || 0}`
  ]);

  autoTable(doc, {
    startY: 120,
    head: [['Project Name', 'Status', 'Deadline', 'Value']],
    body: projectTableData,
    theme: 'striped',
    headStyles: { fillColor: [139, 92, 246] },
    styles: { fontSize: 9 },
    margin: { left: 20, right: 20 }
  });

  // Transactions
  const nextY = doc.previousAutoTable.finalY + 15;
  setDarkColor(doc);
  doc.setFontSize(12);
  doc.text('TRANSACTION HISTORY', 20, nextY);

  const txTableData = transactions.sort((a,b) => new Date(b.date) - new Date(a.date)).map(t => [
    new Date(t.date).toLocaleDateString('en-GB'),
    t.title,
    t.project?.name || 'General',
    t.type === 'income' ? `+ ${t.amount.toLocaleString('en-IN')}` : `- ${t.amount.toLocaleString('en-IN')}`
  ]);

  autoTable(doc, {
    startY: nextY + 5,
    head: [['Date', 'Description', 'Project', 'Amount (INR)']],
    body: txTableData,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 8 },
    columnStyles: {
      3: { halign: 'right' }
    }
  });

  doc.setFontSize(10);
  setTextLight(doc);
  doc.text('Generated by Lumen Business Dashboard', 105, 285, { align: 'center' });

  doc.save(`Statement_${(client.name || 'Client').replace(/\s+/g, '_')}.pdf`);
};

/**
 * Generate a Monthly Business Report from Dashboard
 */
export const generateMonthlyReport = (stats, recentTransactions) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFillColor(3, 3, 5); 
  doc.rect(0, 0, 210, 50, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.text('LUMEN', 20, 30);
  doc.setFontSize(12);
  doc.text('MONTHLY BUSINESS PERFORMANCE REPORT', 20, 40);
  
  const month = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  doc.text(month.toUpperCase(), 190, 40, { align: 'right' });

  // Key Metrics
  setDarkColor(doc);
  doc.setFontSize(14);
  doc.text('EXECUTIVE SUMMARY', 20, 70);
  
  const metrics = [
    { label: 'NET PROFIT', value: `INR ${stats.netProfit.toLocaleString('en-IN')}`, sub: `${stats.income.toLocaleString('en-IN')} Revenue`, color: [16, 185, 129] },
    { label: 'ACTIVE PROJECTS', value: stats.activeClients.toString(), sub: 'In Pipeline', color: [59, 130, 246] },
    { label: 'COMPLETION', value: `${stats.completionRate}%`, sub: 'Efficiency', color: [245, 158, 11] }
  ];

  metrics.forEach((m, i) => {
    const x = 20 + (i * 62);
    doc.setFillColor(248, 250, 252);
    doc.rect(x, 75, 58, 30, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(x, 75, 58, 30, 'S');
    
    setTextLight(doc);
    doc.setFontSize(8);
    doc.text(m.label, x + 5, 82);
    
    doc.setTextColor(m.color[0], m.color[1], m.color[2]);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(m.value, x + 5, 93);
    
    setTextLight(doc);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(m.sub, x + 5, 100);
  });

  // Recent Activity
  setDarkColor(doc);
  doc.setFontSize(14);
  doc.text('RECENT FINANCIAL ACTIVITY', 20, 125);

  const tableData = (recentTransactions || []).slice(0, 15).map(t => [
    new Date(t.date).toLocaleDateString('en-GB'),
    t.client?.name || 'N/A',
    t.title,
    t.type === 'income' ? `+ ${t.amount.toLocaleString('en-IN')}` : `- ${t.amount.toLocaleString('en-IN')}`
  ]);

  autoTable(doc, {
    startY: 130,
    head: [['Date', 'Client', 'Description', 'Amount']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 9 }
  });

  doc.save(`Business_Report_${new Date().toISOString().split('T')[0]}.pdf`);
};
