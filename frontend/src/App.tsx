import { BrowserRouter, Route, Routes } from "react-router";
import { AppSidebar } from "./components/layout/Sidebar";
import { SidebarProvider } from "./components/ui/sidebar";
import PageDashboard from "./pages/PageDashboard";

export default function App() {
  return (
    <>
      <BrowserRouter>
        <SidebarProvider>
          <AppSidebar />
          <div className="flex-1">
            <Routes>
              <Route path="/" element={<PageDashboard />} />
            </Routes>
          </div>
        </SidebarProvider>
      </BrowserRouter>
    </>
  );
}
