// app/api/auth/[...nextauth]/route.ts - Production version

import NextAuth from "next-auth";
import { JWT } from "next-auth/jwt";
import jwt from "jsonwebtoken";
import GoogleProvider from "next-auth/providers/google";
import LinkedInProvider from "next-auth/providers/linkedin";
import CredentialsProvider from "next-auth/providers/credentials";
import { CognitoIdentityProviderClient, AdminGetUserCommand, AdminCreateUserCommand } from "@aws-sdk/client-cognito-identity-provider";

// Add environment variable validation
if (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET.length < 32) {
    throw new Error("NEXTAUTH_SECRET must be at least 32 characters long");
}

const cognitoClient = new CognitoIdentityProviderClient({
    region: process.env.COGNITO_REGION,
});

// Cache for Cognito user lookups to reduce API calls
const userIdCache = new Map<string, { id: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCognitoUserId(email: string): Promise<string | null> {
    // Check cache first
    const cached = userIdCache.get(email);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.id;
    }

    try {
        const userResponse = await cognitoClient.send(new AdminGetUserCommand({
            UserPoolId: process.env.COGNITO_USER_POOL_ID!,
            Username: email,
        }));

        const userId = userResponse.UserAttributes?.find(attr => attr.Name === 'sub')?.Value || null;

        if (userId) {
            userIdCache.set(email, { id: userId, timestamp: Date.now() });
        }

        return userId;
    } catch (error) {
        console.error("Failed to get Cognito user ID", error);
        return null;
    }
}

const handler = NextAuth({
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
                params: {
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code"
                }
            }
        }),

        LinkedInProvider({
            clientId: process.env.LINKEDIN_CLIENT_ID!,
            clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
            issuer: "https://www.linkedin.com/oauth",
            jwks_endpoint: "https://www.linkedin.com/oauth/openid/jwks",
            userinfo: {
                url: "https://api.linkedin.com/v2/userinfo",
            },
            async profile(profile, tokens) {
                return {
                    id: profile.sub,
                    name: `${profile.given_name} ${profile.family_name}`,
                    email: profile.email,
                    image: profile.picture,
                };
            },
        }),

        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials, req) {
                if (!credentials) return null;

                try {
                    // Use environment variable for backend URL
                    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8001';
                    const response = await fetch(`${backendUrl}/auth/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: credentials.email,
                            password: credentials.password,
                        }),
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        throw new Error(data.detail || 'Authentication failed');
                    }

                    if (data.IdToken) {
                        return {
                            id: credentials.email,
                            name: 'User',
                            email: credentials.email
                        };
                    }

                    return null;

                } catch (error: any) {
                    console.error("Credentials Auth Error:", error.message);
                    throw new Error(error.message);
                }
            }
        })
    ],

    session: {
        strategy: "jwt",
        maxAge: 7 * 24 * 60 * 60, // 7 days
    },

    secret: process.env.NEXTAUTH_SECRET,

    jwt: {
        secret: process.env.NEXTAUTH_SECRET,

        async encode({ secret, token, maxAge }) {
            const jwtPayload = {
                sub: token?.sub || token?.userId,
                name: token?.name,
                email: token?.email,
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + (maxAge || 7 * 24 * 60 * 60),
            };

            return jwt.sign(jwtPayload, secret, { algorithm: 'HS256' });
        },

        async decode({ secret, token }) {
            try {
                const decoded = jwt.verify(token!, secret, {
                    algorithms: ['HS256'],
                    maxAge: '7d' // Additional validation
                }) as JWT;
                return decoded;
            } catch (error) {
                console.error("JWT decode error:", error);
                return null;
            }
        },
    },

    callbacks: {
        async signIn({ user, account, profile }) {
            // Rate limiting check could go here
            console.log(`Sign in attempt for: ${user.email}`);

            if (!user.email) {
                return false;
            }

            try {
                try {
                    await cognitoClient.send(new AdminGetUserCommand({
                        UserPoolId: process.env.COGNITO_USER_POOL_ID!,
                        Username: user.email,
                    }));
                    return true;

                } catch (error: any) {
                    if (error.name !== 'UserNotFoundException') {
                        throw error;
                    }
                }

                // Create new user
                let givenName = 'User';
                let familyName = '';

                if (account?.provider === 'google' || account?.provider === 'linkedin') {
                    givenName = (profile as any)?.given_name || user.name?.split(' ')[0] || 'User';
                    familyName = (profile as any)?.family_name || user.name?.split(' ').slice(1).join(' ') || '';
                }

                const createUserResponse = await cognitoClient.send(new AdminCreateUserCommand({
                    UserPoolId: process.env.COGNITO_USER_POOL_ID!,
                    Username: user.email,
                    UserAttributes: [
                        { Name: 'email', Value: user.email },
                        { Name: 'email_verified', Value: 'true' },
                        { Name: 'given_name', Value: givenName },
                        { Name: 'family_name', Value: familyName },
                    ],
                }));

                if (createUserResponse.User) {
                    const cognitoUserId = createUserResponse.User.Attributes?.find(attr => attr.Name === 'sub')?.Value;
                    if (cognitoUserId) {
                        const backendUrl = process.env.BACKEND_URL || 'http://localhost:8001';
                        await fetch(`${backendUrl}/auth/social-signup`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                user_id: cognitoUserId,
                                email: user.email,
                                name: `${givenName} ${familyName}`,
                            })
                        });
                    }
                }

                return true;

            } catch (error) {
                console.error("Error in signIn callback:", error);
                return false;
            }
        },

        async jwt({ token, user, account }) {
            if (user?.email) {
                const cognitoUserId = await getCognitoUserId(user.email);
                if (cognitoUserId) {
                    token.sub = cognitoUserId;
                    token.userId = cognitoUserId;
                }
                token.email = user.email;
                token.name = user.name;
            }
            return token;
        },

        async session({ session, token }) {
            if (session.user && token.sub) {
                session.user.id = token.sub as string;
            }

            // Generate fresh JWT for each session
            const accessToken = jwt.sign(
                {
                    sub: token.sub,
                    name: token.name,
                    email: token.email,
                    iat: Math.floor(Date.now() / 1000),
                    exp: token.exp as number,
                },
                process.env.NEXTAUTH_SECRET!,
                { algorithm: 'HS256' }
            );

            session.accessToken = accessToken;

            return session;
        },
    },

    pages: {
        signIn: '/login',
        error: '/login',
    },

    // Production security settings
    cookies: {
        sessionToken: {
            name: `__Secure-next-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: true, // Always use secure cookies in production
            },
        },
    },
});

export { handler as GET, handler as POST };