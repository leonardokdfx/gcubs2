"use client";

import { AuthProvider } from "@/auth/AuthContext";
import { EquipesProvider } from "@/auth/EquipesContext";
import { ToastProvider } from "@/components/feedback";

export default function Providers({ children }) {
  return (
    <AuthProvider>
      <EquipesProvider>
        <ToastProvider>{children}</ToastProvider>
      </EquipesProvider>
    </AuthProvider>
  );
}
