"use client";

import { useEffect, useState, useRef } from "react";
import { Bell, Check, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    read: boolean;
    link?: string;
    createdAt: string;
}

export function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const fetchNotifications = async () => {
        try {
            const res = await fetch("/api/notifications?limit=10");
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications);
                setUnreadCount(data.unreadCount);
            }
        } catch { }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const markAllRead = async () => {
        await fetch("/api/notifications", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ markAllRead: true }),
        });
        setUnreadCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const handleClick = async (n: Notification) => {
        if (!n.read) {
            await fetch("/api/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: n.id }),
            });
            setUnreadCount(prev => Math.max(0, prev - 1));
            setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
        }
        if (n.link) {
            router.push(n.link);
            setIsOpen(false);
        }
    };

    const typeColor = (type: string) => {
        switch (type) {
            case "SUCCESS": return "bg-emerald-500";
            case "WARNING": return "bg-amber-500";
            case "ERROR": return "bg-red-500";
            default: return "bg-blue-500";
        }
    };

    const timeAgo = (date: string) => {
        const diff = Date.now() - new Date(date).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "just now";
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                aria-label="Notifications"
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white shadow-sm animate-pulse">
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 md:w-96 rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                        <h4 className="text-sm font-semibold text-slate-900">Notifications</h4>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllRead}
                                className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 transition-colors"
                            >
                                <Check className="h-3 w-3" />
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-sm">
                                <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                No notifications yet
                            </div>
                        ) : (
                            notifications.map((n) => (
                                <button
                                    key={n.id}
                                    onClick={() => handleClick(n)}
                                    className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 ${!n.read ? "bg-amber-50/30" : ""}`}
                                >
                                    <div className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${typeColor(n.type)} ${!n.read ? "ring-2 ring-offset-1 ring-offset-white" : "opacity-50"}`} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className={`text-sm font-medium truncate ${!n.read ? "text-slate-900" : "text-slate-600"}`}>
                                                {n.title}
                                            </p>
                                            <span className="text-[10px] text-slate-400 flex-shrink-0">{timeAgo(n.createdAt)}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                                        {n.link && (
                                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 mt-1">
                                                <ExternalLink className="h-2.5 w-2.5" /> View details
                                            </span>
                                        )}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
