import { useDateLocale } from "@/hooks/use-dateLocale";
import type Task from "@/models/tasks";
import { TaskStatus, type TaskStatusType } from "@/models/tasks";
import { format } from "date-fns";
import { CheckCircle2Icon, CircleXIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import TaskStatusDropdown from "../util/StatusDropdown";
import { Skeleton } from "@/components/ui/skeleton";
import TodoDialog from "../util/TodoDialog";

interface TodoListProps {
  fetchEntries: () => Promise<Task[]>;
  refreshTrigger?: number;
}

export default function TodoList({
  fetchEntries,
  refreshTrigger,
}: TodoListProps) {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const [entries, setEntries] = useState<Task[]>([]);

  const updateTaskStatus = (id: string, newStatus: TaskStatusType) => {
    setEntries((prevArray) =>
      prevArray.map((element) =>
        element.id === id ? { ...element, status: newStatus } : element,
      ),
    );
  };

  const handleLoading = async () => {
    setLoading(true);
    setError(false);

    try {
      const data = await fetchEntries();
      setEntries(data);
      setLoading(false);
    } catch (error) {
      setError(true);
      setLoading(false);
    }
  };

  const handleSilentRefresh = async () => {
    setError(false);

    try {
      const data = await fetchEntries();
      setEntries(data);
    } catch (error) {
      setError(true);
    }
  };

  useEffect(() => {
    handleSilentRefresh();
  }, [refreshTrigger]);
  useEffect(() => {
    handleLoading();
  }, []);

  return (
    <>
      {loading && (
        <div className="space-y-1">
          <Skeleton className="w-fll h-8 rounded-md" />
          <Skeleton className="w-fll h-8 rounded-md" />
          <Skeleton className="w-fll h-8 rounded-md" />
        </div>
      )}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center text-muted-foreground mb-3">
          <div>
            <CircleXIcon className="text-red-600 size-8" strokeWidth={1.5} />
          </div>
          <div className="pt-2">
            <p>{t("common.internalServerError")}</p>
          </div>
        </div>
      )}
      {entries.length === 0 && !loading && !error && (
        <div className="flex flex-col items-center justify-center text-muted-foreground mb-3">
          <div>
            <CheckCircle2Icon
              className="fill-green-600 text-white size-8"
              strokeWidth={1.5}
            />
          </div>
          <div className="pt-2">
            <p>{t("todos.allDone")}</p>
          </div>
        </div>
      )}
      {entries.length > 0 && !loading && !error && (
        <>
          {entries.filter((t) => t.status < TaskStatus.Cancelled).map((task) => {
            return (
              <div
                key={task.id}
                className="flex justify-center hover:bg-muted rounded-md"
              >
                <div className="flex items-center">
                  <TaskStatusDropdown
                    task={task}
                    onStatusUpdate={(val) => {
                      updateTaskStatus(task.id, val);
                    }}
                  />
                </div>
                <TodoDialog initialData={task} onRefreshRequired={handleSilentRefresh}>
                  <div className="flex-1 flex cursor-pointer">
                    <div className="flex items-center text-base flex-1">
                      {task.title}
                    </div>
                    {task.dueDate && (
                      <div className="flex items-center text-sm pr-1">
                        {format(task.dueDate, "PPp", { locale: dateLocale })}
                      </div>
                    )}
                  </div>
                </TodoDialog>
              </div>
            );
          })}
        </>
      )}
    </>
  );
}
