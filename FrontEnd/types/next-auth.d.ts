// types/next-auth.d.ts

import NextAuth, { DefaultSession, Profile } from "next-auth"

// Extend the built-in session and user types
declare module "next-auth" {
    /**
     * The shape of the user object returned in the OAuth providers' profile callback,
     * available here for convenience.
     */
    interface Profile {
        given_name?: string;
        family_name?: string;
    }
}

declare module "next-auth" {
    interface Session {
        user: {
            id?: string; // Add the id field
        } & DefaultSession["user"];
    }
}