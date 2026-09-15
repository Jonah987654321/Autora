import { SeriesUpdate, updateTask } from "@/api/productivity";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type Task from "@/models/tasks";
import { STATUS_MAP, TaskStatus, type TaskStatusType } from "@/models/tasks";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface TaskStatusDropdownProps {
  task: Task;
  onStatusUpdate?: (value: TaskStatusType) => void;
  onStatusUpdateSafe?: (value: TaskStatusType) => void;
  size?: "normal" | "small";
}

export default function TaskStatusDropdown({
  task,
  onStatusUpdate,
  onStatusUpdateSafe,
  size,
}: TaskStatusDropdownProps) {
  const { t } = useTranslation();

  const [value, setValue] = useState<TaskStatusType>(task.status);

  const handleUpdate = async (update: string) => {
    const oldVal = value;
    const newVal = Number.parseInt(update) as TaskStatusType;

    setValue(newVal);
    if (onStatusUpdate) onStatusUpdate(newVal);

    try {
      await updateTask(
        task.id,
        SeriesUpdate.None,
        false,
        task.title,
        task.description,
        newVal,
        task.moduleID,
        task.dueDate !== undefined ? new Date(task.dueDate) : undefined,
        task.estimatedMinutes,
        task.parentTask,
        task.isTemplate,
        task.repeatDays,
      );
      if (newVal == TaskStatus.Done || newVal == TaskStatus.Cancelled) {
        const toastTitle =
          newVal == TaskStatus.Done
            ? t("todos.toasts.markedAsDone")
            : t("todos.toasts.markedAsCancelled");
        toast.success(toastTitle, {
          description: task.title,
          duration: 5000,
          action: {
            label: t("todos.toasts.undo"),
            onClick: () => handleUpdate(oldVal.toString()),
          },
        });
      }
      if (onStatusUpdateSafe) onStatusUpdateSafe(newVal);
    } catch (error) {
      setValue(oldVal);
      if (onStatusUpdate) onStatusUpdate(oldVal);
      toast.error(t("todos.errors.statusUpdateFailed"), {
        description: t("common.internalServerError"),
      });
    }
  };

  useEffect(() => {
    setValue(task.status);
  }, [task]);

  const status = STATUS_MAP[value];
  const CurIcon = status.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size={size === "small" ? "icon-sm" : "icon-lg"} variant="ghost">
          <CurIcon className={cn((size === "small" ? "size-4" : "size-5.5"), status.colorClass)} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-40">
        <DropdownMenuRadioGroup
          value={value.toString()}
          onValueChange={handleUpdate}
        >
          {Object.values(TaskStatus).map((v) => {
            const renderStatus = STATUS_MAP[v];
            const RenderIcon = renderStatus.icon;
            return (
              <DropdownMenuRadioItem value={v.toString()} key={v}>
                <RenderIcon /> {t(`todos.status.${v}`)}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
