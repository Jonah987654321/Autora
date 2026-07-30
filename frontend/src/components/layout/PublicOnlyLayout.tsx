// components/layout/PublicOnlyLayout.tsx
import { Navigate, Outlet } from "react-router";
import { useAuth } from "../../context/AuthContext";
import FullscreenLoader from "../ui/fullscreenLoader";

export function PublicOnlyLayout() {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return <FullscreenLoader />
    }

    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}