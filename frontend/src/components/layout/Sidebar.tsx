import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
} from "@/components/ui/sidebar";
import {
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "../ui/sidebar";
import {
  LayoutDashboard,
  Settings,
  WalletCards,
  NotepadText,
  CalendarClock,
  FolderOpen,
  Archive,
  LogOutIcon,
} from "lucide-react";
import { NavLink, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";

export function AppSidebar() {
  const location = useLocation();
  const { t } = useTranslation();
  const { logout } = useAuth();

  const entries = [
    {
      title: t("sidebar.dashboard"),
      url: "/",
      icon: LayoutDashboard,
    },
    {
      title: t("sidebar.timeManagement"),
      url: "/time-management",
      icon: CalendarClock,
    },
    {
      title: t("sidebar.lectureNotes"),
      url: "/lecture-notes",
      icon: NotepadText,
    },
    {
      title: t("sidebar.flashcards"),
      url: "/flashcards",
      icon: WalletCards,
    },
    {
      title: t("sidebar.files"),
      url: "/files",
      icon: FolderOpen,
    },
    {
      title: t("sidebar.archive"),
      url: "/archive",
      icon: Archive,
    },
  ];

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="p-2 font-bold text-lg">Autora</div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("sidebar.navigation")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {entries.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <NavLink to={item.url} end>
                        <item.icon />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t("sidebar.recentLectures")}</SidebarGroupLabel>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={location.pathname === "/settings"}
            >
              <NavLink to="/settings">
                <Settings />
                <span>{t("sidebar.settings")}</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={(_) => logout()}
            >
                <LogOutIcon />
                <span>{t("sidebar.logout")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
