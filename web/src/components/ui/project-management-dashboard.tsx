import React, {
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
    useCallback,
} from "react";
import {
    MoreVertical,
    LayoutGrid,
    List,
    Bell,
    Search,
    Moon,
    Sun,
    Plus,
    Trash2,
    Home,
    BarChart2,
    Calendar,
    Settings,
    X,
    MessageSquare,
    Star,
    ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ===================================
 * Types & Interfaces
 * ===================================
 */
export type SidebarLink = {
    id: string;
    label: string;
    href?: string;
    icon?: React.ReactNode;
    active?: boolean;
};

export type Stat = {
    id: string;
    label: string;
    value: number | string;
};

export type ProjectStatus = "inProgress" | "upcoming" | "completed" | "paused";

export type Project = {
    id: string;
    name: string;
    subtitle?: string;
    date?: string;
    progress?: number;
    status?: ProjectStatus;
    accentColor?: string;
    participants?: string[];
    daysLeft?: number | string;
    bgColorClass?: string;
};

export type Message = {
    id: string;
    name: string;
    avatarUrl: string;
    text: string;
    date: string;
    starred?: boolean;
};

export type SortBy = "manual" | "date" | "name" | "progress";
export type SortDir = "asc" | "desc";
export type ThemeMode = "light" | "dark" | "system";

export type ProjectDashboardProps = {
    title?: string;
    user?: { name?: string; avatarUrl?: string };
    sidebarLinks?: SidebarLink[];
    stats?: Stat[];
    projects: Project[];
    messages?: Message[];
    view?: "grid" | "list";
    defaultView?: "grid" | "list";
    onViewChange?: (view: "grid" | "list") => void;
    searchQuery?: string;
    defaultSearchQuery?: string;
    onSearchQueryChange?: (q: string) => void;
    showSearch?: boolean;
    searchPlaceholder?: string;
    messagesOpen?: boolean;
    defaultMessagesOpen?: boolean;
    onMessagesOpenChange?: (open: boolean) => void;
    sortBy?: SortBy;
    defaultSortBy?: SortBy;
    sortDir?: SortDir;
    defaultSortDir?: SortDir;
    onSortChange?: (by: SortBy, dir: SortDir) => void;
    statusFilter?: ProjectStatus | "all";
    defaultStatusFilter?: ProjectStatus | "all";
    onStatusFilterChange?: (status: ProjectStatus | "all") => void;
    pageSize?: number;
    initialPage?: number;
    onPageChange?: (page: number) => void;
    virtualizeList?: boolean;
    estimatedRowHeight?: number;
    onProjectClick?: (projectId: string) => void;
    onProjectAction?: (projectId: string, action: "open" | "edit" | "delete") => void;
    onProjectUpdate?: (project: Project) => void;
    onProjectsReorder?: (orderedIds: string[]) => void;
    allowCreate?: boolean;
    onProjectCreate?: (project: Project) => void;
    generateId?: () => string;
    onMessageStarChange?: (messageId: string, starred: boolean) => void;
    showThemeToggle?: boolean;
    onToggleTheme?: () => void;
    theme?: ThemeMode;
    defaultTheme?: ThemeMode;
    onThemeChange?: (mode: ThemeMode) => void;
    persistKey?: string;
    className?: string;
    loading?: boolean;
    emptyProjectsLabel?: string;
    emptyMessagesLabel?: string;
};

/**
 * ===================================
 * Spacing System
 * ===================================
 */
const spacing = {
    page: {
        header: "px-4 sm:px-6 lg:px-8 py-4",
        sidebar: "px-2 sm:px-3 py-4",
        main: "px-4 sm:px-6 lg:px-8 py-4",
        messages: "px-4 sm:px-6 py-4"
    },
    card: {
        base: "p-4 sm:p-5 lg:p-6",
        compact: "p-3 sm:p-4"
    },
    button: {
        sm: "px-2.5 py-1.5",
        md: "px-3 py-2",
        lg: "px-4 py-2.5"
    },
    gap: {
        xs: "gap-2",
        sm: "gap-3",
        md: "gap-4",
        lg: "gap-6"
    }
};

/**
 * ===================================
 * Utilities
 * ===================================
 */
const parseDateLike = (v?: string): number => {
    if (!v) return 0;
    const ts = Date.parse(v);
    return Number.isNaN(ts) ? 0 : ts;
};

const clamp = (n: number, min: number, max: number) => {
    return Math.min(Math.max(n, min), max);
};

const readLS = <T,>(key: string, fallback: T): T => {
    try {
        const raw = localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
        return fallback;
    }
};

const writeLS = <T,>(key: string, value: T) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch { }
};

