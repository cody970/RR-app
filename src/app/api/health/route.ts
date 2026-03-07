import { NextResponse } from "next/server";
import { db } from "@/lib/infra/db";
import { redis } from "@/lib/infra/redis";

export async function GET() {
    try {
        // Check DB connection
        await db.$queryRaw`SELECT 1`;

        // Check Redis connection
        await redis.ping();

        return NextResponse.json({
            status: "healthy",
            timestamp: new Date().toISOString(),
            version: process.env.APP_VERSION || "1.0.0",
            uptime: Math.floor(process.uptime()),
            services: {
                database: "up",
                redis: "up"
            }
        });
    } catch (error: any) {
        console.error("Health check failed:", error);
        return NextResponse.json(
            {
                status: "unhealthy",
                timestamp: new Date().toISOString(),
                error: error.message,
                services: {
                    database: "unknown",
                    redis: "unknown"
                }
            },
            { status: 503 }
        );
    }
}
