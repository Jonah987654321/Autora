import { useAuth } from "@/context/AuthContext";
import { Navigate, Outlet } from "react-router";
import FullscreenLoader from "../ui/fullscreenLoader";

export function ProtectedLayout() {
    const { isAuthenticated, isLoading, hadSession } = useAuth();

    // Can't know if user was logged in previously
    if (isLoading && !hadSession) {
        return <FullscreenLoader />
    }

    // Loading finished & not authenticated -> redirect now
    if (!isLoading && !isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // hadSession was set -> render optimistically
    return <Outlet />;
}