/**
 * ===================================
 * Main Component
 * ===================================
 */
export function ProjectDashboard({
    title = "Portfolio",
    user = {
        name: "You",
        avatarUrl:
            "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=96&q=80&auto=format&fit=crop",
    },
    sidebarLinks = [
        { id: "home", label: "Home", active: true },
        { id: "charts", label: "Charts" },
        { id: "calendar", label: "Calendar" },
        { id: "settings", label: "Settings" },
    ],
    stats,
    projects,
    messages = [],
    view,
    defaultView = "grid",
    onViewChange,
    searchQuery,
    defaultSearchQuery = "",
    onSearchQueryChange,
    showSearch = true,
    searchPlaceholder = "Search",
    messagesOpen,
    defaultMessagesOpen = false,
    onMessagesOpenChange,
    sortBy,
    defaultSortBy = "date",
    sortDir,
    defaultSortDir = "desc",
    onSortChange,
    statusFilter,
    defaultStatusFilter = "all",
    onStatusFilterChange,
    pageSize = 9,
    initialPage = 1,
    onPageChange,
    virtualizeList = false,
    estimatedRowHeight = 140,
    onProjectClick,
    onProjectAction,
    onProjectUpdate,
    onProjectsReorder,
    allowCreate = true,
    onProjectCreate,
    generateId,
    onMessageStarChange,
    showThemeToggle = true,
    onToggleTheme,
    theme,
    defaultTheme = "system",
    onThemeChange,
    persistKey,
    className = "",
    loading = false,
    emptyProjectsLabel = "No projects match your search.",
    emptyMessagesLabel = "No messages yet.",
}: ProjectDashboardProps) {
    const lsKey = persistKey ? (k: string) => `pd:${persistKey}:${k}` : null;

    // State management
    const [internalView, setInternalView] = useState<"grid" | "list">(
        lsKey ? readLS(lsKey("view"), defaultView) : defaultView
    );
    const viewMode = view ?? internalView;

    const [internalQuery, setInternalQuery] = useState<string>(
        lsKey ? readLS(lsKey("query"), defaultSearchQuery) : defaultSearchQuery
    );
    const query = searchQuery ?? internalQuery;

    const [internalMessagesOpen, setInternalMessagesOpen] = useState<boolean>(
        lsKey ? readLS(lsKey("messagesOpen"), defaultMessagesOpen) : defaultMessagesOpen
    );
    const isMessagesOpen = messagesOpen ?? internalMessagesOpen;

    const [internalSortBy, setInternalSortBy] = useState<SortBy>(
        lsKey ? readLS(lsKey("sortBy"), defaultSortBy) : defaultSortBy
    );
    const [internalSortDir, setInternalSortDir] = useState<SortDir>(
        lsKey ? readLS(lsKey("sortDir"), defaultSortDir) : defaultSortDir
    );
    const activeSortBy = sortBy ?? internalSortBy;
    const activeSortDir = sortDir ?? internalSortDir;

    const [internalStatusFilter, setInternalStatusFilter] = useState<ProjectStatus | "all">(
        lsKey ? readLS(lsKey("statusFilter"), defaultStatusFilter) : defaultStatusFilter
    );
    const activeStatusFilter = statusFilter ?? internalStatusFilter;

    const [page, setPage] = useState<number>(
        lsKey ? readLS(lsKey("page"), initialPage) : initialPage
    );

    const [localProjects, setLocalProjects] = useState<Project[]>(projects);

    useEffect(() => {
        if (onProjectUpdate || onProjectsReorder) return;
        setLocalProjects(projects);
    }, [projects, onProjectUpdate, onProjectsReorder]);

    const dataProjects = onProjectUpdate || onProjectsReorder ? projects : localProjects;

    const searchInputId = useId();
    const statusSelectId = useId();

    // Compute stats
    const computedStats: Stat[] = useMemo(() => {
        if (stats) return stats;
        const total = dataProjects.length;
        const byStatus = dataProjects.reduce(
            (acc, p) => {
                acc[p.status ?? "inProgress"]++;
                return acc;
            },
            { inProgress: 0, upcoming: 0, completed: 0, paused: 0 } as Record<ProjectStatus, number>
        );
        return [
            { id: "inProgress", label: "In Progress", value: byStatus.inProgress },
            { id: "upcoming", label: "Upcoming", value: byStatus.upcoming },
            { id: "completed", label: "Completed", value: byStatus.completed },
            { id: "total", label: "Total Projects", value: total },
        ];
    }, [stats, dataProjects]);

    const orderMap = useMemo(() => {
        const map = new Map<string, number>();
        dataProjects.forEach((p, i) => map.set(p.id, i));
        return map;
    }, [dataProjects]);

    const preparedProjects = useMemo(() => {
        const q = query.trim().toLowerCase();
        let list = dataProjects.slice();

        if (activeStatusFilter !== "all") {
            list = list.filter((p) => (p.status ?? "inProgress") === activeStatusFilter);
        }
        if (q) {
            list = list.filter(
                (p) =>
                    p.name.toLowerCase().includes(q) ||
                    (p.subtitle?.toLowerCase().includes(q) ?? false)
            );
        }

        list.sort((a, b) => {
            let cmp = 0;
            switch (activeSortBy) {
                case "manual":
                    cmp = (orderMap.get(a.id)! - orderMap.get(b.id)!);
                    break;
                case "date":
                    cmp = parseDateLike(a.date) - parseDateLike(b.date);
                    break;
                case "name":
                    cmp = a.name.localeCompare(b.name);
                    break;
                case "progress":
                    cmp = (a.progress ?? 0) - (b.progress ?? 0);
                    break;
            }
            return activeSortBy === "manual" ? cmp : activeSortDir === "asc" ? cmp : -cmp;
        });

        return list;
    }, [dataProjects, query, activeSortBy, activeSortDir, activeStatusFilter, orderMap]);

    const totalPages = virtualizeList ? 1 : Math.max(1, Math.ceil(preparedProjects.length / pageSize));
    const currentPage = virtualizeList ? 1 : clamp(page, 1, totalPages);
    const pagedProjects = useMemo(() => {
        if (virtualizeList) return preparedProjects;
        const start = (currentPage - 1) * pageSize;
        return preparedProjects.slice(start, start + pageSize);
    }, [preparedProjects, currentPage, pageSize, virtualizeList]);

    useEffect(() => {
        if (!virtualizeList) setPage(1);
    }, [query, activeStatusFilter, activeSortBy, activeSortDir, pageSize, virtualizeList]);

    // Theme handle
    const [internalTheme, setInternalTheme] = useState<ThemeMode>(() => {
        if (theme) return theme;
        if (lsKey) return readLS(lsKey("theme"), "system");
        return defaultTheme;
    });
    const activeTheme = theme ?? internalTheme;

    const applyTheme = useCallback((mode: ThemeMode) => {
        const root = document.documentElement;
        const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
        const isDark = mode === "dark" || (mode === "system" && prefersDark);
        root.classList.toggle("dark", isDark);
    }, []);

    useEffect(() => {
        applyTheme(activeTheme);
        if (lsKey) writeLS(lsKey("theme"), activeTheme);
    }, [activeTheme, applyTheme, lsKey]);

    const toggleTheme = () => {
        if (onToggleTheme) return onToggleTheme();
        const next: ThemeMode =
            activeTheme === "dark" ? "light" : activeTheme === "light" ? "system" : "dark";
        if (theme === undefined) setInternalTheme(next);
        onThemeChange?.(next);
    };

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDraft, setEditDraft] = useState<Project | null>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [createDraft, setCreateDraft] = useState<Project>({
        id: "",
        name: "",
        subtitle: "",
        date: "",
        progress: 0,
        status: "inProgress",
        accentColor: "#D4AF37",
        participants: [],
    });
    const [detailProject, setDetailProject] = useState<Project | null>(null);
    const [dragId, setDragId] = useState<string | null>(null);
    const [reorderMode, setReorderMode] = useState(false);
    const [liveMsg, setLiveMsg] = useState("");

    const scrollRef = useRef<HTMLDivElement | null>(null);
    const messagesPanelRef = useRef<HTMLDivElement | null>(null);
    const liveRef = useRef<HTMLDivElement | null>(null);
    const [scrollTop, setScrollTop] = useState(0);

    const onScroll = useCallback(() => {
        const t = scrollRef.current?.scrollTop ?? 0;
        setScrollTop(t);
    }, []);

    useEffect(() => {
        if (!virtualizeList) return;
        const el = scrollRef.current;
        if (!el) return;
        el.addEventListener("scroll", onScroll, { passive: true });
        return () => el.removeEventListener("scroll", onScroll);
    }, [virtualizeList, onScroll]);

    const viewportH = scrollRef.current?.clientHeight ?? 0;
    const itemH = estimatedRowHeight;
    const overscan = 3;
    const totalCount = pagedProjects.length;
    const startIndex = virtualizeList && viewMode === "list"
        ? Math.max(0, Math.floor(scrollTop / itemH) - overscan) : 0;
    const endIndex = virtualizeList && viewMode === "list"
        ? Math.min(totalCount, Math.ceil((scrollTop + viewportH) / itemH) + overscan)
        : totalCount;
    const before = startIndex * itemH;
    const after = Math.max(0, (totalCount - endIndex) * itemH);
    const visibleProjects = virtualizeList && viewMode === "list"
        ? pagedProjects.slice(startIndex, endIndex)
        : pagedProjects;

    const [localStarred, setLocalStarred] = useState<Record<string, boolean>>({});
    useEffect(() => {
        const seed: Record<string, boolean> = {};
        messages.forEach((m) => (seed[m.id] = !!m.starred));
        setLocalStarred(seed);
    }, [messages]);

    const isStarred = (m: Message) => m.starred ?? localStarred[m.id] ?? false;
    const toggleStar = (m: Message) => {
        const next = !isStarred(m);
        if (onMessageStarChange) {
            onMessageStarChange(m.id, next);
        } else {
            setLocalStarred((s) => ({ ...s, [m.id]: next }));
        }
    };

    useEffect(() => { if (lsKey) writeLS(lsKey("view"), viewMode); }, [lsKey, viewMode]);
    useEffect(() => { if (lsKey) writeLS(lsKey("query"), query); }, [lsKey, query]);
    useEffect(() => { if (lsKey) writeLS(lsKey("messagesOpen"), isMessagesOpen); }, [lsKey, isMessagesOpen]);
    useEffect(() => { if (lsKey) { writeLS(lsKey("sortBy"), activeSortBy); writeLS(lsKey("sortDir"), activeSortDir); } }, [lsKey, activeSortBy, activeSortDir]);
    useEffect(() => { if (lsKey) writeLS(lsKey("statusFilter"), activeStatusFilter); }, [lsKey, activeStatusFilter]);
    useEffect(() => { if (lsKey && !virtualizeList) writeLS(lsKey("page"), currentPage); }, [lsKey, currentPage, virtualizeList]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                if (isMessagesOpen) setMessagesOpen(false);
                if (reorderMode) setReorderMode(false);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [isMessagesOpen, reorderMode]);

    useEffect(() => {
        if (!isMessagesOpen) return;
        const root = messagesPanelRef.current;
        if (!root) return;
        const focusables = root.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusables[0];
        first?.focus();
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== "Tab" || focusables.length === 0) return;
            const last = focusables[focusables.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first) {
                    (last as HTMLElement).focus();
                    e.preventDefault();
                }
            } else {
                if (document.activeElement === last) {
                    (first as HTMLElement).focus();
                    e.preventDefault();
                }
            }
        };
        root.addEventListener("keydown", handleKeyDown);
        return () => root.removeEventListener("keydown", handleKeyDown);
    }, [isMessagesOpen]);

    const setView = (next: "grid" | "list") => {
        if (view === undefined) setInternalView(next);
        onViewChange?.(next);
    };
    const setSearch = (q: string) => {
        if (searchQuery === undefined) setInternalQuery(q);
        onSearchQueryChange?.(q);
    };
    const setMessagesOpen = (open: boolean) => {
        if (messagesOpen === undefined) setInternalMessagesOpen(open);
        onMessagesOpenChange?.(open);
    };
    const setSort = (by: SortBy, dir: SortDir) => {
        if (sortBy === undefined) setInternalSortBy(by);
        if (sortDir === undefined) setInternalSortDir(dir);
        onSortChange?.(by, dir);
    };
    const setStatusFilter = (status: ProjectStatus | "all") => {
        if (statusFilter === undefined) setInternalStatusFilter(status);
        onStatusFilterChange?.(status);
    };
    const goToPage = (p: number) => {
        setPage(p);
        onPageChange?.(p);
    };
    const startEdit = (p: Project) => {
        setEditingId(p.id);
        setEditDraft({ ...p });
    };
    const cancelEdit = () => {
        setEditingId(null);
        setEditDraft(null);
    };
    const saveEdit = () => {
        if (!editDraft) return;
        if (onProjectUpdate) {
            onProjectUpdate(editDraft);
        } else {
            setLocalProjects((arr) => arr.map((x) => (x.id === editDraft.id ? editDraft : x)));
        }
        setEditingId(null);
        setEditDraft(null);
    };
    const mkId = () => generateId?.() ?? Math.random().toString(36).slice(2, 8) + "-" + Date.now().toString(36).slice(-4);
    const submitCreate = (e: React.FormEvent) => {
        e.preventDefault();
        const id = mkId();
        const proj: Project = { ...createDraft, id };
        if (onProjectCreate) {
            onProjectCreate(proj);
        } else {
            setLocalProjects((arr) => [proj, ...arr]);
        }
        setCreateOpen(false);
        setCreateDraft({
            id: "",
            name: "",
            subtitle: "",
            date: "",
            progress: 0,
            status: "inProgress",
            accentColor: "#D4AF37",
            participants: [],
        });
    };
    const openDetail = (p: Project) => {
        if (onProjectClick) return onProjectClick(p.id);
        setDetailProject(p);
    };

    const handleDragStart = (id: string) => setDragId(id);
    const handleDragOver = (e: React.DragEvent) => e.preventDefault();
    const doReorder = (ids: string[]) => {
        if (onProjectsReorder) {
            onProjectsReorder(ids);
        } else {
            setLocalProjects((arr) => {
                const map = new Map(arr.map((p) => [p.id, p]));
                return ids.map((id) => map.get(id)!).filter(Boolean);
            });
        }
    };
    const handleDrop = (targetId: string) => {
        if (!dragId || dragId === targetId) return;
        const ids = preparedProjects.map((p) => p.id);
        const from = ids.indexOf(dragId);
        const to = ids.indexOf(targetId);
        if (from < 0 || to < 0) return;
        ids.splice(to, 0, ids.splice(from, 1)[0]);
        const full = dataProjects.map((p) => p.id);
        const reordered = reorderWithinFull(full, ids);
        doReorder(reordered);
        setDragId(null);
        announce(`Moved item to position ${to + 1}.`);
    };
    function reorderWithinFull(fullIds: string[], visibleIds: string[]) {
        const setVisible = new Set(visibleIds);
        const remaining = fullIds.filter((id) => !setVisible.has(id));
        return [...visibleIds, ...remaining];
    }
    const announce = (msg: string) => {
        setLiveMsg("");
        setTimeout(() => setLiveMsg(msg), 10);
    };

    const canReorder = activeSortBy === "manual" && !query && activeStatusFilter === "all" && viewMode === "list";
    const moveBy = (id: string, delta: number) => {
        const vis = preparedProjects.map((p) => p.id);
        const i = vis.indexOf(id);
        if (i < 0) return;
        const j = clamp(i + delta, 0, vis.length - 1);
        if (i === j) return;
        vis.splice(j, 0, vis.splice(i, 1)[0]);
        const reordered = reorderWithinFull(dataProjects.map((p) => p.id), vis);
        doReorder(reordered);
        announce(`Moved to position ${j + 1}.`);
    };
    const moveToIndex = (id: string, index: number) => {
        const vis = preparedProjects.map((p) => p.id);
        const i = vis.indexOf(id);
        const j = clamp(index, 0, vis.length - 1);
        if (i < 0 || i === j) return;
        vis.splice(j, 0, vis.splice(i, 1)[0]);
        const reordered = reorderWithinFull(dataProjects.map((p) => p.id), vis);
        doReorder(reordered);
        announce(`Moved to position ${j + 1}.`);
    };

    const getNavIcon = (id?: string) => {
        switch ((id || "").toLowerCase()) {
            case "home": return <Home size={20} />;
            case "charts":
            case "analytics": return <BarChart2 size={20} />;
            case "calendar": return <Calendar size={20} />;
            case "settings":
            case "preferences": return <Settings size={20} />;
            default: return <Home size={20} />;
        }
    };

    return (
        <div className={cn(
            "flex flex-col h-screen bg-slate-50 dark:bg-slate-900 font-sans",
            className
        )}>
            <div aria-live="polite" aria-atomic="true" className="sr-only" ref={liveRef}>
                {liveMsg}
            </div>

            <header className={cn(
                "flex items-center justify-between border-b border-slate-200 dark:border-slate-800",
                spacing.page.header,
                spacing.gap.sm
            )}>
                <div className={cn("flex items-center min-w-0", spacing.gap.sm)}>
                    <span className="inline-flex size-10 items-center justify-center rounded-lg bg-gold-500 text-white shrink-0">
                        <Home size={20} />
                    </span>
                    <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {title}
                    </h1>

                    {showSearch && (
                        <label
                            htmlFor={searchInputId}
                            className={cn(
                                "hidden md:flex items-center rounded-lg bg-white dark:bg-slate-800",
                                "border border-slate-200 dark:border-slate-700 px-3 py-2 ml-4",
                                spacing.gap.xs
                            )}
                        >
                            <Search size={16} className="text-slate-500 dark:text-slate-400" />
                            <input
                                id={searchInputId}
                                aria-label="Search projects"
                                className="bg-transparent placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none text-sm w-56 text-slate-900 dark:text-slate-100"
                                placeholder={searchPlaceholder}
                                value={query}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </label>
                    )}
                </div>

                <div className={cn("flex items-center", spacing.gap.xs)}>
                    {allowCreate && (
                        <button
                            className={cn(
                                "rounded-lg bg-gold-500 text-white hover:bg-gold-600 transition-colors font-medium",
                                spacing.button.md
                            )}
                            onClick={() => setCreateOpen(true)}
                        >
                            <span className="hidden sm:inline">New Project</span>
                            <Plus size={20} className="sm:hidden" />
                        </button>
                    )}

                    {showThemeToggle && (
                        <button
                            title={`Theme: ${activeTheme}`}
                            onClick={toggleTheme}
                            className={cn(
                                "rounded-lg border border-slate-200 dark:border-slate-700",
                                "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200",
                                "hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors p-2"
                            )}
                        >
                            {activeTheme === "dark" ? <Moon size={20} /> : <Sun size={20} />}
                            <span className="sr-only">Toggle theme</span>
                        </button>
                    )}

                    <button
                        className={cn(
                            "rounded-lg border border-slate-200 dark:border-slate-700",
                            "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200",
                            "hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors p-2"
                        )}
                        aria-label="Notifications"
                    >
                        <Bell size={20} />
                    </button>

                    <button
                        className={cn(
                            "flex items-center rounded-lg border border-slate-200 dark:border-slate-700",
                            "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors",
                            "pl-2 pr-3 py-1.5",
                            spacing.gap.xs
                        )}
                        aria-label="Account menu"
                    >
                        <img src={user?.avatarUrl} alt="" className="size-8 rounded-md object-cover" />
                        <span className="hidden sm:inline text-sm font-medium text-slate-800 dark:text-slate-100">
                            {user?.name}
                        </span>
                    </button>

                    <button
                        className="md:hidden p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                        onClick={() => setMessagesOpen(true)}
                        aria-label="Open messages"
                    >
                        <MessageSquare size={20} />
                    </button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                <aside className={cn(
                    "hidden sm:flex flex-col items-center border-r border-slate-200 dark:border-slate-800",
                    spacing.page.sidebar,
                    spacing.gap.sm
                )}>
                    {sidebarLinks.map((l) => (
                        <a
                            key={l.id}
                            href={l.href || "#"}
                            className={cn(
                                "size-11 inline-flex items-center justify-center rounded-lg transition-all",
                                "border border-slate-200 dark:border-slate-700",
                                l.active
                                    ? "bg-gold-500 text-white shadow-lg shadow-gold-500/20"
                                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                            )}
                            aria-current={l.active ? "page" : undefined}
                            title={l.label}
                        >
                            {l.icon ?? getNavIcon(l.id)}
                            <span className="sr-only">{l.label}</span>
                        </a>
                    ))}
                </aside>

                <main className={cn(
                    "flex-1 min-w-0 overflow-hidden flex flex-col",
                    spacing.page.main
                )}>
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                        <div className={cn("flex flex-wrap items-center", spacing.gap.md)}>
                            {computedStats.map((s, i) => (
                                <div key={s.id} className={cn("flex items-center", spacing.gap.xs)}>
                                    <div className="flex flex-col">
                                        <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                            {s.value}
                                        </span>
                                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            {s.label}
                                        </span>
                                    </div>
                                    {i < computedStats.length - 1 && (
                                        <span className="ml-4 w-px h-10 bg-slate-200 dark:bg-slate-800" />
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className={cn("flex items-center", spacing.gap.xs)}>
                            <label className="sr-only" htmlFor={statusSelectId}>Filter status</label>
                            <select
                                id={statusSelectId}
                                value={activeStatusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | "all")}
                                className={cn(
                                    "rounded-lg border border-slate-200 dark:border-slate-700 transition-all",
                                    "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-gold-500",
                                    spacing.button.sm
                                )}
                            >
                                <option value="all">All Status</option>
                                <option value="inProgress">In progress</option>
                                <option value="upcoming">Upcoming</option>
                                <option value="completed">Completed</option>
                                <option value="paused">Paused</option>
                            </select>

                            <div className={cn("inline-flex items-center", spacing.gap.xs)}>
                                <label className="sr-only" htmlFor="sortBy">Sort by</label>
                                <select
                                    id="sortBy"
                                    value={activeSortBy}
                                    onChange={(e) => setSort(e.target.value as SortBy, activeSortDir)}
                                    className={cn(
                                        "rounded-lg border border-slate-200 dark:border-slate-700 transition-all",
                                        "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200",
                                        spacing.button.sm
                                    )}
                                >
                                    <option value="manual">Manual</option>
                                    <option value="date">Date</option>
                                    <option value="name">Name</option>
                                    <option value="progress">Progress</option>
                                </select>
                                {activeSortBy !== "manual" && (
                                    <button
                                        className={cn(
                                            "p-2 rounded-lg border border-slate-200 dark:border-slate-700",
                                            "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                        )}
                                        onClick={() => setSort(activeSortBy, activeSortDir === "asc" ? "desc" : "asc")}
                                    >
                                        <ChevronDown size={16} className={cn("transition-transform", activeSortDir === "asc" && "rotate-180")} />
                                    </button>
                                )}
                            </div>

                            <div className="flex border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                <button
                                    onClick={() => setView("list")}
                                    className={cn(
                                        "p-2 transition-colors",
                                        viewMode === "list"
                                            ? "bg-slate-900 text-white dark:bg-gold-500"
                                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                                    )}
                                    title="List view"
                                >
                                    <List size={20} />
                                </button>
                                <button
                                    onClick={() => setView("grid")}
                                    className={cn(
                                        "p-2 transition-colors",
                                        viewMode === "grid"
                                            ? "bg-slate-900 text-white dark:bg-gold-500"
                                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                                    )}
                                    title="Grid view"
                                >
                                    <LayoutGrid size={20} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <section
                        aria-label="Projects"
                        ref={scrollRef}
                        className={cn(
                            "flex-1 overflow-y-auto pr-2",
                            viewMode === "grid"
                                ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                                : cn("flex flex-col", spacing.gap.md)
                        )}
                    >
                        {loading && (
                            <div className="col-span-full py-20 text-center text-slate-500">
                                <div className="animate-spin size-8 border-4 border-gold-500 border-t-transparent rounded-full mx-auto mb-4" />
                                Loading projects...
                            </div>
                        )}

                        {!loading && visibleProjects.map((p) => {
                            const accent = p.accentColor || "#10b981";
                            const isEditing = editingId === p.id;

                            return (
                                <article
                                    key={p.id}
                                    className={cn(
                                        "group relative overflow-hidden rounded-xl border transition-all duration-300",
                                        "border-slate-200 dark:border-slate-800",
                                        p.bgColorClass || "bg-white dark:bg-slate-800/50",
                                        viewMode === "list"
                                            ? cn("flex items-center", spacing.card.compact, spacing.gap.md)
                                            : cn("flex flex-col", spacing.card.base),
                                        "hover:border-gold-500/50 hover:shadow-xl hover:shadow-gold-500/5"
                                    )}
                                >
                                    <div className={cn(
                                        "flex items-start justify-between mb-2",
                                        viewMode === "list" ? "min-w-[120px]" : ""
                                    )}>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                            {p.date}
                                        </span>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={(e) => { e.stopPropagation(); startEdit(p); }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                                <Settings size={14} />
                                            </button>
                                            <button onClick={(e) => {
                                                e.stopPropagation();
                                                if (onProjectAction) onProjectAction(p.id, "delete");
                                                else setLocalProjects(prev => prev.filter(x => x.id !== p.id));
                                            }} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-slate-400 hover:text-red-600">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {!isEditing ? (
                                        <div className={viewMode === "list" ? "flex-1" : "flex-1"}>
                                            <button onClick={() => openDetail(p)} className="text-left w-full group/title">
                                                <h3 className="font-bold text-slate-900 dark:text-slate-100 group-hover/title:text-gold-500 transition-colors">
                                                    {p.name}
                                                </h3>
                                                {p.subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{p.subtitle}</p>}
                                            </button>
                                        </div>
                                    ) : (
                                        <form className="flex-1 space-y-2 py-2" onSubmit={(e) => { e.preventDefault(); saveEdit(); }}>
                                            <input className="w-full text-sm rounded border-slate-200 dark:border-slate-700 bg-transparent px-2 py-1" value={editDraft?.name || ""} onChange={e => setEditDraft(d => d ? { ...d, name: e.target.value } : null)} />
                                            <div className="flex gap-2">
                                                <button type="submit" className="text-[10px] font-bold uppercase bg-gold-500 text-white px-2 py-1 rounded">Save</button>
                                                <button type="button" onClick={cancelEdit} className="text-[10px] font-bold uppercase border px-2 py-1 rounded">Cancel</button>
                                            </div>
                                        </form>
                                    )}

                                    {!isEditing && (
                                        <div className={cn("mt-4", viewMode === "list" ? "w-48" : "w-full")}>
                                            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full transition-all duration-500 rounded-full"
                                                    style={{ width: `${p.progress || 0}%`, backgroundColor: accent }}
                                                />
                                            </div>
                                            <div className="flex justify-between mt-2">
                                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-tighter">Progress</span>
                                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{p.progress}%</span>
                                            </div>
                                        </div>
                                    )}

                                    {!isEditing && (
                                        <div className={cn("mt-auto pt-4 flex items-center justify-between", viewMode === "list" ? "ml-auto" : "")}>
                                            <div className="flex -space-x-1.5">
                                                {p.participants?.slice(0, 3).map((url, i) => (
                                                    <img key={i} src={url} className="size-6 rounded-full border border-white dark:border-slate-900 object-cover" alt="" />
                                                ))}
                                                {(p.participants?.length || 0) > 3 && (
                                                    <div className="size-6 rounded-full bg-slate-100 dark:bg-slate-800 border border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                                        +{(p.participants?.length || 0) - 3}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {p.status && (
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-500 uppercase tracking-wider">
                                                        {p.status}
                                                    </span>
                                                )}
                                                {p.daysLeft !== undefined && (
                                                    <span className="text-[10px] font-bold text-gold-600 dark:text-gold-400 uppercase tracking-wider bg-gold-50 dark:bg-gold-500/10 px-1.5 py-0.5 rounded">
                                                        {p.daysLeft} d
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </article>
                            );
                        })}

                        {!loading && visibleProjects.length === 0 && (
                            <div className="col-span-full py-20 text-center">
                                <p className="text-slate-400 dark:text-slate-600 font-medium">{emptyProjectsLabel}</p>
                            </div>
                        )}
                    </section>
                </main>

                <aside
                    ref={messagesPanelRef}
                    className={cn(
                        "fixed md:relative inset-y-0 right-0 z-40 w-80 md:w-96",
                        "bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 transition-all duration-300",
                        isMessagesOpen ? "translate-x-0" : "translate-x-full md:translate-x-0",
                        messages.length === 0 ? "hidden" : ""
                    )}
                >
                    <div className={cn("flex items-center justify-between border-b border-slate-200 dark:border-slate-800", spacing.page.messages)}>
                        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Messages</h2>
                        <button className="md:hidden p-2 text-slate-400" onClick={() => setMessagesOpen(false)}><X size={20} /></button>
                    </div>
                    <div className="overflow-y-auto h-full p-4 space-y-4 pb-20">
                        {messages.map(m => (
                            <div key={m.id} className="group p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-gold-500/30 transition-all bg-slate-50/50 dark:bg-slate-800/30">
                                <div className="flex gap-3">
                                    <img src={m.avatarUrl} className="size-10 rounded-full border-2 border-white dark:border-slate-800" alt="" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{m.name}</span>
                                            <button onClick={() => toggleStar(m)} className={cn("transition-colors", isStarred(m) ? "text-gold-500" : "text-slate-300 hover:text-slate-400")}>
                                                <Star size={12} fill={isStarred(m) ? "currentColor" : "none"} />
                                            </button>
                                        </div>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">{m.text}</p>
                                        <span className="text-[10px] text-slate-400 mt-2 block font-medium uppercase">{m.date}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>
            </div>

            {allowCreate && createOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setCreateOpen(false)} />
                    <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">Create New Project</h2>
                        <form onSubmit={submitCreate} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Project Name</label>
                                <input required className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-gold-500 outline-none" value={createDraft.name} onChange={e => setCreateDraft(d => ({ ...d, name: e.target.value }))} />
                            </div>
                            <div className="flex gap-3">
                                <button type="submit" className="flex-1 bg-gold-500 text-white font-bold py-2 rounded-lg hover:bg-gold-600 transition-colors">Create</button>
                                <button type="button" className="flex-1 border border-slate-200 dark:border-slate-700 font-bold py-2 rounded-lg" onClick={() => setCreateOpen(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Global styles */}
            <style jsx global>{`
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border-width: 0;
        }
      `}</style>
        </div>
    );
}

export default ProjectDashboard;
