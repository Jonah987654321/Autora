import { BrowserRouter, Outlet, Route, Routes } from "react-router";
import { AppSidebar } from "./components/layout/Sidebar";
import { SidebarProvider } from "./components/ui/sidebar";
import PageDashboard from "./pages/PageDashboard";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedLayout } from "./components/layout/ProtectdLayout";
import PageLogin from "./pages/PageLogin";
import PageRegister from "./pages/PageRegister";
import { PublicOnlyLayout } from "./components/layout/PublicOnlyLayout";
import PageSemester from "./pages/PageSemesters";
import { Toaster } from "./components/ui/sonner";

export default function App() {
  return (
    <>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* PUBLIC ROUTES - no login required */}
            <Route element={<PublicOnlyLayout />}>
              <Route path="/login" element={<PageLogin />} />
              <Route path="/register" element={<PageRegister />} />
            </Route>

            {/* PROTECTED ROUTES - only when logged in*/}
            <Route element={<ProtectedLayout />}>
              <Route
                element={
                  <SidebarProvider>
                    <AppSidebar />
                    <div className="flex-1">
                      <Outlet />
                    </div>
                  </SidebarProvider>
                }
              >
                <Route path="/" element={<PageDashboard />} />
                <Route path="/semesters" element={<PageSemester />} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
      <Toaster />
    </>
  );
}
