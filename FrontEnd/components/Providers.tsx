"use client"; // This directive marks this as a Client Component

import { SessionProvider } from "next-auth/react";
import type { FC, ReactNode } from "react";

interface ProvidersProps {
    children: ReactNode;
}

const Providers: FC<ProvidersProps> = ({ children }) => {
    // We wrap the children with the SessionProvider here
    return <SessionProvider>{children}</SessionProvider>;
};

export default Providers;