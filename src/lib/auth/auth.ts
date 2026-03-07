import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcrypt";
import { db } from "@/lib/infra/db";
import { logger } from "@/lib/infra/logger";
import crypto from "crypto";

// CRIT-7: Enforce NEXTAUTH_SECRET is set in production to prevent JWT forgery
if (!process.env.NEXTAUTH_SECRET && process.env.NODE_ENV === "production") {
    throw new Error(
        "NEXTAUTH_SECRET environment variable is required in production. " +
        "JWT tokens cannot be securely signed without it."
    );
}

export const authOptions: NextAuthOptions = {
    // Explicitly set the secret for JWT signing
    secret: process.env.NEXTAUTH_SECRET,
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
                // Type assertion needed because profile shape varies by provider
                const isVerified = profile && ('email_verified' in profile ? (profile as { email_verified?: boolean }).email_verified : true);

                if (!isVerified) {
                    logger.warn({
                        email: user.email,
                        provider: account.provider,
                        type: "AUTH_UNVERIFIED_EMAIL"
                    }, "Rejected OAuth sign-in: Unverified email");
                    return false;
                }

                const normalizedEmail = user.email!.toLowerCase();
                const existingUser = await db.user.findUnique({ where: { email: normalizedEmail } });
                
                if (!existingUser) {
                    // Check for pending invitation for this email
                    // CODE_REVIEW #7 FIX: New users should join via invitation, not auto-create orgs with OWNER role
                    const pendingInvitation = await db.orgInvitation.findFirst({
                        where: {
                            email: normalizedEmail,
                            status: "PENDING",
                            expiresAt: { gt: new Date() }
                        },
                        include: {
                            organization: true
                        }
                    });

                    if (pendingInvitation) {
                        // User has a pending invitation - join that org with the invited role
                        logger.info({ 
                            email: normalizedEmail, 
                            provider: account.provider,
                            orgId: pendingInvitation.orgId,
                            role: pendingInvitation.role
                        }, "Creating user from OAuth login via invitation");

                        const newUser = await db.user.create({
                            data: {
                                email: normalizedEmail,
                                passwordHash: `OAUTH_ONLY_${crypto.randomBytes(32).toString('hex')}`,
                                role: pendingInvitation.role, // Use role from invitation (defaults to VIEWER)
                                orgId: pendingInvitation.orgId
                            }
                        });

                        // Mark invitation as accepted
                        await db.orgInvitation.update({
                            where: { id: pendingInvitation.id },
                            data: { 
                                status: "ACCEPTED",
                                acceptedAt: new Date()
                            }
                        });

                        user.orgId = newUser.orgId;
                        user.role = newUser.role;
                        user.id = newUser.id;

                        logger.info({
                            userId: newUser.id,
                            email: normalizedEmail,
                            orgId: pendingInvitation.orgId,
                            role: pendingInvitation.role
                        }, "User joined organization via invitation");
                    } else {
                        // No invitation - create new org with OWNER role
                        // This is the legitimate case: user is starting their own workspace
                        logger.info({ email: normalizedEmail, provider: account.provider }, "Auto-creating user and organization from OAuth login");

                        const orgName = user.name ? `${user.name}'s Workspace` : `${normalizedEmail.split('@')[0]}'s Workspace`;
                        const org = await db.organization.create({
                            data: {
                                name: orgName,
                            }
                        });

                        const newUser = await db.user.create({
                            data: {
                                email: normalizedEmail,
                                // Secure sentinel that cannot be used for login but satisfies the DB constraint
                                passwordHash: `OAUTH_ONLY_${crypto.randomBytes(32).toString('hex')}`,
                                role: "OWNER", // First user of new org is owner
                                orgId: org.id
                            }
                        });

                        user.orgId = newUser.orgId;
                        user.role = newUser.role;
                        user.id = newUser.id;
                    }
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
        async jwt({ token, user }) {
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
