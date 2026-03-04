import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SidebarProvider } from "@/components/ui/sidebar";
import { PortalSidebar } from "@/components/portal-sidebar";

export default async function PortalLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect("/login");
    }

    // Role check could go here if we wanted to block OWNERs from the portal

    return (
        <SidebarProvider>
            <PortalSidebar />
            <main className="flex-1 overflow-x-hidden bg-slate-50 min-h-screen flex flex-col">
                <header className="h-16 flex items-center px-8 border-b border-slate-200 bg-white shadow-sm">
                    <h1 className="text-lg font-semibold text-slate-900">Creator Portal</h1>
                </header>
                <div className="p-8">
                    {children}
                </div>
            </main>
        </SidebarProvider>
    );
}
