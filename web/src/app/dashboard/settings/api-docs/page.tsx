"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export default function ApiDocsPage() {
    const [spec, setSpec] = useState(null);

    useEffect(() => {
        fetch("/api/docs")
            .then(res => res.json())
            .then(data => setSpec(data))
            .catch(err => console.error("Error loading swagger spec:", err));
    }, []);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">API Documentation</h2>
                <p className="text-slate-500">Interactive OpenAPI specification for RoyaltyRadar</p>
            </div>

            <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                    {spec ? (
                        <div className="swagger-wrapper bg-white">
                            <SwaggerUI spec={spec} />
                        </div>
                    ) : (
                        <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
                            <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-amber-500 animate-spin mb-4" />
                            Loading API documentation...
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
