import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type CalendarEvent from "@/models/event";
import { PenBoxIcon, TrashIcon } from "lucide-react";
import EventDelete from "./eventDelete";
import { useState } from "react";
import EventDialog from "./eventDialog";

interface EventCtxMenuProps {
  target: CalendarEvent;
  children: React.ReactNode;
  onRefreshRequired?: () => void;
}

export default function EventCtxMenu({
  target,
  children,
  onRefreshRequired,
}: EventCtxMenuProps) {
  const [ctxOpen, setCtxOpen] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  return (
    <>
      <ContextMenu open={ctxOpen} onOpenChange={setCtxOpen}>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuGroup>
            <ContextMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setEditDialogOpen(true);
              }}
            >
              <PenBoxIcon /> Edit
            </ContextMenuItem>

            <ContextMenuItem
              variant="destructive"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteDialogOpen(true);
              }}
            >
              <TrashIcon /> Delete
            </ContextMenuItem>
          </ContextMenuGroup>
        </ContextMenuContent>
      </ContextMenu>
      <EventDialog
        initialData={target}
        defaultEditMode={true}
        onRefreshRequired={() => {
          setCtxOpen(false);
          if (onRefreshRequired) onRefreshRequired();
        }}
        openManager={{ open: editDialogOpen, onOpenChange: setEditDialogOpen }}
      />
      <EventDelete
        target={target}
        onDelete={() => {
          setCtxOpen(false);
          if (onRefreshRequired) onRefreshRequired();
        }}
        openManager={{
          open: deleteDialogOpen,
          onOpenChange: setDeleteDialogOpen,
        }}
      />
    </>
  );
}
