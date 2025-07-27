// types/next-auth.d.ts

import NextAuth, { DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
    interface Session {
        user: {
            id?: string; // This will hold the user's unique Cognito ID
        } & DefaultSession["user"];
        // This will hold the secure token for our backend
        accessToken?: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        // This property will hold the user's unique Cognito ID
        userId?: string;
    }
}