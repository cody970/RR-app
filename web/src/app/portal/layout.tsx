import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import PortalShell from "@/components/layout/portal-shell";

export default async function PortalLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect("/login");
    }

    // Role check: Only WRITER or PUBLISHER (or technicians who want to see their portal view)
    // For now, we allow anyone authenticated to view the portal route if they hit it.

    return <PortalShell>{children}</PortalShell>;
}
