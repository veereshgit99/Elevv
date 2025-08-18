"use client";

import { SessionProvider } from "next-auth/react";
import type { FC, ReactNode } from "react";

interface ProvidersProps {
    children: ReactNode;
}

const Providers: FC<ProvidersProps> = ({ children }) => {
    // Add the refetchOnWindowFocus={false} prop here
    return (
        <SessionProvider refetchOnWindowFocus={false}>
            {children}
        </SessionProvider>
    );
};

export default Providers;