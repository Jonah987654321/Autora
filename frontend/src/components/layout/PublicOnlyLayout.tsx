import { Navigate, Outlet } from "react-router";
import { useAuth } from "../../context/AuthContext";
import FullscreenLoader from "../ui/fullscreenLoader";

export function PublicOnlyLayout() {
    const { isAuthenticated, isLoading, hadSession } = useAuth();

    if (isLoading && hadSession) {
        return <FullscreenLoader />
    }

    if (!isLoading && isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}