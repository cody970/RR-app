import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            orgId: string;
            role: string;
            writerId?: string | null;
            publisherId?: string | null;
        } & DefaultSession["user"];
    }

    interface User {
        id: string;
        orgId: string;
        role: string;
        writerId?: string | null;
        publisherId?: string | null;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        orgId: string;
        role: string;
        writerId?: string | null;
        publisherId?: string | null;
    }
}
