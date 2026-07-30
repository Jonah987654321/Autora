// src/components/ProtectedLayout.tsx
import { useAuth } from "@/context/AuthContext";
import { Navigate, Outlet } from "react-router";

export function ProtectedLayout() {
    const { isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}