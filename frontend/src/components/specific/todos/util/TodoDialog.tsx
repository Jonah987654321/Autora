import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDateLocale } from "@/hooks/use-dateLocale";
import type Task from "@/models/tasks";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import DateTimePicker from "../../calendar/util/dateTimePicker";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  BookOpenIcon,
  CalendarIcon,
  CheckIcon,
  Clock4Icon,
  MinusIcon,
  PenBoxIcon,
  PlusIcon,
  RepeatIcon,
  TrashIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  createTask,
  deleteTask,
  SeriesUpdate,
  updateTask,
  type SeriesUpdateType,
} from "@/api/productivity";
import { TaskStatus } from "@/models/tasks";
import { toast } from "sonner";
import TaskStatusDropdown from "./StatusDropdown";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import SeriesUpdateDecider from "./SeriesUpdateDecider";
import { getModule, getSemesterByID } from "@/api/academic";
import type ModuleData from "@/models/module";
import TaskDeleteConfirmation from "./DeleteConfimation";
import type SemesterData from "@/models/semester";
import SubtaskList from "./SubtaskList";

interface ExternallyManagedOpenState {
  open: boolean;
  onOpenChange: (state: boolean) => void;
}

interface TodoDialogProps {
  children?: React.ReactNode;
  initialData?: Task | undefined;
  onRefreshRequired: () => void;
  createTodosInModule?: string;
  openManager?: ExternallyManagedOpenState;
  defaultEditMode?: boolean;
  maxDateOverride?: Date;
}

