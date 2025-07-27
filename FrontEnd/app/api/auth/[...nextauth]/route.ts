import NextAuth from "next-auth";
import { JWT, encode } from "next-auth/jwt";
import jwt from "jsonwebtoken";
import GoogleProvider from "next-auth/providers/google";
import LinkedInProvider from "next-auth/providers/linkedin";
import CredentialsProvider from "next-auth/providers/credentials";
import { CognitoIdentityProviderClient, AdminGetUserCommand, AdminCreateUserCommand } from "@aws-sdk/client-cognito-identity-provider";

const cognitoClient = new CognitoIdentityProviderClient({
    region: process.env.COGNITO_REGION,
});

async function getCognitoUserId(email: string): Promise<string | null> {
    // Helper function to find a user's unique ID (sub) in Cognito
    try {
        const userResponse = await cognitoClient.send(new AdminGetUserCommand({
            UserPoolId: process.env.COGNITO_USER_POOL_ID!,
            Username: email,
        }));
        return userResponse.UserAttributes?.find(attr => attr.Name === 'sub')?.Value || null;
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
        }),

        LinkedInProvider({
            clientId: process.env.LINKEDIN_CLIENT_ID!,
            clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
            issuer: "https://www.linkedin.com/oauth", // Explicitly define the issuer
            jwks_endpoint: "https://www.linkedin.com/oauth/openid/jwks",
            userinfo: {
                url: "https://api.linkedin.com/v2/userinfo",
            },
            // This profile callback correctly extracts the user's info from LinkedIn's specific format
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
                // This is where we call YOUR backend FileService
                if (!credentials) return null;

                try {
                    const response = await fetch('http://localhost:8001/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: credentials.email,
                            password: credentials.password,
                        }),
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        // If Cognito returns an error, throw it so next-auth can display it
                        throw new Error(data.detail || 'Authentication failed');
                    }

                    // If the login is successful, Cognito returns tokens.
                    // We now need to get the user's profile info (like name and ID).
                    // You could add another endpoint in FileService to get user details by email.
                    // For now, we'll return a basic user object.
                    if (data.IdToken) {
                        // In a real app, you'd decode the IdToken to get user details
                        // For now, we'll just use the email as a placeholder
                        return { id: credentials.email, name: 'User', email: credentials.email };
                    }

                    return null; // Return null if authentication fails

                } catch (error: any) {
                    // You can log the error and then throw it to be displayed on the front end
                    console.error("Credentials Auth Error:", error.message);
                    throw new Error(error.message);
                }
            }
        })
    ],

    // --- ADD THIS SESSION CONFIGURATION ---
    session: {
        strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET,

    // --- ADD THIS JWT CONFIGURATION ---
    jwt: {
        secret: process.env.NEXTAUTH_SECRET,
    },

    callbacks: {
        async signIn({ user, account, profile }) {
            // For debugging, it's helpful to see the raw data:
            console.log("User from provider:", user);
            console.log("Profile from provider:", profile);

            if (!user.email) {
                return false; // Must have email to proceed
            }

            try {
                try {
                    // 1. Check if user exists in Cognito.
                    await cognitoClient.send(new AdminGetUserCommand({
                        UserPoolId: process.env.COGNITO_USER_POOL_ID!,
                        Username: user.email,
                    }));

                    // If this succeeds, the user exists. This is a successful LOGIN.
                    return true;

                } catch (error: any) {
                    // If user is not found, this is a SIGNUP.
                    if (error.name !== 'UserNotFoundException') {
                        throw error;
                    }
                }

                // 2. User was not found, so create them in Cognito.
                // --- UPDATED: Handle different profile structures ---
                let givenName = 'User';
                let familyName = '';

                if (account?.provider === 'google') {
                    givenName = (profile as any)?.given_name || user.name?.split(' ')[0] || 'User';
                    familyName = (profile as any)?.family_name || user.name?.split(' ').slice(1).join(' ') || '';
                } else if (account?.provider === 'linkedin') {
                    // LinkedIn uses a different structure
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

                // 3. IMPORTANT: Also create their profile in your own DynamoDB via FileService
                if (createUserResponse.User) {
                    const cognitoUserId = createUserResponse.User.Attributes?.find(attr => attr.Name === 'sub')?.Value;
                    if (cognitoUserId) {
                        await fetch('http://localhost:8001/auth/social-signup', {
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

        // --- UPDATED JWT and Session callbacks ---
        async jwt({ token, user, account }) {
            // This runs after sign-in.
            if (user?.email) {
                const cognitoUserId = await getCognitoUserId(user.email);
                if (cognitoUserId) {
                    // This is the most important step: set the 'sub' (subject) claim
                    // to be our unique Cognito ID.
                    token.sub = cognitoUserId;
                }
            }
            return token;
        },

        async session({ session, token }) {
            // This makes the user ID available on the client-side session object.
            if (session.user && token.sub) {
                session.user.id = token.sub;
            }

            // We manually encode the token to get the raw JWT string
            // and attach it to the session so the frontend can use it.
            const encodedToken = await encode({ token, secret: process.env.NEXTAUTH_SECRET! });
            session.accessToken = encodedToken;
            return session;
        },
    },
    pages: {
        error: '/login',
    }
});

export { handler as GET, handler as POST };