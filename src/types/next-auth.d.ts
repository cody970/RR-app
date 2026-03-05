import { DefaultSession } from "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            orgId?: string | null;
            role?: string;
        } & DefaultSession["user"];
    }

    interface User {
        orgId?: string | null;
        role?: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        orgId?: string | null;
        role?: string;
    }
}
