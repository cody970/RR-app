import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcrypt";
import { z } from "zod";

const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    organizationName: z.string().min(2),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, password, organizationName } = registerSchema.parse(body);

        const existingUser = await db.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json({ error: "Email already in use" }, { status: 400 });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        // Create the organization and user in a transaction
        const user = await db.$transaction(async (tx) => {
            const org = await tx.organization.create({
                data: {
                    name: organizationName,
                },
            });

            return tx.user.create({
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
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
