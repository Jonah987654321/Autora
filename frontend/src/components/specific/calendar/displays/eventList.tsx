import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useDateLocale } from "@/hooks/use-dateLocale";
import type CalendarEvent from "@/models/event";
import { format, isSameDay } from "date-fns";
import { Clock, Unplug, CalendarOff, CalendarPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import EventDialog from "../util/eventDialog";
import EventCtxMenu from "../util/eventCtxMenu";

interface EventListProps {
  doFetchEvents: () => Promise<CalendarEvent[]>;
  createEventsInModule?: string;
  refreshTrigger?: number;
}

export default function EventList({
  doFetchEvents,
  createEventsInModule,
  refreshTrigger,
}: EventListProps) {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState(false);

  const handleLoading = async () => {
    setLoading(true);
    setServerError(false);

    try {
      const data = await doFetchEvents();
      setEvents(data);
      setLoading(false);
    } catch (error) {
      setServerError(true);
      setLoading(false);
    }
  };

  const handleSilentRefresh = async () => {
    try {
      setServerError(false);
      const data = await doFetchEvents();
      setEvents(data);
    } catch (error) {
      setServerError(true);
    }
  };

  const refresh = () => {
    handleSilentRefresh();
  };

  useEffect(refresh, [refreshTrigger]);

  useEffect(() => {
    handleLoading();
  }, []);

  return (
    <>
      {loading && (
        <ScrollArea>
          <div className="divide-y divide-border px-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="py-2">
                <Skeleton className="h-14 w-full rounded-md" />
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
      {!loading && serverError && (
        <div className="h-full flex flex-col items-center justify-center text-destructive gap-y-4">
          <div>
            <Unplug className="size-10 stroke-1" />
          </div>
          <div>{t("common.internalServerError")}</div>
        </div>
      )}
      {!loading && events.length == 0 && (
        <div className="h-full flex flex-col items-center justify-center gap-y-4 text-muted-foreground">
          <div>
            <CalendarOff className="size-10 stroke-1" />
          </div>
          <div className="text-base">{t("calendar.eventList.emptyState")}</div>
          <div>
            <EventDialog
              createEventsInModule={createEventsInModule}
              onRefreshRequired={refresh}
            >
              <Button variant="secondary">
                <CalendarPlus /> {t("calendar.eventList.emptyStateAction")}
              </Button>
            </EventDialog>
          </div>
        </div>
      )}
      {!loading && events.length > 0 && (
        <ScrollArea>
          <div className="divide-y divide-border px-2">
            {events.map((e) => {
              return (
                <EventCtxMenu target={e} onRefreshRequired={refresh} key={e.id}>
                  <div>
                    <EventDialog
                      createEventsInModule={createEventsInModule}
                      onRefreshRequired={refresh}
                      initialData={e}
                    >
                      <div className="flex items-center gap-4 py-2 min-w-0 cursor-pointer hover:bg-muted hover:rounded-md transition-colors">
                        {/* Date block */}
                        <div className="flex flex-col items-center justify-center bg-muted rounded-md min-w-[3.5rem] py-1.5 px-2 shrink-0">
                          <span className="text-lg font-semibold leading-none">
                            {format(e.start, "dd")}
                          </span>
                          <span className="text-[10px] text-muted-foreground uppercase mt-1 font-medium tracking-wider">
                            {format(e.start, "MMM", { locale: dateLocale })}
                          </span>
                        </div>

                        {/* Content block */}
                        <div className="flex-1 min-w-0 pr-2">
                          {/* Title-Row */}
                          <div className="flex items-center gap-2">
                            <span className="text-base font-medium truncate flex-1 min-w-0">
                              {e.title}
                            </span>
                            <Badge
                              variant="secondary"
                              className="shrink-0 whitespace-nowrap"
                            >
                              {t(`calendar.eventTypes.${e.type}`)}
                            </Badge>
                          </div>

                          {/* Subrow */}
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                            <Clock className="h-3 w-3 shrink-0" />
                            <span className="truncate flex-1 min-w-0">
                              {isSameDay(e.end, e.start)
                                ? `${format(e.start, "p", { locale: dateLocale })} - ${format(e.end, "p", { locale: dateLocale })}`
                                : `${format(e.start, "Pp", { locale: dateLocale })} - ${format(e.end, "Pp", { locale: dateLocale })}`}
                            </span>
                          </div>
                        </div>
                      </div>
                    </EventDialog>
                  </div>
                </EventCtxMenu>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </>
  );
}
