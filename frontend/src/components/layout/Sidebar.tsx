import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "../ui/sidebar"
import { LayoutDashboard, Settings, WalletCards, NotepadText, CalendarClock, FolderOpen, Archive } from "lucide-react"
import { NavLink, useLocation } from "react-router"

const entries = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Zeitplanung",
    url: "/time-management",
    icon: CalendarClock
  },
  {
    title: "Vorlesungsmitschriften",
    url: "/lecture-notes",
    icon: NotepadText,
  },
  {
    title: "Karteikarten",
    url: "/flashcards",
    icon: WalletCards,
  },
  {
    title: "Dateien",
    url: "/files",
    icon: FolderOpen
  },
  {
    title: "Archiv",
    url: "/archive",
    icon: Archive
  }
]

export function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="p-2 font-bold text-lg">Autora</div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {entries.map((item) => {
                const isActive = location.pathname === item.url;
                return <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild  isActive={isActive}>
                    <NavLink to={item.url} end>
                      <item.icon />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Letzte Vorlesungen</SidebarGroupLabel>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
             <SidebarMenuButton asChild isActive={location.pathname === "/settings"}>
                <NavLink to="/settings">
                  <Settings />
                  <span>Einstellungen</span>
                </NavLink>
              </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}