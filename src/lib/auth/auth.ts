import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcrypt";
import { db } from "@/lib/infra/db";
import { logger } from "@/lib/infra/logger";
import crypto from "crypto";
import { checkRateLimit } from "@/lib/infra/rate-limit";

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

                // Rate limit login attempts by email
                const rateCheck = await checkRateLimit({
                    key: `login:${credentials.email.toLowerCase()}`,
                    limit: 5,
                    windowMs: 300_000, // 5 minutes
                });

                if (!rateCheck.success) {
                    logger.warn({
                        email: credentials.email,
                        count: rateCheck.count,
                        limit: rateCheck.limit,
                    }, "Rate limit exceeded for login attempt");
                    throw new Error("Too many login attempts. Please try again in 5 minutes.");
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
            const clientIp = "unknown"; // In a real Next.js app, you'd get this from headers

            if (account?.provider === 'google' || account?.provider === 'github') {
                // Rate limit OAuth attempts by email
                const rateCheck = await checkRateLimit({
                    key: `oauth:${account?.provider}:${user.email?.toLowerCase()}`,
                    limit: 10,
                    windowMs: 3600_000, // 1 hour
                });

                if (!rateCheck.success) {
                    logger.warn({
                        email: user.email,
                        provider: account.provider,
                        count: rateCheck.count,
                        limit: rateCheck.limit,
                    }, "Rate limit exceeded for OAuth attempt");
                    return false;
                }

                // Ensure the OAuth provider has verified the user's email address
                const isVerified = profile && ('email_verified' in profile ? (profile as any).email_verified : true);

                if (!isVerified) {
                    logger.warn({
                        email: user.email,
                        provider: account.provider,
                        type: "AUTH_UNVERIFIED_EMAIL"
                    }, "Rejected OAuth sign-in: Unverified email");
                    return false;
                }

                const existingUser = await db.user.findUnique({ where: { email: user.email! } });
                if (!existingUser) {
                    logger.info({ email: user.email, provider: account.provider }, "Auto-creating user from OAuth login");

                    const orgName = user.name ? `${user.name}'s Workspace` : `${user.email?.split('@')[0]}'s Workspace`;
                    const org = await db.organization.create({
                        data: {
                            name: orgName,
                        }
                    });

                    const newUser = await db.user.create({
                        data: {
                            email: user.email!,
                            // Secure sentinel that cannot be used for login but satisfies the DB constraint
                            passwordHash: `OAUTH_ONLY_${crypto.randomBytes(32).toString('hex')}`,
                            role: "OWNER", // First user is owner
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

                logger.info({
                    userId: user.id,
                    email: user.email,
                    provider: account.provider
                }, "OAuth login successful");
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
