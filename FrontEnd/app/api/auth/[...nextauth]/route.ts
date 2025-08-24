// app/api/auth/[...nextauth]/route.ts - Minimal fix version (no extra caching)

import NextAuth from "next-auth";
import { JWT } from "next-auth/jwt";
import jwt from "jsonwebtoken";
import GoogleProvider from "next-auth/providers/google";
import LinkedInProvider from "next-auth/providers/linkedin";
import CredentialsProvider from "next-auth/providers/credentials";
import {
    CognitoIdentityProviderClient,
    AdminGetUserCommand,
    AdminCreateUserCommand,
    AdminSetUserPasswordCommand, // ✅ added
} from "@aws-sdk/client-cognito-identity-provider";

const FILES_API_URL = process.env.NEXT_PUBLIC_FILES_API_URL;

// keep your original secret guard
if (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET.length < 32) {
    throw new Error("NEXTAUTH_SECRET must be at least 32 characters long");
}

const cognitoClient = new CognitoIdentityProviderClient({
    region: process.env.COGNITO_REGION,
});

// --- tiny helpers (no cache) -------------------------------------------------

async function getCognitoSubWithRetry(
    email: string,
    retries = 3,
    delay = 500 // 500ms delay
): Promise<string | null> {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await cognitoClient.send(
                new AdminGetUserCommand({
                    UserPoolId: process.env.COGNITO_USER_POOL_ID!,
                    Username: email,
                })
            );
            const sub = res.UserAttributes?.find((a) => a.Name === "sub")?.Value;
            if (sub) {
                return sub; // Success!
            }
        } catch (error) {
            // Ignore 'UserNotFoundException' and retry
            if ((error as Error).name !== "UserNotFoundException") {
                throw error; // Re-throw other errors
            }
        }
        // Wait before the next attempt
        if (i < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    return null; // Failed after all retries
}

// replace the existing randomStrongPassword in app/api/auth/[...nextauth]/route.ts
function randomStrongPassword(length = 32) {
    const lowers = "abcdefghijklmnopqrstuvwxyz";
    const uppers = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const digits = "0123456789";
    const symbols = "!@#$%^&*()-_=+[]{}:,.;?"; // safe, common ASCII set

    if (length < 12) length = 12; // be sane; Cognito default min is 8

    // ensure at least one of each required class
    const pick = (set: string) => set[Math.floor(Math.random() * set.length)];
    const required = [pick(lowers), pick(uppers), pick(digits), pick(symbols)];

    // fill the rest from the full pool
    const all = lowers + uppers + digits + symbols;
    const restCount = length - required.length;
    for (let i = 0; i < restCount; i++) required.push(pick(all));

    // Fisher–Yates shuffle
    for (let i = required.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [required[i], required[j]] = [required[j], required[i]];
    }
    return required.join("");
}


// -----------------------------------------------------------------------------

