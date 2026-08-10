import { createSemester, loadAllSemesters } from "@/api/academic";
import Semester from "@/components/specific/semester";
import SemesterDetails from "@/components/specific/semesterDetails";
import SemesterDialog from "@/components/specific/semesterDialog";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import type SemesterData from "@/models/semester";
import axios from "axios";
import { de, enUS } from "date-fns/locale";
import {
  CircleX,
  GraduationCap,
  MousePointerClick,
  Plus,
  SearchIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export default function PageSemester() {
  const { t, i18n } = useTranslation();

  const currentLocale = i18n.language.startsWith("de") ? de : enUS;

  const [semestersLoading, setSemestersLoading] = useState(true);
  const [semesters, setSemesters] = useState<SemesterData[]>([]);
  const [loadingError, setLoadingError] = useState(false);

  const [selectedSemester, setSelectedSemester] = useState<SemesterData | null>(
    null,
  );

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
          <SemesterDialog
            locale={currentLocale}
            onSave={createSemester}
            onCompleted={fetchSemesters}
            mode="create"
          >
            <Button>
              <Plus /> {t("semesters.new")}
            </Button>
          </SemesterDialog>
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
          <SemesterDialog
            locale={currentLocale}
            onSave={createSemester}
            onCompleted={fetchSemesters}
            mode="create"
          >
            <Button>
              <Plus /> {t("semesters.new")}
            </Button>
          </SemesterDialog>
        </div>
      </div>
      <div
        className={
          !semestersLoading && !loadingError && semesters.length > 0
            ? "grid grid-cols-2 flex-1 pt-5 divide-x divide-gray-200 min-h-0"
            : "hidden"
        }
      >
        <div className="flex flex-col min-h-0">
          <h2 className="shrink-0">
            {t("semesters.semesterAmount", { count: semesters.length })}
          </h2>
          <div className="flex-1 min-h-0 mt-3">
            <ScrollArea className="h-full mt-3 pr-4">
              <div className="divide-y divide-border">
                {semesters.map((s) => {
                  return (
                    <Semester
                      isActive={selectedSemester !== null && selectedSemester.id == s.id}
                      onClick={(_) => setSelectedSemester(s)}
                      key={s.id}
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
        </div>
        <div className="h-full min-h-0 overflow-hidden">
          <div
            id="semester-details-noSelect"
            className={
              selectedSemester === null
                ? "flex flex-col justify-center items-center h-full"
                : "hidden"
            }
          >
            <div>
              <MousePointerClick className="text-muted-foreground size-10 stroke-1" />
            </div>
            <div className="text-muted-foreground mt-5">
              {t("semesters.selectFromLeft")}
            </div>
          </div>
          {selectedSemester && (
            <SemesterDetails
              semester={selectedSemester}
              locale={currentLocale}
              onUpdate={(newSemester: SemesterData) => {
                fetchSemesters();
                setSelectedSemester(newSemester);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
