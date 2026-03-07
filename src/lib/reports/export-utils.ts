/**
 * Utility to export data to CSV and trigger a browser download.
 */
export function exportToCSV(filename: string, data: any[]) {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(","),
        ...data.map(row =>
            headers.map(header => {
                const value = row[header] ?? "";
                const cell = typeof value === "string" ? `"${value.replace(/"/g, '""')}"` : value;
                return cell;
            }).join(",")
        )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Utility to export data to JSON and trigger a browser download.
 */
export function exportToJSON(filename: string, data: any) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.json`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
/**
 * Generates a dispute letter text file for a specific finding.
 */
export function generateDisputeLetter(finding: any) {
    const date = new Date().toLocaleDateString();
    const content = `
DISPUTE NOTICE - ROYALTY ANOMALY DETECTED
Date: ${date}
Finding ID: ${finding.id}
Type: ${finding.type.replace(/_/g, " ")}
Severity: ${finding.severity}
Estimated Impact: $${finding.estimatedImpact.toFixed(2)}

To Whom It May Concern,

Our system, RoyaltyRadar, has identified a potential royalty leakage or metadata conflict associated with the following resource:
Resource ID: ${finding.resourceId}
Resource Type: ${finding.resourceType}

NATURE OF DISPUTE:
The audit engine flagged this item due to ${finding.type.toLowerCase().replace(/_/g, " ")}.
We estimate the financial impact of this unresolved issue to be approximately $${finding.estimatedImpact.toFixed(2)}.

We request a formal review of the metadata and royalty distributions associated with this asset to ensure accurate reporting and payment.

Best Regards,
The RoyaltyRadar Audit Team
(Automated Dispute Generation)
`.trim();

    const blob = new Blob([content], { type: "text/plain" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `dispute_letter_${finding.id}.txt`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Generates and downloads a blank CSV template with the correct headers.
 */
export function downloadTemplate(type: string, headers: string[]) {
    const csvContent = headers.join(",");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `RoyaltyRadar_${type}_Template.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