const handler = NextAuth({
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
                params: {
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code",
                },
            },
        }),

        LinkedInProvider({
            clientId: process.env.LINKEDIN_CLIENT_ID!,
            clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
            issuer: "https://www.linkedin.com/oauth",
            jwks_endpoint: "https://www.linkedin.com/oauth/openid/jwks",
            userinfo: { url: "https://api.linkedin.com/v2/userinfo" },
            async profile(profile) {
                return {
                    id: profile.sub,
                    name: `${profile.given_name} ${profile.family_name}`,
                    email: profile.email,
                    image: profile.picture,
                };
            },
        }),

        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials) return null;

                const response = await fetch(`${FILES_API_URL}/auth/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: credentials.email,
                        password: credentials.password,
                    }),
                });

                const data = await response.json();

                if (!response.ok) {
                    if (response.status === 401 && data.detail === "USER_NOT_CONFIRMED") {
                        throw new Error("ACCOUNT_NOT_VERIFIED");
                    }
                    throw new Error(data.detail || "Authentication failed");
                }

                // --- THIS IS THE FIX ---
                // Use the UserId from the backend as the user's ID
                if (data.AuthenticationResult && data.UserId) {
                    return {
                        id: data.UserId, // Use the real Cognito User ID
                        email: credentials.email,
                    };
                }
                // --- END OF FIX ---
                return null;
            },
        }),
    ],

    session: {
        strategy: "jwt",
        maxAge: 7 * 24 * 60 * 60,
    },

    secret: process.env.NEXTAUTH_SECRET,

    jwt: {
        secret: process.env.NEXTAUTH_SECRET,

        async encode({ secret, token, maxAge }) {
            const payload = {
                sub: token?.sub || token?.userId,
                name: token?.name,
                email: token?.email,
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + (maxAge || 7 * 24 * 60 * 60),
            };
            return jwt.sign(payload, secret, { algorithm: "HS256" });
        },

        async decode({ secret, token }) {
            try {
                return jwt.verify(token!, secret, {
                    algorithms: ["HS256"],
                    maxAge: "7d",
                }) as JWT;
            } catch {
                return null;
            }
        },
    },

    callbacks: {
        async signIn({ user, account, profile }) {
            if (!user.email) return false;

            try {
                // Social providers: ensure user exists and is CONFIRMED (no FORCE_CHANGE_PASSWORD)
                if (account?.provider === "google" || account?.provider === "linkedin") {
                    const givenName =
                        (profile as any)?.given_name || user.name?.split(" ")[0] || "User";
                    const familyName =
                        (profile as any)?.family_name ||
                        user.name?.split(" ").slice(1).join(" ") ||
                        "";

                    // 1) already in pool?
                    let sub = await getCognitoSubWithRetry(user.email);

                    // 2) if not, create + set permanent password to CONFIRM
                    if (!sub) {
                        await cognitoClient.send(
                            new AdminCreateUserCommand({
                                UserPoolId: process.env.COGNITO_USER_POOL_ID!,
                                Username: user.email,
                                UserAttributes: [
                                    { Name: "email", Value: user.email },
                                    { Name: "email_verified", Value: "true" },
                                    { Name: "given_name", Value: givenName },
                                    { Name: "family_name", Value: familyName },
                                ],
                                MessageAction: "SUPPRESS",
                            })
                        );

                        await cognitoClient.send(
                            new AdminSetUserPasswordCommand({
                                UserPoolId: process.env.COGNITO_USER_POOL_ID!,
                                Username: user.email,
                                Password: randomStrongPassword(),
                                Permanent: true,
                            })
                        );

                        sub = await getCognitoSubWithRetry(user.email);
                        if (!sub) throw new Error("Failed to obtain Cognito sub after creation");
                    }

                    (user as any).id = sub; // <-- ADD THIS LINE

                    // 3) create Dynamo profile with that exact sub (idempotent on backend):contentReference[oaicite:1]{index=1}
                    await fetch(`${FILES_API_URL}/auth/social-signup`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            user_id: sub,
                            email: user.email,
                            name: `${givenName} ${familyName}`,
                        }),
                    });

                    return true;
                }

                // Credentials flow: nothing special here
                return true;
            } catch (err) {
                console.error("Error in signIn callback:", err);
                return false;
            }
        },

        async jwt({ token, user }) {
            // If user object exists (on first sign in), use the id we passed from the signIn callback
            if (user) {
                token.sub = user.id;
                token.userId = user.id;
                token.email = user.email;
                token.name = user.name;
            }
            return token;
        },

        async session({ session, token }) {
            if (session.user && token.sub) {
                session.user.id = token.sub as string;
            }

            // sign a short-lived app token (same as you had)
            session.accessToken = jwt.sign(
                {
                    sub: token.sub,
                    name: token.name,
                    email: token.email,
                    iat: Math.floor(Date.now() / 1000),
                    exp: token.exp as number,
                },
                process.env.NEXTAUTH_SECRET!,
                { algorithm: "HS256" }
            );

            return session;
        },
    },

    pages: {
        signIn: "/login",
        error: "/login",
    },

    cookies: {
        sessionToken: {
            name: `__Secure-next-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: true,
            },
        },
    },
});

export { handler as GET, handler as POST };
