import jsPDF from "jspdf";
import "jspdf-autotable";

export interface PayoutStatementData {
    orgName: string;
    payeeName: string;
    payeeType: "Writer" | "Publisher";
    period: string; // e.g. "2026-Q1"
    totalAmount: number;
    currency: string;
    dateIssued: string;
    ledgers: {
        id: string;
        date: string;
        source: string; // e.g. "ASCAP Statement", "Sync License"
        workTitle: string;
        type: string;
        amount: number;
    }[];
}

export function generatePayoutStatementPDF(data: PayoutStatementData) {
    // Note: This needs to work in both browser and node for PDF generation
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // 1. Header (Premium styling resembling RoyaltyRadar)
    doc.setFillColor(15, 15, 15);
    doc.rect(0, 0, pageWidth, 45, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("ROYALTY RADAR", 15, 25);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("OFFICIAL ACCOUNTING STATEMENT", 15, 33);

    // Organization Info Right Aligned
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(data.orgName.toUpperCase(), pageWidth - 15, 25, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Issued: ${data.dateIssued}`, pageWidth - 15, 33, { align: "right" });

    // 2. Payee Information Box
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`Payee: ${data.payeeName}`, 15, 60);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Account Type: ${data.payeeType}`, 15, 66);
    doc.text(`Accounting Period: ${data.period}`, 15, 72);

    // 3. Balance / Payment Summary Box
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(pageWidth - 90, 52, 75, 25, 3, 3, "FD");

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("Total Payment Owed", pageWidth - 85, 62);

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 185, 129); // emerald-500
    // Format currency
    const formattedAmount = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: data.currency
    }).format(data.totalAmount);
    doc.text(formattedAmount, pageWidth - 85, 72);

    // 4. Ledger Table Details
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text("Earnings Breakdown", 15, 95);

    const tableRows = data.ledgers.map(l => [
        l.date,
        l.workTitle,
        l.source,
        l.type,
        new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency }).format(l.amount)
    ]);

    (doc as any).autoTable({
        startY: 100,
        head: [['Date', 'Work Title', 'Revenue Source', 'Type', 'Amount']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229], textColor: 255 }, // indigo-600
        alternateRowStyles: { fillColor: [249, 250, 251] }, // slate-50
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: {
            4: { halign: 'right', fontStyle: 'bold', textColor: [16, 185, 129] }
        }
    });

    // 5. Footer
    const finalY = (doc as any).lastAutoTable.finalY + 20;

    // Disclaimer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "normal");
    const disclaimer = "This statement represents the calculated royalty earnings and sync placement fees owed to you by the organization for the specified accounting period. If you have any questions, please contact your catalog administrator.";
    const splitDisclaimer = doc.splitTextToSize(disclaimer, pageWidth - 30);
    doc.text(splitDisclaimer, 15, finalY);

    doc.setFont("helvetica", "italic");
    doc.text("Powered by RoyaltyRadar API", pageWidth / 2, finalY + 15, { align: "center" });

    return doc;
}
