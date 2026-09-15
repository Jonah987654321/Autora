import { SeriesUpdate, type SeriesUpdateType } from "@/api/productivity";
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
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import type Task from "@/models/tasks";
import { ChevronRightIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface SeriesUpdateDeciderProps {
  decisionRequired: boolean;
  onDecision: (
    isDeletion: boolean,
    beh: SeriesUpdateType,
    overwrite: boolean,
  ) => void;
  onCancel: () => void;
  deleteMode: boolean;
  deleteModeTarget?: Task;
}

export default function SeriesUpdateDecider({
  decisionRequired,
  onDecision,
  onCancel,
  deleteMode,
  deleteModeTarget,
}: SeriesUpdateDeciderProps) {
  const { t } = useTranslation();

  const [open, setOpen] = useState(false);

  const [behavior, setBehavior] = useState<SeriesUpdateType>(SeriesUpdate.None);
  const [overwrite, setOverwrite] = useState(false);

  const handleOpenChange = (state: boolean) => {
    if (!state) onCancel();

    setOpen(state);
  };

  useEffect(() => {
    if (decisionRequired) {
      setBehavior(SeriesUpdate.None);
      setOverwrite(false);
      handleOpenChange(true);
    };
  }, [decisionRequired]);

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {deleteMode
              ? t("todos.delete.title")
              : t("todos.updateDecider.title")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {deleteMode
              ? t("todos.delete.description")
              : t("todos.updateDecider.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {deleteMode && deleteModeTarget ? (
          <>
            <div className="flex items-center">
              <ChevronRightIcon className="size-5" /> {deleteModeTarget.title}
            </div>
            <div className="text-sm text-muted-foreground">{t("todos.updateDecider.descriptionDelete")}</div>
          </>
        ) : (
          <></>
        )}
        <div className="space-y-4">
          <RadioGroup
            value={behavior.toString()}
            onValueChange={(val) =>
              setBehavior(Number.parseInt(val) as SeriesUpdateType)
            }
            className="w-fit"
          >
            <div className="flex items-center gap-3">
              <RadioGroupItem value={SeriesUpdate.None.toString()} id="r1" />
              <Label htmlFor="r1">
                {t("todos.updateDecider.options.thisTaskOnly")}
              </Label>
            </div>
            <div className="flex items-center gap-3">
              <RadioGroupItem
                value={SeriesUpdate.Upcoming.toString()}
                id="r2"
              />
              <Label htmlFor="r2">
                {t("todos.updateDecider.options.upcoming")}
              </Label>
            </div>
            <div className="flex items-center gap-3">
              <RadioGroupItem value={SeriesUpdate.All.toString()} id="r3" />
              <Label htmlFor="r3">
                {t("todos.updateDecider.options.wholeSeries")}
              </Label>
            </div>
          </RadioGroup>
          {behavior !== SeriesUpdate.None ? (
            <Field orientation="horizontal" className="max-w-sm">
              <FieldContent>
                <FieldLabel htmlFor="switch-focus-mode">
                  {deleteMode ? t("todos.updateDecider.overwriteLabelDelete") : t("todos.updateDecider.overwriteLabel")}
                </FieldLabel>
              </FieldContent>
              <Switch
                id="switch-focus-mode"
                checked={overwrite}
                onCheckedChange={setOverwrite}
              />
            </Field>
          ) : (
            <></>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>
            {t("todos.updateDecider.actionCancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onDecision(deleteMode, behavior, overwrite);
            }}
            variant={deleteMode ? "destructive" : "default"}
          >
            {deleteMode
              ? t("todos.delete.actionDelete")
              : t("todos.updateDecider.actionUpdate")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
