import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { format, isSameDay } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Edit, Trash, Clock } from "lucide-react";
import type CalendarEvent from "@/models/event";
import DateTimePicker from "@/components/specific/calendar/util/dateTimePicker";
import EventDelete from "./eventDelete";
import { createEvent, updateEvent } from "@/api/calendar";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { useDateLocale } from "@/hooks/use-dateLocale";

interface ExternallyManagedOpenState {
  open: boolean;
  onOpenChange: (state: boolean) => void;
}

interface EventDialogProps {
  children?: React.ReactNode;
  initialData?: CalendarEvent | undefined;
  defaultEditMode?: boolean;
  onRefreshRequired?: () => void;
  createEventsInModule?: string;
  openManager?: ExternallyManagedOpenState;
}

const EVENT_TYPES = [0, 1, 2, 3, 4, 5, 6];

export default function EventDialog({
  children,
  initialData,
  defaultEditMode,
  onRefreshRequired,
  createEventsInModule,
  openManager,
}: EventDialogProps) {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();

  const [internalOpen, setInternalOpen] = useState(false);
  const isDialogOpen =
    openManager !== undefined ? openManager.open : internalOpen;

  const isCreateMode = initialData === undefined;
  const [isEditing, setIsEditing] = useState(defaultEditMode ?? false);
  const [saving, setSaving] = useState(false);
  const [timeRangeInvalid, setTimeRangeInvalid] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [start, setStart] = useState<Date | undefined>(undefined);
  const [end, setEnd] = useState<Date | undefined>(undefined);
  const [type, setType] = useState<number>(0);

  const resetForm = () => {
    if (initialData !== undefined) {
      setTitle(initialData.title);
      setDescription(initialData.description);
      setStart(initialData.start);
      setEnd(initialData.end);
      setType(initialData.type);
    } else {
      setTitle("");
      setDescription("");
      setStart(undefined);
      setEnd(undefined);
      setType(0);
    }
  };

  useEffect(() => {
    if (isDialogOpen) {
      resetForm();
      setIsEditing(defaultEditMode ?? false);
    }
  }, [isDialogOpen, initialData]);

  const handleSubmit = async (create: boolean) => {
    if (!create && initialData === undefined) return;

    if (start === undefined || end === undefined || title === "") {
      return;
    }

    if (start >= end) {
      setTimeRangeInvalid(true);
      return;
    }

    setSaving(true);
    try {
      if (create) {
        await createEvent(
          title,
          description,
          createEventsInModule ?? "",
          type,
          start,
          end,
        );
        handleOpenChange(false);
      } else {
        await updateEvent(
          initialData!.id,
          title,
          description,
          initialData!.moduleID,
          type,
          start,
          end,
        );
        switchEditingMode(false);
      }

      setSaving(false);
      if (onRefreshRequired) onRefreshRequired();
    } catch (error) {
      setSaving(false);
      toast.error(t("common.internalServerError"));
    }
  };

  const switchEditingMode = (state: boolean) => {
    if (saving) return;

    setTimeout(() => {
      setIsEditing(state);
    }, 0);
  };

  const handleOpenChange = (state: boolean) => {
    if (saving) return;

    if (openManager !== undefined) {
      openManager.onOpenChange(state);
      return;
    }

    setInternalOpen(state);
  };

  const showEditForm = isCreateMode || isEditing;
  const canSave =
    !saving && title !== "" && start !== undefined && end !== undefined;

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          {isCreateMode ? (
            <DialogTitle>{t("calendar.eventDialog.createTitle")}</DialogTitle>
          ) : isEditing ? (
            <DialogTitle>{t("calendar.eventDialog.editTitle")}</DialogTitle>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <DialogTitle className="text-xl">
                  {initialData!.title}
                </DialogTitle>
                <Badge variant="secondary" className="font-normal shrink-0">
                  {t(`calendar.eventTypes.${initialData!.type}`)}
                </Badge>
              </div>
              <DialogDescription>{initialData!.description}</DialogDescription>
            </>
          )}
        </DialogHeader>

        {showEditForm ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="event-title">
                {t("calendar.eventDialog.fields.title")}
              </Label>
              <Input
                id="event-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("calendar.eventDialog.fields.titlePlaceholder")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="event-description">
                {t("calendar.eventDialog.fields.description")}
              </Label>
              <Textarea
                id="event-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t(
                  "calendar.eventDialog.fields.descriptionPlaceholder",
                )}
                rows={3}
              />
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>{t("calendar.eventDialog.fields.start")}</Label>
                <DateTimePicker
                  value={start}
                  onChange={(value) => {
                    setStart(value);
                    setTimeRangeInvalid(false);
                  }}
                  invalid={timeRangeInvalid}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("calendar.eventDialog.fields.end")}</Label>
                <DateTimePicker
                  value={end}
                  onChange={(value) => {
                    setEnd(value);
                    setTimeRangeInvalid(false);
                  }}
                  invalid={timeRangeInvalid}
                />
              </div>
              {timeRangeInvalid && (
                <div className="text-destructive">
                  {t("calendar.eventDialog.invalidTimerangeMessage")}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>{t("calendar.eventDialog.fields.type")}</Label>
              <Select
                value={String(type)}
                onValueChange={(v) => setType(Number(v))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  {EVENT_TYPES.map((typeValue) => (
                    <SelectItem key={typeValue} value={String(typeValue)}>
                      {t(`calendar.eventTypes.${typeValue}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-2">
              <Clock className="h-4 w-4 shrink-0" />
              <span>
                {isSameDay(initialData!.start, initialData!.end)
                  ? `${format(initialData!.start, "PP", { locale: dateLocale })} • ${format(initialData!.start, "p", { locale: dateLocale })} – ${format(initialData!.end, "p", { locale: dateLocale })}`
                  : `${format(initialData!.start, "PP, p", { locale: dateLocale })} – ${format(initialData!.end, "PP, p", { locale: dateLocale })}`}
              </span>
            </div>
          </div>
        )}

        <DialogFooter className="mt-2">
          {isCreateMode ? (
            <Button onClick={() => handleSubmit(true)} disabled={!canSave}>
              {saving ? <Spinner /> : t("calendar.eventDialog.actions.create")}
            </Button>
          ) : isEditing ? (
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  resetForm();
                  if (defaultEditMode) {
                    handleOpenChange(false);
                  } else {
                    switchEditingMode(false);
                  }
                }}
                disabled={saving}
              >
                {t("calendar.eventDialog.actions.cancel")}
              </Button>
              <Button onClick={() => handleSubmit(false)} disabled={!canSave}>
                {saving ? <Spinner /> : t("calendar.eventDialog.actions.save")}
              </Button>
            </>
          ) : (
            <>
              <EventDelete
                target={initialData}
                onDelete={() => {
                  handleOpenChange(false);
                  if (onRefreshRequired) onRefreshRequired();
                }}
              >
                <Button variant="destructive" size="icon" disabled={saving}>
                  <Trash className="h-4 w-4" />
                </Button>
              </EventDelete>
              <Button variant="outline" onClick={() => switchEditingMode(true)}>
                <Edit className="h-4 w-4" />
                {t("calendar.eventDialog.actions.edit")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
