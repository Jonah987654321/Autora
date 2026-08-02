import { loadAllSemesters } from "@/api/academic";
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
import { format } from "date-fns";
import { de, enUS } from "date-fns/locale";
import {
  Check,
  ChevronDown,
  CircleX,
  GraduationCap,
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

  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  const [semestersLoading, setSemestersLoading] = useState(true);
  const [semesters, setSemesters] = useState<SemesterData[]>([]);
  const [loadingError, setLoadingError] = useState(false);

  useEffect(() => {
    let ignore = false;
    setSemestersLoading(true);

    const loadSemesters = async () => {
      try {
        const data = await loadAllSemesters();

        if (!ignore) {
          setSemesters(data);
        }
      } catch (error) {
        setLoadingError(true);
        console.error("Error loading semesters:", error);
      } finally {
        if (!ignore) {
          setSemestersLoading(false);
        }
      }
    };

    loadSemesters();

    return () => {
      ignore = true;
    };
  }, []);

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
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
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
                    id="input-semesterName"
                    placeholder={t(
                      "semesters.newDialog.semesterNamePlaceholder",
                    )}
                  />
                </Field>
                <Field>
                  <Label>{t("semesters.newDialog.startDate")}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        data-empty={!startDate}
                        className="w-[212px] justify-between text-left font-normal data-[empty=true]:text-muted-foreground"
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
                        onSelect={setStartDate}
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
                        data-empty={!endDate}
                        className="w-[212px] justify-between text-left font-normal data-[empty=true]:text-muted-foreground"
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
                        onSelect={setEndDate}
                        defaultMonth={endDate}
                        locale={currentLocale}
                      />
                    </PopoverContent>
                  </Popover>
                </Field>
              </FieldGroup>
              <DialogFooter>
                <Button>
                  <Check /> {t("semesters.newDialog.submit")}
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
        <div className="text-red-400 mt-5 mb-5">
          {t("semesters.error")}
        </div>
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
          <h2>Found 6 semesters:</h2>
          <ScrollArea className="mt-3 pr-4">
            <div className="divide-y divide-border">
              <Semester
                locale={currentLocale}
                semesterName="Sommersemester 2026"
                start={new Date("2026-04-01")}
                end={new Date("2026-09-30")}
              />
              <Semester
                locale={currentLocale}
                semesterName="Wintersemester 2025/26"
                start={new Date("2025-10-01")}
                end={new Date("2026-03-31")}
              />
              <Semester
                locale={currentLocale}
                semesterName="Sommersemester 2025"
                start={new Date("2025-04-01")}
                end={new Date("2025-09-30")}
              />
              <Semester
                locale={currentLocale}
                semesterName="Wintersemester 2024/25"
                start={new Date("2024-10-01")}
                end={new Date("2025-03-31")}
              />
              <Semester
                locale={currentLocale}
                semesterName="Sommersemester 2024"
                start={new Date("2024-04-01")}
                end={new Date("2024-09-30")}
              />
              <Semester
                locale={currentLocale}
                semesterName="Wintersemester 2023/24"
                start={new Date("2023-10-01")}
                end={new Date("2024-03-31")}
              />
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
              Please select a semester from the left side
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
