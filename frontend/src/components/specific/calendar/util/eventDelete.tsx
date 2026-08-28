import { deleteEvent } from "@/api/calendar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { useDateLocale } from "@/hooks/use-dateLocale";
import type CalendarEvent from "@/models/event";
import { format } from "date-fns";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface ExternallyManagedOpenState {
  open: boolean;
  onOpenChange: (state: boolean) => void;
}

interface EventDeleteProps {
  target: CalendarEvent;
  children?: React.ReactNode;
  onDelete?: () => void;
  openManager?: ExternallyManagedOpenState;
}

export default function EventDelete({
  children,
  target,
  onDelete,
  openManager
}: EventDeleteProps) {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();

  const [loading, setLoading] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);

  const isDialogOpen = openManager !== undefined ? openManager.open : internalOpen;

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteEvent(target.id);
      setLoading(false);
      handleOpenChange(false);
      if (onDelete) onDelete();
    } catch (error) {
      setLoading(false);
      toast.error(t("common.internalServerError"));
    }
  };

  const handleOpenChange = (state: boolean) => {
    if (loading) return;

    if (openManager !== undefined) {
      openManager.onOpenChange(state);
      return;
    }

    setInternalOpen(state);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>{t("calendar.eventDelete.title")}</DialogTitle>
          <DialogDescription>
            {t("calendar.eventDelete.content")}
          </DialogDescription>
        </DialogHeader>
        <div>{target.title}</div>
        <div>
          {format(target.start, "P, p", {locale: dateLocale})} – {format(target.end, "P, p", {locale: dateLocale})}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={loading}>
              {t("calendar.eventDelete.actionCancel")}
            </Button>
          </DialogClose>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? <Spinner /> : t("calendar.eventDelete.actionDelete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
