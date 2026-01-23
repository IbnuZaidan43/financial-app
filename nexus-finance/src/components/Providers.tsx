'use client';

import { SessionProvider } from "next-auth/react";
import { FinancialProvider } from "@/lib/financial-context";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <FinancialProvider>
        {children}
      </FinancialProvider>
    </SessionProvider>
  );
}