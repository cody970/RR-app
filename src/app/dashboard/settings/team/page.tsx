"use client";

import { useEffect, useState } from "react";
import { Users, UserPlus, ShieldCheck, Trash2, Loader2, Mail, Calendar } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast-provider";

export default function TeamPage() {
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const toast = useToast();

    const fetchMembers = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/settings/team");
            if (res.ok) {
                setMembers(await res.json());
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMembers();
    }, []);

    const updateRole = async (userId: string, newRole: string) => {
        try {
            const res = await fetch("/api/settings/team", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, role: newRole })
            });

            if (res.ok) {
                toast.success("Member role updated");
                fetchMembers();
            } else {
                const err = await res.text();
                toast.error(err || "Failed to update role");
            }
        } catch (error) {
            toast.error("An error occurred");
        }
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case "OWNER": return <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200">Owner</Badge>;
            case "ADMIN": return <Badge className="bg-amber-50 text-amber-600 border-amber-200">Admin</Badge>;
            case "EDITOR": return <Badge className="bg-blue-50 text-blue-600 border-blue-200">Editor</Badge>;
            default: return <Badge variant="outline" className="text-slate-500 border-slate-200 bg-slate-50">Viewer</Badge>;
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto px-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <Users className="h-8 w-8 text-amber-500" />
                        Team Management
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Manage your organization's members, roles, and permissions.
                    </p>
                </div>

                <Button className="bg-slate-900 hover:bg-slate-800 text-white gap-2 h-11 px-6 rounded-xl shadow-md shadow-slate-900/10 transition-all active:scale-95">
                    <UserPlus className="h-4 w-4" />
                    Invite Member
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center border border-slate-200 rounded-3xl bg-white shadow-sm">
                        <Loader2 className="h-8 w-8 animate-spin text-amber-500 mb-4" />
                        <p className="text-slate-500">Retrieving team Roster...</p>
                    </div>
                ) : (
                    members.map((member) => (
                        <div key={member.id} className="p-6 border border-slate-200 rounded-2xl bg-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:border-amber-300 transition-all duration-300">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 flex items-center justify-center text-xl font-bold text-slate-700 shadow-inner group-hover:from-amber-50 group-hover:to-amber-100/50 group-hover:text-amber-700 group-hover:border-amber-200 transition-all">
                                    {member.email[0].toUpperCase()}
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-slate-900 tracking-tight">{member.email}</span>
                                        {getRoleBadge(member.role)}
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
                                        <div className="flex items-center gap-1.5 leading-none">
                                            <Mail className="h-3 w-3" />
                                            <span>Active Account</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 leading-none border-l border-slate-200 pl-4">
                                            <Calendar className="h-3 w-3" />
                                            <span>Joined {format(new Date(member.createdAt), "MMM yyyy")}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 self-end md:self-auto uppercase tracking-widest text-[10px] font-bold">
                                {member.role !== "OWNER" && (
                                    <select
                                        className="bg-white border border-slate-200 text-slate-700 text-[11px] rounded-lg px-3 py-2 outline-none focus:border-amber-400 hover:bg-slate-50 transition-colors shadow-sm"
                                        value={member.role}
                                        onChange={(e) => updateRole(member.id, e.target.value)}
                                    >
                                        <option value="VIEWER">Viewer</option>
                                        <option value="EDITOR">Editor</option>
                                        <option value="ADMIN">Admin</option>
                                    </select>
                                )}
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-red-50 hover:text-red-600 text-slate-400 transition-colors">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="p-8 border border-slate-200 border-dashed rounded-3xl flex flex-col items-center justify-center text-center bg-slate-50 hover:bg-slate-100 transition-colors group shadow-sm">
                <div className="h-12 w-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mb-4 group-hover:border-amber-200 transition-all shadow-sm">
                    <ShieldCheck className="h-6 w-6 text-slate-400 group-hover:text-amber-500" />
                </div>
                <h3 className="text-sm font-semibold text-slate-800">Security Note</h3>
                <p className="text-xs text-slate-500 max-w-md mt-1 leading-relaxed">
                    Role changes are recorded in the system audit trail immediately. Only organization owners can promote members to the Admin role.
                </p>
            </div>
        </div>
    );
}
