import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/layout/dashboard-shell";
import { ErrorBoundary } from "@/components/error-boundary";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    return (
        <DashboardShell>
            <ErrorBoundary>
                {children}
            </ErrorBoundary>
        </DashboardShell>
    );
}
