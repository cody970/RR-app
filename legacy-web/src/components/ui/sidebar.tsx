import * as React from "react"
import { cn } from "@/lib/utils"

const SidebarProvider = ({ children }: { children: React.ReactNode }) => (
    <div className="flex min-h-screen w-full">{children}</div>
)

const Sidebar = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex h-full w-64 flex-col bg-white border-r border-slate-200", className)}
        {...props}
    >
        {children}
    </div>
))
Sidebar.displayName = "Sidebar"

const SidebarHeader = ({ className, children }: { className?: string; children: React.ReactNode }) => (
    <div className={cn("px-6 py-4", className)}>{children}</div>
)

const SidebarContent = ({ className, children }: { className?: string; children: React.ReactNode }) => (
    <div className={cn("flex-1 overflow-y-auto px-3", className)}>{children}</div>
)

const SidebarFooter = ({ className, children }: { className?: string; children: React.ReactNode }) => (
    <div className={cn("px-4 py-4", className)}>{children}</div>
)

const SidebarGroup = ({ children }: { children: React.ReactNode }) => (
    <div className="py-2">{children}</div>
)

const SidebarGroupLabel = ({ className, children }: { className?: string; children: React.ReactNode }) => (
    <div className={cn("text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2", className)}>{children}</div>
)

const SidebarGroupContent = ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
)

const SidebarMenu = ({ children }: { children: React.ReactNode }) => (
    <nav className="space-y-1">{children}</nav>
)

const SidebarMenuItem = ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
)

const SidebarMenuButton = ({ asChild, className, children, ...props }: any) => {
    const Comp = "button"
    return (
        <Comp
            className={cn("w-full text-left", className)}
            {...props}
        >
            {children}
        </Comp>
    )
}

export {
    SidebarProvider,
    Sidebar,
    SidebarHeader,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
}
