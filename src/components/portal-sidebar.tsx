import { PlayCircle, DollarSign, User as UserIcon } from "lucide-react";
import Link from "next/link";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarHeader,
    SidebarFooter,
} from "@/components/ui/sidebar";

const items = [
    {
        title: "My Works",
        url: "/portal",
        icon: PlayCircle,
    },
    {
        title: "Earnings",
        url: "/portal/earnings",
        icon: DollarSign,
    },
    {
        title: "Profile",
        url: "/portal/profile",
        icon: UserIcon,
    },
];

export function PortalSidebar() {
    return (
        <Sidebar className="border-r border-slate-200 bg-white">
            <SidebarHeader className="h-16 flex items-center px-6 border-b border-slate-100">
                <Link href="/portal" className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-xs font-black text-white shadow-md">
                        RR
                    </div>
                    <span className="text-xl font-bold text-slate-900 tracking-tight">Portal</span>
                </Link>
            </SidebarHeader>
            <SidebarContent className="px-3 py-4">
                <SidebarGroup>
                    <SidebarGroupLabel className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">
                        Menu
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {items.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild className="h-10 text-slate-600 hover:text-amber-700 hover:bg-amber-50 data-[active=true]:bg-amber-100 data-[active=true]:text-amber-900 rounded-lg transition-colors">
                                        <Link href={item.url} className="flex items-center gap-3 px-3">
                                            <item.icon className="h-4 w-4" />
                                            <span className="font-medium text-sm">{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="p-4 border-t border-slate-100">
                <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                        <UserIcon className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-900">Artist View</span>
                        <span className="text-xs text-slate-500">Sign out</span>
                    </div>
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}
