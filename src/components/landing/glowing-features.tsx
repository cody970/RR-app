"use client";

import { Box, Lock, Search, Settings, Sparkles } from "lucide-react";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { cn } from "@/lib/infra/utils";

export function GlowingEffectDemo() {
    return (
        <ul className="grid grid-cols-1 grid-rows-none gap-4 md:grid-cols-12 md:grid-rows-3 lg:gap-4 xl:max-h-[34rem] xl:grid-rows-2">
            <GridItem
                area="md:[grid-area:1/1/2/7] xl:[grid-area:1/1/2/5]"
                icon={<Search className="h-4 w-4 text-indigo-600" />}
                title="Deep Metadata Audits"
                description="Automatically cross-reference your catalog against societies, DSPs, and global databases to find missing ISRC and ISWC linkages."
            />
            <GridItem
                area="md:[grid-area:1/7/2/13] xl:[grid-area:2/1/3/5]"
                icon={<Settings className="h-4 w-4 text-violet-600" />}
                title="Dispute Automation"
                description="Instantly generate and file CWR compliant dispute letters for split conflicts and under-claims across all major collection societies."
            />
            <GridItem
                area="md:[grid-area:2/1/3/7] xl:[grid-area:1/5/3/8]"
                icon={<Lock className="h-4 w-4 text-indigo-600" />}
                title="Bank-Grade Security"
                description="Your catalog data is protected by enterprise-level encryption, SOC 2 compliance, and immutable cryptographic audit trails."
            />
            <GridItem
                area="md:[grid-area:2/7/3/13] xl:[grid-area:1/8/2/13]"
                icon={<Sparkles className="h-4 w-4 text-violet-600" />}
                title="Anomaly Detection"
                description="Identify unusual streaming patterns and potential royalty fraud instantly with our machine learning models."
            />
            <GridItem
                area="md:[grid-area:3/1/4/13] xl:[grid-area:2/8/3/13]"
                icon={<Box className="h-4 w-4 text-indigo-600" />}
                title="Black Box Recovery"
                description="Identify unclaimed royalties sitting in society black boxes by matching unlinked DSP streaming data to your composition rights."
            />
        </ul>
    );
}

interface GridItemProps {
    area: string;
    icon: React.ReactNode;
    title: string;
    description: React.ReactNode;
}

const GridItem = ({ area, icon, title, description }: GridItemProps) => {
    return (
        <li className={cn("min-h-[14rem] list-none", area)}>
            <div className="relative h-full rounded-[1.25rem] border border-slate-100 p-2 md:rounded-[1.5rem] md:p-3 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-300">
                <GlowingEffect
                    spread={40}
                    glow={true}
                    disabled={false}
                    proximity={64}
                    inactiveZone={0.01}
                    borderWidth={3}
                />
                <div className="relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-xl bg-white p-6 md:p-6 glass-card">
                    <div className="relative flex flex-1 flex-col justify-between gap-3">
                        <div className="w-fit rounded-lg border border-indigo-100 bg-indigo-50/50 p-2 shadow-sm">
                            {icon}
                        </div>
                        <div className="space-y-3">
                            <h3 className="pt-0.5 text-xl leading-[1.375rem] font-black font-sans tracking-tight md:text-2xl md:leading-[1.875rem] text-balance text-slate-900">
                                {title}
                            </h3>
                            <p className="font-sans text-sm leading-[1.3rem] md:text-base md:leading-[1.5rem] text-slate-500 font-medium opacity-80">
                                {description}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </li>
    );
};
