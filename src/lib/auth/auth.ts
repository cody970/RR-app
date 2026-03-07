import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcrypt";
import { db } from "@/lib/infra/db";

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_ID || "",
            clientSecret: process.env.GOOGLE_SECRET || "",
        }),
        GithubProvider({
            clientId: process.env.GITHUB_ID || "",
            clientSecret: process.env.GITHUB_SECRET || "",
        }),
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Missing credentials");
                }

                const user = await db.user.findUnique({
                    where: {
                        email: credentials.email,
                    },
                });

                if (!user || !user.passwordHash) {
                    throw new Error("Invalid username or password");
                }

                const isCorrectPassword = await bcrypt.compare(
                    credentials.password,
                    user.passwordHash
                );

                if (!isCorrectPassword) {
                    throw new Error("Invalid username or password");
                }

                return {
                    id: user.id,
                    email: user.email,
                    orgId: user.orgId,
                    role: user.role,
                };
            },
        }),
    ],
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async signIn({ user, account, profile }) {
            if (account?.provider === 'google' || account?.provider === 'github') {
                // Ensure the OAuth provider has verified the user's email address
                const isVerified = profile && ('email_verified' in profile ? profile.email_verified : true); // GitHub doesn't always provide email_verified directly on profile, but if it exists, check it.
                if (account?.provider === 'google' && !isVerified) {
                    console.warn(`[Auth] Rejected OAuth sign-in for unverified email: ${user.email}`);
                    return false;
                }

                const existingUser = await db.user.findUnique({ where: { email: user.email! } });
                if (!existingUser) {
                    // Auto-create user and organization for new OAuth logins
                    const orgName = user.name ? `${user.name}'s Workspace` : `${user.email?.split('@')[0]}'s Workspace`;
                    const org = await db.organization.create({
                        data: {
                            name: orgName,
                        }
                    });
                    const newUser = await db.user.create({
                        data: {
                            email: user.email!,
                            passwordHash: "$2b$10$OAUTH_USER_SENTINEL_DO_NOT_USE_FOR_LOGIN",
                            // Default to VIEWER; can be upgraded to ADMIN/OWNER after verification/setup
                            role: "VIEWER",
                            orgId: org.id
                        }
                    });
                    user.orgId = newUser.orgId;
                    user.role = newUser.role;
                    user.id = newUser.id;
                } else {
                    user.orgId = existingUser.orgId;
                    user.role = existingUser.role;
                    user.id = existingUser.id;
                }
            }
            return true;
        },
        async jwt({ token, user, account }) {
            if (user) {
                token.id = user.id;
                token.orgId = user.orgId;
                token.role = user.role;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id;
                session.user.orgId = token.orgId;
                session.user.role = token.role;
            }
            return session;
        },
    },
};
