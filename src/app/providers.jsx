"use client";

import { AuthProvider } from "@/auth/AuthContext";
import { ToastProvider } from "@/components/feedback";

export default function Providers({ children }) {
  return (
    <AuthProvider>
      <ToastProvider>{children}</ToastProvider>
    </AuthProvider>
  );
}
