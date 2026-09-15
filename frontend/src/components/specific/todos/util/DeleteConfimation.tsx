import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import type Task from "@/models/tasks";
import { ChevronRightIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

interface TaskDeleteConfirmationProps {
  open: boolean;
  onOpenChange: (state: boolean) => void;
  onConfirm: () => void;
  target: Task;
}

export default function TaskDeleteConfirmation({
  open,
  onOpenChange,
  onConfirm,
  target,
}: TaskDeleteConfirmationProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("todos.delete.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("todos.delete.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex items-center">
          <ChevronRightIcon className="size-5" /> {target.title}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>
            {t("todos.delete.actionCancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              onOpenChange(false);
              onConfirm();
            }}
          >
            {t("todos.delete.actionDelete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
