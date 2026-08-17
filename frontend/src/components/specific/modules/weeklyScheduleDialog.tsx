import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { type WeeklyScheduleEntry } from "@/models/module";
import { ArrowDownWideNarrow, Plus, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

interface WeeklyScheduleDialogProps {
  initialData?: WeeklyScheduleEntry[] | undefined;
  onSave: (data: WeeklyScheduleEntry[]) => Promise<void>;
  children: React.ReactNode;
}

type LocalEntry = WeeklyScheduleEntry & {
  _localId: string;
  timeSpanInvalid: boolean;
};

export default function WeeklyScheduleDialog({
  initialData,
  onSave,
  children,
}: WeeklyScheduleDialogProps) {
  const { t } = useTranslation();

  const [parent] = useAutoAnimate();

  const [entries, setEntries] = useState<LocalEntry[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const formatTime = (totalMinutes: number) => {
    const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
    const minutes = String(totalMinutes % 60).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const updateWeekday = (id: string, weekday: number) => {
    setEntries((prevArray) =>
      prevArray.map((element) =>
        element._localId === id ? { ...element, weekday: weekday } : element,
      ),
    );
  };

  const updateType = (id: string, type: number) => {
    setEntries((prevArray) =>
      prevArray.map((element) =>
        element._localId === id ? { ...element, type: type } : element,
      ),
    );
  };

  const updateStart = (id: string, time: number) => {
    setEntries((prevArray) =>
      prevArray.map((element) =>
        element._localId === id ? { ...element, start: time } : element,
      ),
    );
  };

  const updateEnd = (id: string, time: number) => {
    setEntries((prevArray) =>
      prevArray.map((element) =>
        element._localId === id ? { ...element, end: time } : element,
      ),
    );
  };

  const updateRoom = (id: string, room: string) => {
    setEntries((prevArray) =>
      prevArray.map((element) =>
        element._localId === id ? { ...element, room: room } : element,
      ),
    );
  };

  const setInvalidState = (id: string, state: boolean) => {
    setEntries((prevArray) =>
      prevArray.map((element) =>
        element._localId === id
          ? { ...element, timeSpanInvalid: state }
          : element,
      ),
    );
  };

  const toggleOpen = (state: boolean) => {
    if (!loading) {
      if (state) {
        setEntries(
          sortList(
            (initialData ?? []).map((e) => ({
              ...e,
              weekday: Number(e.weekday),
              type: Number(e.type),
              start: Number(e.start),
              end: Number(e.end),
              _localId: crypto.randomUUID(),
              timeSpanInvalid: false,
            })),
          ),
        );
      }
      setDialogOpen(state);
    }
  };

  const [isSettled, setIsSettled] = useState(false);
  useEffect(() => {
    if (dialogOpen) {
      const timer = setTimeout(() => setIsSettled(true), 300);
      return () => clearTimeout(timer);
    } else {
      setIsSettled(false);
    }
  }, [dialogOpen]);

  const submit = async () => {
    const hasInvalidEntries = entries.some((e) => e.start >= e.end);

    if (hasInvalidEntries) {
      setEntries((prevArray) =>
        prevArray.map((element) =>
          element.start >= element.end
            ? { ...element, timeSpanInvalid: true }
            : element,
        ),
      );
      return;
    }

    setLoading(true);
    const payload = sortList(entries).map(
      ({ _localId, timeSpanInvalid, ...rest }) => rest as WeeklyScheduleEntry,
    );
    try {
      await onSave(payload);
      setLoading(false);
      setDialogOpen(false);
    } catch (error) {
      setLoading(false);
      console.error("Failed to set weekly schedule", error);
      toast.error(t("common.internalServerError"));
    }
  };

  const sortList = (list: LocalEntry[]) => {
    return [...list].sort((a, b) => {
      if (a.weekday !== b.weekday) return a.weekday - b.weekday;
      if (a.start === b.start) return a.end - b.end;
      return a.start - b.start;
    });
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={toggleOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("course.weeklySchedule.dialogTitle")}</DialogTitle>
        </DialogHeader>
        <div
          ref={isSettled ? parent : undefined}
          className="flex flex-col w-full relative max-h-[70dvh] overflow-y-auto overflow-x-hidden pr-4"
        >
          {entries.length == 0 && (
            <div key="empty-state">
              <Separator />
              <div className="text-muted-foreground text-center py-5">
                {t("course.weeklySchedule.dialogEmpty")}
              </div>
              <Separator />
            </div>
          )}
          {entries.map((e) => {
            return (
              <div key={e._localId}>
                <div className="flex space-x-3 py-4">
                  <div className="flex-1 space-y-6">
                    <FieldGroup className="grid grid-cols-2">
                      <Field>
                        <Label>
                          {t("course.weeklySchedule.dialogLabelWeekday")}
                        </Label>
                        <Select
                          value={e.weekday.toString()}
                          onValueChange={(v) => {
                            updateWeekday(e._localId, Number(v));
                          }}
                        >
                          <SelectTrigger className="bg-muted rounded-xl border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent position="popper">
                            <SelectGroup>
                              {Array.from({ length: 7 }, (_, idx) => {
                                return (
                                  <SelectItem
                                    value={(idx + 1).toString()}
                                    key={idx + 1}
                                  >
                                    {t(`calendar.weekdays.${idx + 1}`)}
                                  </SelectItem>
                                );
                              })}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field>
                        <Label>
                          {t("course.weeklySchedule.dialogLabelEventType")}
                        </Label>
                        <Select
                          value={e.type.toString()}
                          onValueChange={(v) => {
                            updateType(e._localId, Number(v));
                          }}
                        >
                          <SelectTrigger className="bg-muted rounded-xl border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent position="popper">
                            <SelectGroup>
                              {Array.from({ length: 9 }, (_, idx) => {
                                return (
                                  <SelectItem value={idx.toString()} key={idx}>
                                    {t(`course.types.${idx}`)}
                                  </SelectItem>
                                );
                              })}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </Field>
                    </FieldGroup>
                    <FieldGroup className="grid grid-cols-2">
                      <Field data-invalid={e.timeSpanInvalid}>
                        <Label>
                          {t("course.weeklySchedule.dialogLabelStart")}
                        </Label>
                        <div className="flex">
                          <Input
                            aria-invalid={e.timeSpanInvalid}
                            type="time"
                            value={formatTime(e.start)}
                            onChange={(evt) => {
                              setInvalidState(e._localId, false);

                              const timeValue = evt.target.value;

                              if (timeValue) {
                                const [hours, minutes] = timeValue
                                  .split(":")
                                  .map(Number);

                                const totalMinutes = hours * 60 + minutes;
                                updateStart(e._localId, totalMinutes);
                              }
                            }}
                          />
                        </div>
                      </Field>
                      <Field data-invalid={e.timeSpanInvalid}>
                        <Label>
                          {t("course.weeklySchedule.dialogLabelEnd")}
                        </Label>
                        <div className="flex">
                          <Input
                            aria-invalid={e.timeSpanInvalid}
                            type="time"
                            value={formatTime(e.end)}
                            onChange={(evt) => {
                              setInvalidState(e._localId, false);

                              const timeValue = evt.target.value;

                              if (timeValue) {
                                const [hours, minutes] = timeValue
                                  .split(":")
                                  .map(Number);

                                const totalMinutes = hours * 60 + minutes;
                                updateEnd(e._localId, totalMinutes);
                              }
                            }}
                          />
                        </div>
                      </Field>
                    </FieldGroup>
                    <FieldGroup>
                      <Field>
                        <Label htmlFor="input-room">
                          {t("course.weeklySchedule.dialogLabelRoom")}
                        </Label>
                        <Input
                          id="input-room"
                          placeholder={t(
                            "course.weeklySchedule.dialogPlaceholderRoom",
                          )}
                          value={e.room}
                          onChange={(evt) =>
                            updateRoom(e._localId, evt.target.value)
                          }
                        />
                      </Field>
                    </FieldGroup>
                  </div>
                  <div>
                    <Button
                      variant="ghost"
                      className="text-red-600 hover:bg-red-50 hover:text-red-600"
                      onClick={() => {
                        setEntries((entries) =>
                          entries.filter(
                            (item) => item._localId !== e._localId,
                          ),
                        );
                      }}
                    >
                      <Trash />
                    </Button>
                  </div>
                </div>
                <Separator />
              </div>
            );
          })}
        </div>
        <div>
          <Button
            variant="secondary"
            onClick={() => {
              setEntries((prev) => [
                ...prev,
                {
                  _localId: crypto.randomUUID(),
                  timeSpanInvalid: false,
                  weekday: 1,
                  start: 600,
                  end: 660,
                  type: 1,
                  room: "",
                },
              ]);
            }}
          >
            <Plus />
            {t("course.weeklySchedule.dialogAddEntry")}
          </Button>
          <Button
            onClick={() => setEntries((prev) => sortList(prev))}
            variant="secondary"
          >
            <ArrowDownWideNarrow /> {t("course.weeklySchedule.dialogSort")}
          </Button>
        </div>
        <DialogFooter>
          <Button onClick={() => submit()} disabled={loading}>
            {loading ? <Spinner /> : t("course.weeklySchedule.dialogSave")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
