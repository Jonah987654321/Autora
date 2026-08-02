import { useAuth } from "@/context/AuthContext";
import { Navigate, Outlet } from "react-router";
import FullscreenLoader from "../ui/fullscreenLoader";

export function ProtectedLayout() {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return <FullscreenLoader />
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}