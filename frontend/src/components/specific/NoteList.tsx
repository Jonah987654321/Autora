import { getNotesByModule } from "@/api/knowledge";
import type LectureNote from "@/models/note";
import {
  BrainIcon,
  ChevronRight,
  CircleCheck,
  GhostIcon,
  NotebookText,
  Plus,
  Unplug,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useDateLocale } from "@/hooks/use-dateLocale";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "../ui/skeleton";

interface NoteListProps {
  moduleID: string;
  refreshTrigger?: number;
  onCreateNew?: () => Promise<void>;
}

export default function NoteList({
  moduleID,
  refreshTrigger,
  onCreateNew,
}: NoteListProps) {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const [notes, setNotes] = useState<LectureNote[]>([]);

  const handleLoading = async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await getNotesByModule(moduleID);
      setNotes(data);
    } catch (error) {
      console.error("Failed to load lecture notes: ", error);
      setError(true);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    handleLoading();
  }, [moduleID, refreshTrigger]);

  return (
    <>
      {loading && (
        <div className="px-3">
          <div className="flex items-center gap-x-2 p-2 rounded-md group pr-8">
            <NotebookText className="size-6 text-muted-foreground" />
            <Skeleton className="flex-1 h-5" />
            <Skeleton className="w-[30%] h-5" />
          </div>
          <div className="flex items-center gap-x-2 p-2 rounded-md group pr-8">
            <NotebookText className="size-6 text-muted-foreground" />
            <Skeleton className="flex-1 h-5" />
            <Skeleton className="w-[30%] h-5" />
          </div>
          <div className="flex items-center gap-x-2 p-2 rounded-md group pr-8">
            <NotebookText className="size-6 text-muted-foreground" />
            <Skeleton className="flex-1 h-5" />
            <Skeleton className="w-[30%] h-5" />
          </div>
          <div className="flex items-center gap-x-2 p-2 rounded-md group pr-8">
            <NotebookText className="size-6 text-muted-foreground" />
            <Skeleton className="flex-1 h-5" />
            <Skeleton className="w-[30%] h-5" />
          </div>
        </div>
      )}
      {!loading && error && (
        <div className="h-full flex flex-col items-center justify-center text-destructive gap-y-4">
          <div>
            <Unplug className="size-10 stroke-1" />
          </div>
          <div>{t("common.internalServerError")}</div>
        </div>
      )}
      {!loading && !error && notes.length == 0 && (
        <div className="h-full flex flex-col items-center justify-center gap-y-2 text-muted-foreground">
          <div>
            <GhostIcon className="size-10 stroke-1" />
          </div>
          <div className="text-base">{t("notes.list.empty")}</div>
          {onCreateNew && (
            <Button className="mt-2" variant="secondary" onClick={onCreateNew}>
              <BrainIcon />
              {t("notes.list.emptyAction")}
            </Button>
          )}
        </div>
      )}
      {!loading && !error && notes.length > 0 && (
        <ScrollArea className="h-full">
          <div className="px-3">
            {notes.map((e) => (
              <Link to={`/editor/${e.id}`} key={e.id}>
                <div className="hover:bg-muted flex items-center gap-x-2 p-2 rounded-md group">
                  <div className="relative inline-flex shrink-0">
                    <NotebookText className="size-6 text-muted-foreground" />
                    {e.summaryDone ? (
                      <div className="absolute -bottom-1 -right-1 bg-background rounded-full">
                        <CircleCheck className="size-3.5 text-green-500" />
                      </div>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="absolute -bottom-1 -right-1 size-2.5 rounded-full bg-amber-500 ring-2 ring-background" />
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          {t("notes.list.summaryOpen")}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  <div
                    className={cn(
                      "text-sm flex-1 truncate",
                      e.title === "" && "italic text-muted-foreground",
                    )}
                  >
                    {e.title !== "" ? e.title : t("notes.list.unnamedLecture")}
                  </div>
                  <div className="text-sm text-muted-foreground whitespace-nowrap">
                    {format(new Date(e.start), "Pp", { locale: dateLocale })}
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
              </Link>
            ))}

            <div className="border-t border-dashed my-1"></div>

            <div
              className="flex items-center gap-x-2 p-2 rounded-md  text-muted-foreground hover:bg-muted hover:text-foreground pt-3 cursor-pointer"
              onClick={onCreateNew}
            >
              <Plus className="size-4" />
              <span className="text-sm">{t("notes.list.addNew")}</span>
            </div>
          </div>
        </ScrollArea>
      )}
    </>
  );
}