export default function TodoDialog({
  children,
  initialData,
  onRefreshRequired,
  createTodosInModule,
  openManager,
  defaultEditMode,
  maxDateOverride
}: TodoDialogProps) {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();

  const [internalOpen, setInternalOpen] = useState(false);
  const isDialogOpen =
    openManager !== undefined ? openManager.open : internalOpen;

  const isCreateMode = initialData === undefined;
  const [isEditing, setIsEditing] = useState(defaultEditMode ?? false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // --- Task attributes & invalid state
  // title
  const [title, setTitle] = useState("");
  const [titleInvalid, setTitleInvalid] = useState(false);
  // description
  const [description, setDescription] = useState("");
  // due date
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [emptyDueDateError, setEmptyDueDateError] = useState(false);
  // repeat attributes
  const [repeat, setRepeat] = useState(false);
  const [repeatDays, setRepeatDays] = useState<number | undefined>();
  const [repeatDaysInvalid, setRepeatDaysInvalid] = useState(false);
  // estimated minutes
  const [estimatedMinutes, setEstimatedMinutes] = useState<
    number | undefined
  >();

  const [module, setModule] = useState<ModuleData>();
  const [semester, setSemester] = useState<SemesterData>();

  // --- Handle series update
  const [deleteMode, setDeleteMode] = useState(false);
  const [updateDecisionRequired, setUpdateDecisionRequired] = useState(false);

  // --- Handle deletes
  const [delConfirmOpen, setDelConfirmOpen] = useState(false);

  const ESTIMATE_PRESETS = [15, 30, 45, 60, 90];

  const handleOpenToggle = (state: boolean) => {
    if (saving) return;

    if (openManager !== undefined) {
      openManager.onOpenChange(state);
      return;
    }

    setInternalOpen(state);
  };

  const handleSubmit = async (
    overrideBehavior?: SeriesUpdateType,
    overrideOverwrite?: boolean,
  ) => {
    setTitleInvalid(false);
    setRepeatDaysInvalid(false);

    let validationFailed = false;
    if (title === "") {
      setTitleInvalid(true);
      validationFailed = true;
    }
    if (repeatDays === undefined && repeat) {
      setRepeatDaysInvalid(true);
      validationFailed = true;
    }

    if (repeat && dueDate === undefined) {
      setEmptyDueDateError(true);
      validationFailed = true;
    }

    if (validationFailed) {
      return;
    }

    if (initialData && initialData.seriesID && overrideBehavior === undefined) {
      setDeleteMode(false);
      setUpdateDecisionRequired(true);
      return;
    }

    setSaving(true);

    try {
      if (isCreateMode) {
        await createTask(
          title,
          description,
          TaskStatus.Open,
          createTodosInModule,
          dueDate,
          estimatedMinutes,
          undefined,
          repeat,
          repeatDays,
        );
        setSaving(false);
        handleOpenToggle(false);
        onRefreshRequired();
      } else {
        await updateTask(
          initialData.id,
          overrideBehavior ?? SeriesUpdate.None,
          overrideOverwrite ?? false,
          title,
          description,
          initialData.status,
          initialData.moduleID,
          dueDate,
          estimatedMinutes,
          initialData.parentTask,
          repeat && initialData.seriesID === undefined ? true : false,
          repeatDays,
        );

        setSaving(false);
        onRefreshRequired();
      }
    } catch (error) {
      setSaving(false);
      toast.error(t("common.internalServerError"));
      console.error("Creating/Updating task failed: ", error);
    }
  };

  const handleDelete = async (
    overrideBehavior?: SeriesUpdateType,
    overrideOverwrite?: boolean,
  ) => {
    if (initialData === undefined) return;

    if (initialData?.seriesID !== undefined && overrideBehavior === undefined) {
      setDeleteMode(true);
      setUpdateDecisionRequired(true);
      return;
    }
    if (initialData.seriesID === undefined && overrideBehavior == undefined) {
      setDelConfirmOpen(true);
      return;
    }

    setDeleting(true);
    try {
      await deleteTask(
        initialData?.id,
        overrideBehavior ?? SeriesUpdate.None,
        overrideOverwrite ?? false,
      );
      setDeleting(false);
      onRefreshRequired();
    } catch (error) {
      setDeleting(false);
      toast.error(t("common.internalServerError"));
      console.error("Deleting task failed: ", error);
    }
  };

  const resetForm = () => {
    setTitleInvalid(false);
    setRepeatDaysInvalid(false);

    if (initialData !== undefined) {
      setTitle(initialData.title);
      setDescription(initialData.description);
      setDueDate(
        initialData.dueDate !== undefined
          ? new Date(initialData.dueDate)
          : undefined,
      );
      setRepeat(initialData.seriesID !== undefined);
      setRepeatDays(initialData.repeatDays);
      setEstimatedMinutes(
        initialData.estimatedMinutes === 0
          ? undefined
          : initialData.estimatedMinutes,
      );
    } else {
      setTitle("");
      setDescription("");
      setDueDate(undefined);
      setRepeat(false);
      setRepeatDays(7);
      setEstimatedMinutes(undefined);
    }
  };

  useEffect(() => {
    if (isDialogOpen) {
      resetForm();
      setIsEditing(defaultEditMode ?? false);
    }
  }, [isDialogOpen, initialData]);

  useEffect(() => {
    const handleModuleFetching = async () => {
      let moduleID =
        initialData !== undefined && initialData.moduleID !== undefined
          ? initialData.moduleID
          : createTodosInModule;
      if (moduleID !== undefined) {
        const data = (await getModule(moduleID)) as ModuleData;
        setModule(data);
        const semesterData = await getSemesterByID(data.semesterID);
        setSemester(semesterData);
      }
    };
    if (isDialogOpen) {
      handleModuleFetching();
    }
  }, [initialData, createTodosInModule, isDialogOpen]);

  const switchEditingMode = (state: boolean) => {
    if (saving) return;

    setTimeout(() => {
      resetForm();
      setIsEditing(state);
    }, 0);
  };

  const showEditForm = isCreateMode || isEditing;

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={handleOpenToggle}>
        {children && <DialogTrigger asChild>{children}</DialogTrigger>}
        <DialogContent>
          {showEditForm ? (
            <>
              <DialogHeader>
                <DialogTitle>{t("todos.dialog.titleNew")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="task-title">
                    {t("todos.dialog.fields.title")}
                  </Label>
                  <Input
                    id="task-title"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setTitleInvalid(false);
                    }}
                    placeholder={t("todos.dialog.fields.titlePlaceholder")}
                    aria-invalid={titleInvalid}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="task-description">
                    {t("todos.dialog.fields.description")}
                  </Label>
                  <Textarea
                    id="task-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t(
                      "todos.dialog.fields.descriptionPlaceholder",
                    )}
                    rows={3}
                    className="resize-none field-sizing-fixed"
                  />
                </div>
                <Separator />
                <div className="space-y-1.5">
                  <Label>{t("todos.dialog.fields.dueDate")}</Label>
                  <DateTimePicker
                    value={dueDate}
                    onChange={(value) => {
                      setEmptyDueDateError(false);
                      setDueDate(value);
                    }}
                    invalid={emptyDueDateError}
                    minDate={
                      semester ? new Date(semester.startDate) : undefined
                    }
                    maxDate={maxDateOverride ?? (semester ? new Date(semester.endDate) : undefined)}
                  />
                  {emptyDueDateError ? (
                    <div className="text-destructive">
                      {t("todos.dialog.fields.errorEmptyDueDate")}
                    </div>
                  ) : (
                    ""
                  )}
                </div>

                <Separator />

                <Field>
                  <FieldLabel>
                    {t("todos.dialog.fields.estimatedMinutes")}
                  </FieldLabel>
                  <FieldContent>
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      {ESTIMATE_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() =>
                            estimatedMinutes === preset
                              ? setEstimatedMinutes(undefined)
                              : setEstimatedMinutes(preset)
                          }
                          className={cn(
                            "h-8 rounded-full border px-3 text-sm transition-colors",
                            estimatedMinutes === preset
                              ? "border-primary border-2 bg-primary/10 text-primary"
                              : "border-input hover:bg-muted",
                          )}
                        >
                          {preset}
                        </button>
                      ))}
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="…"
                        value={
                          ESTIMATE_PRESETS.includes(estimatedMinutes ?? -1)
                            ? ""
                            : (estimatedMinutes ?? "")
                        }
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, "");
                          setEstimatedMinutes(
                            raw === "" ? undefined : Number.parseInt(raw),
                          );
                        }}
                        className={cn(
                          "h-8 w-12 rounded-full text-center text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                          !ESTIMATE_PRESETS.includes(estimatedMinutes ?? -1) &&
                            estimatedMinutes !== undefined
                            ? "border-primary border-2 bg-primary/10 text-primary"
                            : "border border-input hover:bg-muted cursor-pointer",
                        )}
                      />
                      <span className="text-sm text-muted-foreground">
                        {t("todos.dialog.fields.estimatedMinutesUnit")}
                      </span>
                    </div>
                  </FieldContent>
                </Field>

                {initialData === undefined || initialData.parentTask === undefined && (
                  <>
                    <Separator />
                    <div className="space-y-1.5">
                      <Field orientation="horizontal" className="max-w-sm">
                        <FieldContent>
                          <FieldLabel htmlFor="switch-focus-mode">
                            {t("todos.dialog.fields.repeat")}
                          </FieldLabel>
                        </FieldContent>
                        <Switch
                          id="switch-focus-mode"
                          checked={repeat}
                          onCheckedChange={setRepeat}
                          disabled={
                            initialData !== undefined &&
                            initialData.seriesID !== undefined
                          }
                        />
                      </Field>
                      {repeat && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {t("todos.dialog.fields.repeatDays.every")}
                          </span>
                          <InputGroup className="w-30">
                            <InputGroupInput
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={repeatDays ?? ""}
                              onChange={(e) => {
                                const raw = e.target.value.replace(/\D/g, "");
                                setRepeatDays(
                                  raw === ""
                                    ? undefined
                                    : Math.max(1, Number.parseInt(raw)),
                                );
                                setRepeatDaysInvalid(false);
                              }}
                              className="text-center"
                              aria-invalid={repeatDaysInvalid}
                            />
                            <InputGroupAddon align="inline-start">
                              <InputGroupButton
                                onClick={() => {
                                  setRepeatDays((d) =>
                                    Math.max(1, (d ?? 1) - 1),
                                  );
                                  setRepeatDaysInvalid(false);
                                }}
                              >
                                <MinusIcon />
                              </InputGroupButton>
                            </InputGroupAddon>
                            <InputGroupAddon align="inline-end">
                              <InputGroupButton
                                onClick={() => {
                                  setRepeatDays((d) => (d ?? 0) + 1);
                                  setRepeatDaysInvalid(false);
                                }}
                              >
                                <PlusIcon />
                              </InputGroupButton>
                            </InputGroupAddon>
                          </InputGroup>
                          <span className="text-sm text-muted-foreground">
                            {t("todos.dialog.fields.repeatDays.days")}
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
              <DialogFooter>
                {isEditing && (
                  <Button
                    disabled={saving}
                    onClick={() => switchEditingMode(false)}
                    variant="ghost"
                  >
                    {t("todos.dialog.cancelEdit")}
                  </Button>
                )}
                <Button onClick={() => handleSubmit()} disabled={saving}>
                  {saving ? (
                    <Spinner />
                  ) : (
                    <>
                      <CheckIcon />{" "}
                      {isCreateMode
                        ? t("todos.dialog.submitNew")
                        : t("todos.dialog.submitEdit")}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center">
                  <TaskStatusDropdown
                    task={initialData}
                    onStatusUpdateSafe={() => {
                      onRefreshRequired();
                    }}
                  />
                  <div>{initialData.title}</div>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-x-1 space-y-2">
                  {initialData.dueDate && (
                    <Badge className="bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                      <CalendarIcon data-icon="inline-start" />
                      {t("todos.dialog.display.dueTo")}:{" "}
                      {format(initialData.dueDate, "PPp", {
                        locale: dateLocale,
                      })}
                    </Badge>
                  )}
                  {initialData.seriesID && (
                    <Badge variant="secondary">
                      <RepeatIcon data-icon="inline-start" />
                      {t("todos.dialog.display.repeats", {
                        count: initialData.repeatDays,
                      })}
                    </Badge>
                  )}
                  {initialData.estimatedMinutes !== 0 ? (
                    <Badge variant="secondary">
                      <Clock4Icon data-icon="inline-start" />
                      {t("todos.dialog.fields.estimatedMinutes")}:{" "}
                      {initialData.estimatedMinutes}
                      {t("todos.dialog.fields.estimatedMinutesUnit")}
                    </Badge>
                  ) : (
                    <></>
                  )}
                  {initialData.moduleID && (
                    <Badge variant="secondary">
                      <BookOpenIcon data-icon="inline-start" />
                      {module?.name}
                    </Badge>
                  )}
                </div>
                <Separator />
                <div className="space-y-1.5">
                  <Label htmlFor="task-description">
                    {t("todos.dialog.fields.description")}
                  </Label>
                  <Textarea
                    id="task-description"
                    value={initialData.description}
                    readOnly
                    placeholder={t(
                      "todos.dialog.fields.descriptionPlaceholder",
                    )}
                    rows={3}
                    className="resize-none field-sizing-fixed"
                  />
                </div>
                {initialData.parentTask === undefined && (
                  <>
                    <Separator />
                    <SubtaskList
                      parent={initialData}
                      onRefreshRequired={onRefreshRequired}
                    />
                  </>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete()}
                  disabled={deleting}
                >
                  {deleting ? <Spinner /> : <TrashIcon />}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => switchEditingMode(true)}
                >
                  <PenBoxIcon />
                  {t("todos.dialog.display.editToggle")}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      {initialData && (
        <SeriesUpdateDecider
          decisionRequired={updateDecisionRequired}
          deleteMode={deleteMode}
          onDecision={(
            doDelete: boolean,
            beh: SeriesUpdateType,
            overwrite: boolean,
          ) => {
            setUpdateDecisionRequired(false);
            if (doDelete) {
              handleDelete(beh, overwrite);
            } else {
              handleSubmit(beh, overwrite);
            }
          }}
          onCancel={() => setUpdateDecisionRequired(false)}
          deleteModeTarget={initialData}
        />
      )}
      {initialData && (
        <TaskDeleteConfirmation
          open={delConfirmOpen}
          onOpenChange={setDelConfirmOpen}
          onConfirm={() => {
            handleDelete(SeriesUpdate.None, false);
          }}
          target={initialData}
        />
      )}
    </>
  );
}
