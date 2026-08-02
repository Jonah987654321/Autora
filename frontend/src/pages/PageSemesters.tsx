import { createSemester, loadAllSemesters } from "@/api/academic";
import Semester from "@/components/specific/semester";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { getErrorStatus } from "@/lib/errors";
import axios from "axios";
import { format } from "date-fns";
import { de, enUS } from "date-fns/locale";
import {
  Check,
  ChevronDown,
  CircleX,
  GraduationCap,
  Loader,
  MousePointerClick,
  Plus,
  SearchIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface SemesterData {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export default function PageSemester() {
  const { t, i18n } = useTranslation();

  const currentLocale = i18n.language.startsWith("de") ? de : enUS;

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [blockCreateDialogClosing, setBlockCreateDialogClosing] =
    useState(false);

  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [startDateInvalid, setStartDateInvalid] = useState(false);
  const [endDateInvalid, setEndDateInvalid] = useState(false);
  const [datePeriodInvalid, setDatePeriodInvalid] = useState(false);
  const [newSemesterName, setNewSemesterName] = useState("");
  const [newSemesterNameInvalid, setNewSemesterNameInvalid] = useState(false);

  const [createLoading, setCreateLoading] = useState(false);
  const [createServerError, setCreateServerError] = useState(false);
  const [overlappingWithExisting, setOverlappingWithExisting] = useState(false);

  const [semestersLoading, setSemestersLoading] = useState(true);
  const [semesters, setSemesters] = useState<SemesterData[]>([]);
  const [loadingError, setLoadingError] = useState(false);

  const fetchSemesters = async (signal?: AbortSignal) => {
    setSemestersLoading(true);
    try {
      const data = await loadAllSemesters(signal);
      setSemesters(data);
    } catch (error: any) {
      if (axios.isCancel(error)) {
        return;
      }
      setLoadingError(true);
      console.error("Error loading semesters:", error);
    } finally {
      setSemestersLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();

    fetchSemesters(controller.signal);

    return () => {
      controller.abort();
    };
  }, []);

  const resetCreateDialog = () => {
    setStartDate(undefined);
    setStartDateInvalid(false);
    setEndDate(undefined);
    setEndDateInvalid(false);
    setNewSemesterName("");
    setNewSemesterNameInvalid(false);
    setDatePeriodInvalid(false);
    setCreateLoading(false);
    setCreateServerError(false);
    setBlockCreateDialogClosing(false);
    setOverlappingWithExisting(false);
  };

  const toggleNewDialog = (open: boolean) => {
    if (blockCreateDialogClosing) {
      return;
    }

    setCreateDialogOpen(open);
    if (!open) {
      resetCreateDialog();
    }
  };

  const submitNewDialog = async () => {
    let abortSubmit = false;

    if (newSemesterName === "") {
      setNewSemesterNameInvalid(true);
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

    setBlockCreateDialogClosing(true);
    setCreateLoading(true);

    let startDateActual = startDate as Date;
    let endDateActual = endDate as Date;

    try {
      const data = await createSemester(
        newSemesterName,
        startDateActual,
        endDateActual,
      );
      toggleNewDialog(false);
      await fetchSemesters();
    } catch (error) {
      const status = getErrorStatus(error);
      if (status === 409) {
        setOverlappingWithExisting(true);
      } else {
        console.error("failed to create semester: ", error);
        setCreateServerError(true);
      }
      setCreateLoading(false);
      setBlockCreateDialogClosing(false);
    }
  };

  return (
    <div className="p-6 flex flex-col h-dvh">
      <div>
        <h1 className="text-2xl font-bold mb-6">{t("semesters.heading")}</h1>
      </div>
      <div className={semesters.length > 0 ? "flex gap-2" : "hidden"}>
        <div className="flex-1">
          <InputGroup>
            <InputGroupInput type="text" placeholder={t("semesters.search")} />
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
          </InputGroup>
        </div>
        <div>
          <Dialog open={createDialogOpen} onOpenChange={toggleNewDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus /> {t("semesters.new")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("semesters.newDialog.heading")}</DialogTitle>
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
                    value={newSemesterName}
                    id="input-semesterName"
                    aria-invalid={newSemesterNameInvalid}
                    placeholder={t(
                      "semesters.newDialog.semesterNamePlaceholder",
                    )}
                    onChange={(e) => {
                      setNewSemesterNameInvalid(false);
                      setNewSemesterName(e.target.value);
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
                          format(startDate, "PPP", { locale: currentLocale })
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
                        locale={currentLocale}
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
                          format(endDate, "PPP", { locale: currentLocale })
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
                        locale={currentLocale}
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
                className={
                  createServerError ? "text-destructive text-center" : "hidden"
                }
              >
                {t("semesters.newDialog.serverError")}
              </div>
              <DialogFooter>
                <Button onClick={(_) => submitNewDialog()}>
                  {createLoading ? (
                    <Loader />
                  ) : (
                    <>
                      <Check /> {t("semesters.newDialog.submit")}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div
        className={
          semestersLoading
            ? "flex-1 pt-5 flex items-center justify-center"
            : "hidden"
        }
      >
        <div className="flex flex-col items-center gap-4">
          <Spinner className="h-8 w-8 text-muted-foreground" />

          <p className="text-sm font-medium text-muted-foreground animate-pulse">
            {t("semesters.loading")}
          </p>
        </div>
      </div>
      <div
        className={
          !semestersLoading && loadingError
            ? "flex-1 pt-5 flex flex-col items-center justify-center"
            : "hidden"
        }
      >
        <div>
          <CircleX className="text-red-400 size-10 stroke-1" />
        </div>
        <div className="text-red-400 mt-5 mb-5">{t("semesters.error")}</div>
      </div>
      <div
        className={
          !semestersLoading && !loadingError && semesters.length == 0
            ? "flex-1 pt-5 flex flex-col items-center justify-center"
            : "hidden"
        }
      >
        <div>
          <GraduationCap className="text-muted-foreground size-10 stroke-1" />
        </div>
        <div className="text-muted-foreground mt-5 mb-5">
          {t("semesters.noSemesters")}
        </div>
        <div>
          <Button onClick={(_) => setCreateDialogOpen(true)}>
            <Plus /> {t("semesters.new")}
          </Button>
        </div>
      </div>
      <div
        className={
          !semestersLoading && !loadingError && semesters.length > 0
            ? "grid grid-cols-2 flex-1 pt-5 divide-x divide-gray-200"
            : "hidden"
        }
      >
        <div>
          <h2>{t("semesters.semesterAmount", { count: semesters.length })}</h2>
          <ScrollArea className="mt-3 pr-4">
            <div className="divide-y divide-border">
              {semesters.map((s) => {
                return (
                  <Semester
                    locale={currentLocale}
                    semesterName={s.name}
                    start={new Date(s.startDate)}
                    end={new Date(s.endDate)}
                  />
                );
              })}
            </div>
          </ScrollArea>
        </div>
        <div>
          <div
            id="semester-details-noSelect"
            className="flex flex-col justify-center items-center h-full"
          >
            <div>
              <MousePointerClick className="text-muted-foreground size-10 stroke-1" />
            </div>
            <div className="text-muted-foreground mt-5">
              {t("semesters.selectFromLeft")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
