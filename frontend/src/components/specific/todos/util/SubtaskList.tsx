import { createTask, getSubtasks } from "@/api/productivity";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import type Task from "@/models/tasks";
import { TaskStatus } from "@/models/tasks";
import { PlusIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import TaskStatusDropdown from "./StatusDropdown";
import TodoDialog from "./TodoDialog";
import { format } from "date-fns";
import { useDateLocale } from "@/hooks/use-dateLocale";
import { Kbd } from "@/components/ui/kbd";

interface SubtaskListProps {
  parent: Task;
  onRefreshRequired: () => void;
}

export default function SubtaskList({
  parent,
  onRefreshRequired,
}: SubtaskListProps) {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();

  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSubtasks = async (force?: boolean, silent?: boolean) => {
    if (!parent.isParent && !force) return;

    if (!silent) setLoading(true);

    const data = await getSubtasks(parent.id);
    setSubtasks(data);
    setLoading(false);
  };

  useEffect(() => {
    loadSubtasks();
  }, []);

  // --- Subtask creation handling
  const [newSubtaskContent, setNewSubtaskContent] = useState("");
  const createSubtask = async () => {
    const content = newSubtaskContent.trim();
    setNewSubtaskContent(content);
    if (content === "") return;

    try {
      await createTask(
        content,
        "",
        TaskStatus.Open,
        parent.moduleID,
        undefined,
        undefined,
        parent.id,
        false,
        0,
      );
      loadSubtasks(true, true);
      onRefreshRequired();
      setNewSubtaskContent("");
    } catch (error) {
      toast.error(t("common.internalServerError"));
      console.error("creating subtask failed:", error);
    }
  };

  return (
    <div className="space-y-1.5">
      <Label>{t("todos.dialog.display.subtasks")}</Label>
      {loading ? (
        <div className="flex items-center justify-center w-full p-3">
          <Spinner className="w-4 h-4" />
        </div>
      ) : (
        subtasks.map((task) => (
          <div
            key={task.id}
            className="flex justify-center hover:bg-muted rounded-md"
          >
            <div className="flex items-center">
              <TaskStatusDropdown
                task={task}
                onStatusUpdateSafe={() => {
                  onRefreshRequired();
                  loadSubtasks(true, true);
                }}
                size="small"
              />
            </div>
            <TodoDialog
              initialData={task}
              onRefreshRequired={() => {
                onRefreshRequired();
                loadSubtasks(true, true);
              }}
              maxDateOverride={new Date(parent.dueDate!)}
            >
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
        ))
      )}
      <InputGroup className="bg-transparent">
        <InputGroupInput
          value={newSubtaskContent}
          onChange={(e) => setNewSubtaskContent(e.target.value)}
          placeholder={t("todos.dialog.display.newSubtask")}
          onKeyUp={(e) => {
            if (e.key !== "Enter") return;
            createSubtask();
          }}
        />
        <InputGroupAddon align="inline-start">
          <PlusIcon className="size-4 text-muted-foreground" />
        </InputGroupAddon>
        <InputGroupAddon align="inline-end">
          <Kbd>Enter</Kbd>
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}
