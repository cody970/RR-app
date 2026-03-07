import { NextResponse } from "next/server";
import { db } from "@/lib/infra/db";
import bcrypt from "bcrypt";
import { checkRateLimit } from "@/lib/infra/rate-limit";
import { z } from "zod";
import { apiError } from "@/lib/infra/utils";

const passwordSchema = z.string()
    .min(12, "Password must be at least 12 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

const registerSchema = z.object({
    email: z.string().email(),
    password: passwordSchema,
    organizationName: z.string().min(2),
});

export async function POST(req: Request) {
    try {
        const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
            || "unknown";

        const rateCheck = await checkRateLimit({
            key: `register:${ipAddress}`,
            limit: 5,
            windowMs: 3600_000, // 5 requests per hour
        });

        if (!rateCheck.success) {
            return apiError("Too many registration attempts. Please try again in an hour.", 429);
        }

        const body = await req.json().catch(() => ({}));
        const parsed = registerSchema.safeParse(body);

        if (!parsed.success) {
            return apiError("Invalid registration data", 400, parsed.error.flatten());
        }

        const { email, password, organizationName } = parsed.data;

        const existingUser = await db.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return apiError("Email already in use", 400);
        }

        const passwordHash = await bcrypt.hash(password, 10);

        // Create the organization and user in a transaction
        await db.$transaction(async (tx: any) => {
            const org = await tx.organization.create({
                data: {
                    name: organizationName,
                },
            });

            await tx.user.create({
                data: {
                    email,
                    passwordHash,
                    role: "OWNER",
                    orgId: org.id,
                },
            });
        });

        return NextResponse.json({ success: true }, { status: 201 });
    } catch (error) {
        console.error("Registration error:", error);
        return apiError("Internal Server Error", 500);
    }
}
