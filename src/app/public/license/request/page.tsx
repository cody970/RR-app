"use client";

import { useState, useEffect } from "react";
import { Search, Music, User, Send, Loader2, FileText, Globe, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Simulated fetching of catalog works for a specific org
// In a real app, you'd pass the orgId in the URL or infer it from a custom domain
export default function PublicLicenseRequestPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [works, setWorks] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedWork, setSelectedWork] = useState<any | null>(null);

    // Form state
    const [form, setForm] = useState({
        requesterName: "",
        requesterEmail: "",
        requesterCompany: "",
        projectTitle: "",
        projectType: "",
        media: "",
        territory: "",
        term: "",
        budget: "",
        notes: "",
    });
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // Debounced search
    useEffect(() => {
        if (!searchTerm || selectedWork) return;
        const timer = setTimeout(async () => {
            setSearching(true);
            try {
                // Fetch public works (needs a dedicated public endpoint in reality,
                // but for demo we can mock this or use an existing one if unprotected)
                const res = await fetch(`/api/catalog?search=${encodeURIComponent(searchTerm)}`);
                if (res.ok) {
                    const data = await res.json();
                    setWorks(data.works || data); // Adjust based on API shape
                }
            } catch (e) {
                console.error(e);
            } finally {
                setSearching(false);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm, selectedWork]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            // Need orgId for the request, usually derived from the public vanity URL
            // Since this is a demo, we'll try to get it from the selected work or fail gracefully
            const orgId = selectedWork.orgId || "demo-org-id";

            const res = await fetch("/api/licensing/requests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    orgId,
                    workId: selectedWork.id,
                    ...form
                }),
            });
            if (res.ok) {
                setSubmitted(true);
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <Card className="max-w-md w-full text-center py-12 px-6">
                    <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Request Submitted</h2>
                    <p className="text-slate-500 mb-6">
                        Thank you for your interest in licensing "{selectedWork?.title}". The publisher has received your request and will be in touch shortly.
                    </p>
                    <Button onClick={() => {
                        setSubmitted(false);
                        setSelectedWork(null);
                        setSearchTerm("");
                    }}>Return to Search</Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-indigo-900 text-white py-12 px-4 shadow-inner">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-3xl font-bold mb-3">Music Licensing Request</h1>
                    <p className="text-indigo-200">Search the catalog and submit a request to clear music for your next project.</p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 -mt-6">
                <Card className="shadow-lg border-0 mb-8 overflow-hidden">
                    <CardContent className="p-0">
                        {/* Search Bar */}
                        {!selectedWork && (
                            <div className="p-6 relative">
                                <Search className="absolute left-10 top-10 w-5 h-5 text-slate-400" />
                                <input
                                    className="w-full text-lg pl-12 pr-4 py-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                                    placeholder="Search by song title, artist, or ISRC..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />

                                {/* Search Results */}
                                {searchTerm && (
                                    <div className="mt-4 border border-slate-100 rounded-xl bg-white shadow-sm overflow-hidden">
                                        {searching ? (
                                            <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2">
                                                <Loader2 className="w-5 h-5 animate-spin" /> Searching catalog...
                                            </div>
                                        ) : works.length > 0 ? (
                                            <ul className="divide-y divide-slate-50">
                                                {works.slice(0, 5).map(work => (
                                                    <li
                                                        key={work.id}
                                                        className="p-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer"
                                                        onClick={() => setSelectedWork(work)}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                                                                <Music className="w-5 h-5 text-indigo-500" />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-semibold text-slate-900">{work.title}</h4>
                                                                <p className="text-xs text-slate-500">{work.isrc || "No ISRC"} • {work.artist}</p>
                                                            </div>
                                                        </div>
                                                        <Button variant="ghost" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">Select</Button>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <div className="p-8 text-center text-slate-500">
                                                No works found matching "{searchTerm}"
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Request Form */}
                        {selectedWork && (
                            <div className="p-6 md:p-8">
                                <div className="flex items-start justify-between mb-8 pb-6 border-b border-slate-100">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center">
                                            <Music className="w-7 h-7 text-indigo-600" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-slate-900 line-clamp-1">{selectedWork.title}</h2>
                                            <p className="text-slate-500">{selectedWork.artist || "Unknown Artist"}</p>
                                        </div>
                                    </div>
                                    <Button variant="outline" onClick={() => { setSelectedWork(null); setWorks([]); }} size="sm">
                                        Change Track
                                    </Button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid md:grid-cols-2 gap-6">
                                        {/* Contact Info */}
                                        <div className="space-y-4 md:col-span-2">
                                            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                                                <User className="w-4 h-4 text-slate-400" /> Contact Information
                                            </h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <input required placeholder="Your Name" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={form.requesterName} onChange={e => setForm({ ...form, requesterName: e.target.value })} />
                                                <input required type="email" placeholder="Email Address" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={form.requesterEmail} onChange={e => setForm({ ...form, requesterEmail: e.target.value })} />
                                                <input placeholder="Company / Production (Optional)" className="col-span-2 w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={form.requesterCompany} onChange={e => setForm({ ...form, requesterCompany: e.target.value })} />
                                            </div>
                                        </div>

                                        {/* Project Info */}
                                        <div className="space-y-4">
                                            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-slate-400" /> Project Details
                                            </h3>
                                            <input required placeholder="Project Title" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={form.projectTitle} onChange={e => setForm({ ...form, projectTitle: e.target.value })} />
                                            <select required className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={form.projectType} onChange={e => setForm({ ...form, projectType: e.target.value })}>
                                                <option value="" disabled>Select Project Type</option>
                                                <option value="Film">Film</option>
                                                <option value="Television">Television</option>
                                                <option value="Advertisement">Advertisement</option>
                                                <option value="Video Game">Video Game</option>
                                                <option value="Trailer">Trailer</option>
                                                <option value="Digital/Web">Digital / Web</option>
                                                <option value="Podcast">Podcast</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>

                                        {/* Rights Needed */}
                                        <div className="space-y-4">
                                            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                                                <Globe className="w-4 h-4 text-slate-400" /> Rights Required
                                            </h3>
                                            <input required placeholder="Media (e.g., All Media excluding Theatrical)" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={form.media} onChange={e => setForm({ ...form, media: e.target.value })} />
                                            <div className="grid grid-cols-2 gap-4">
                                                <input required placeholder="Territory (e.g., Worldwide)" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={form.territory} onChange={e => setForm({ ...form, territory: e.target.value })} />
                                                <input required placeholder="Term (e.g., In Perpetuity)" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={form.term} onChange={e => setForm({ ...form, term: e.target.value })} />
                                            </div>
                                        </div>

                                        {/* Additional Info */}
                                        <div className="space-y-4 md:col-span-2">
                                            <div className="grid grid-cols-2 gap-4">
                                                <input type="number" placeholder="Proposed Fee/Budget (USD)" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} />
                                            </div>
                                            <textarea placeholder="Scene description, usage context, or other notes..." className="w-full min-h-[100px] px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-slate-100 flex justify-end">
                                        <Button
                                            type="submit"
                                            size="lg"
                                            className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white gap-2 px-8"
                                            disabled={submitting}
                                        >
                                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />}
                                            Submit License Request
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

