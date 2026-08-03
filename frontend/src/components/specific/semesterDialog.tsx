import { Check, ChevronDown } from "lucide-react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { useTranslation } from "react-i18next";
import { Field, FieldGroup, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { format, type Locale } from "date-fns";
import { Calendar } from "../ui/calendar";
import { useEffect, useState } from "react";
import { getErrorStatus } from "@/lib/errors";
import type SemesterData from "@/models/semester";
import { Spinner } from "../ui/spinner";

interface SemesterDialogProps {
  locale: Locale;
  onSave: (name: string, startDate: Date, endDate: Date) => Promise<void>;
  onCompleted?: CallableFunction;
  initialData?: SemesterData | null;
  mode: "create" | "edit";
  children: React.ReactNode;
}

export default function SemesterDialog({
  locale,
  onSave,
  onCompleted,
  initialData,
  mode,
  children,
}: SemesterDialogProps) {
  const { t } = useTranslation();

  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [startDateInvalid, setStartDateInvalid] = useState(false);
  const [endDateInvalid, setEndDateInvalid] = useState(false);
  const [datePeriodInvalid, setDatePeriodInvalid] = useState(false);
  const [name, setName] = useState("");
  const [nameInvalid, setNameInvalid] = useState(false);

  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(false);
  const [overlappingWithExisting, setOverlappingWithExisting] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (dialogOpen) {
      const initStartDate = initialData
        ? new Date(initialData.startDate)
        : undefined;
      const initEndDate = initialData
        ? new Date(initialData.endDate)
        : undefined;
      const initName = initialData ? initialData.name : "";

      setStartDate(initStartDate);
      setStartDateInvalid(false);
      setEndDate(initEndDate);
      setEndDateInvalid(false);
      setName(initName);
      setNameInvalid(false);
      setDatePeriodInvalid(false);
      setLoading(false);
      setServerError(false);
      setOverlappingWithExisting(false);
    }
  }, [dialogOpen, initialData]);

  const toggleOpen = (open: boolean) => {
    if (loading) {
      return;
    }

    setDialogOpen(open);
  };

  const submit = async () => {
    let abortSubmit = false;

    if (name === "") {
      setNameInvalid(true);
      abortSubmit = true;
    }

    if (startDate === undefined) {
      setStartDateInvalid(true);
      abortSubmit = true;
    }
    if (endDate === undefined) {
      setEndDateInvalid(true);
      abortSubmit = true;
    }

    if (
      endDate !== undefined &&
      startDate !== undefined &&
      startDate > endDate
    ) {
      setDatePeriodInvalid(true);
      abortSubmit = true;
    }

    if (abortSubmit) {
      return;
    }

    setLoading(true);

    try {
      await onSave(name, startDate as Date, endDate as Date);
      setLoading(false);
      toggleOpen(false);
      onCompleted && onCompleted();
    } catch (error) {
      const status = getErrorStatus(error);
      if (status === 409) {
        setOverlappingWithExisting(true);
      } else {
        console.error("Semester dialog completion failed: ", error);
        setServerError(true);
      }
      setLoading(false);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={toggleOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode == "create"
              ? t("semesters.newDialog.titleNew")
              : t("semesters.newDialog.titleEdit")}
          </DialogTitle>
          <DialogDescription>
            {t("semesters.newDialog.description")}
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="input-semesterName">
              {t("semesters.newDialog.semesterName")}
            </FieldLabel>
            <Input
              value={name}
              id="input-semesterName"
              aria-invalid={nameInvalid}
              placeholder={t("semesters.newDialog.semesterNamePlaceholder")}
              onChange={(e) => {
                setNameInvalid(false);
                setName(e.target.value);
              }}
            />
          </Field>
          <Field>
            <Label>{t("semesters.newDialog.startDate")}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  aria-invalid={startDateInvalid || datePeriodInvalid}
                  data-empty={!startDate}
                  className="w-53 justify-between text-left font-normal data-[empty=true]:text-muted-foreground"
                >
                  {startDate ? (
                    format(startDate, "PPP", { locale: locale })
                  ) : (
                    <span>{t("semesters.newDialog.pickDate")}</span>
                  )}
                  <ChevronDown />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => {
                    setStartDateInvalid(false);
                    setDatePeriodInvalid(false);
                    return setStartDate(date);
                  }}
                  defaultMonth={startDate}
                  locale={locale}
                />
              </PopoverContent>
            </Popover>
          </Field>
          <Field>
            <Label>{t("semesters.newDialog.endDate")}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  aria-invalid={endDateInvalid || datePeriodInvalid}
                  data-empty={!endDate}
                  className="w-53 justify-between text-left font-normal data-[empty=true]:text-muted-foreground"
                >
                  {endDate ? (
                    format(endDate, "PPP", { locale: locale })
                  ) : (
                    <span>{t("semesters.newDialog.pickDate")}</span>
                  )}
                  <ChevronDown />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(date) => {
                    setEndDateInvalid(false);
                    setDatePeriodInvalid(false);
                    return setEndDate(date);
                  }}
                  defaultMonth={endDate}
                  locale={locale}
                />
              </PopoverContent>
            </Popover>
          </Field>
        </FieldGroup>
        <div
          className={
            datePeriodInvalid ? "text-destructive text-center" : "hidden"
          }
        >
          {t("semesters.newDialog.datePeriodInvalid")}
        </div>
        <div
          className={
            overlappingWithExisting ? "text-destructive text-center" : "hidden"
          }
        >
          {t("semesters.newDialog.overlappingWithExisting")}
        </div>
        <div
          className={serverError ? "text-destructive text-center" : "hidden"}
        >
          {t("semesters.newDialog.serverError")}
        </div>
        <DialogFooter>
          <Button onClick={(_) => submit()}>
            {loading ? (
              <Spinner />
            ) : mode == "create" ? (
              <>
                <Check /> {t("semesters.newDialog.submitNew")}
              </>
            ) : (
              <>
                <Check /> {t("semesters.newDialog.submitEdit")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
