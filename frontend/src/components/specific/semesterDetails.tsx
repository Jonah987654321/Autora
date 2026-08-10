import type SemesterData from "@/models/semester";
import { Button } from "../ui/button";
import { FolderOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { format, type Locale } from "date-fns";
import Module from "./module";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import SemesterDialog from "./semesterDialog";
import {
  createModule,
  editSemester,
  getModulesBySemesterID,
} from "@/api/academic";
import { ScrollArea } from "../ui/scroll-area";
import { useEffect, useState } from "react";
import type ModuleData from "@/models/module";
import { Spinner } from "../ui/spinner";
import ModuleDialog from "./moduleDialog";

interface SemesterDetailsProps {
  semester: SemesterData;
  locale: Locale;
  onUpdate: (newSemester: SemesterData) => void;
}

export default function SemesterDetails({
  semester,
  locale,
  onUpdate,
}: SemesterDetailsProps) {
  const { t } = useTranslation();

  const saveEdits = async (name: string, startDate: Date, endDate: Date) => {
    let data = await editSemester(semester.id, name, startDate, endDate);
    onUpdate(data);
  };

  const [modules, setModules] = useState<ModuleData[]>([]);
  const [modulesLoading, setModulesLoading] = useState(false);

  const loadModules = async () => {
    try {
      setModulesLoading(true);
      const data = await getModulesBySemesterID(semester.id);
      setModules(data);
    } catch (error) {
      console.error("Failed to fetch modules: ", error);
    } finally {
      setModulesLoading(false);
    }
  };

  useEffect(() => {
    loadModules();
  }, [semester]);

  return (
    <div className="p-8 divide-y divide-border flex flex-col h-full">
      <div className="flex">
        <div className="flex-1 flex-col items-center">
          <div className="font-medium text-xl ">{semester.name}</div>
          <div className="text-muted-foreground text-sm">
            {t("semesters.duration", {
              start: format(semester.startDate, "PPP", { locale: locale }),
              end: format(semester.endDate, "PPP", { locale: locale }),
            })}
          </div>
        </div>
        <div className="flex items-center pb-5">
          <SemesterDialog
            mode="edit"
            locale={locale}
            initialData={semester}
            onSave={saveEdits}
          >
            <Button variant="ghost" size="icon" className="h-12 w-12">
              <Pencil />
            </Button>
          </SemesterDialog>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 text-red-500 hover:text-red-600"
              >
                <Trash2 className="h-10 w-10" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t("semesters.detailView.deleteDialog.title")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t("semesters.detailView.deleteDialog.description")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="text-sm">
                <p>{t("semesters.detailView.deleteDialog.target")}</p>
                <p>{semester.name}</p>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>
                  {t("semesters.detailView.deleteDialog.cancel")}
                </AlertDialogCancel>
                <AlertDialogAction variant="destructive">
                  {t("semesters.detailView.deleteDialog.confirm")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <div className="flex-1 pt-5 flex flex-col min-h-0">
        <div className="flex shrink-0 pb-4">
          <div className="flex-1 flex items-center text-lg">
            {t("semesters.detailView.modules")}
          </div>
          <div>
            <ModuleDialog
              mode="create"
              onSave={async (
                name: string,
                abbr: string,
                color: string,
                ects?: number,
                grade?: string,
              ) => {
                await createModule(semester.id, name, abbr, color, ects, grade);
                loadModules();
              }}
            >
              <Button variant="outline">
                <Plus />
                {t("semesters.detailView.newModule")}
              </Button>
            </ModuleDialog>
          </div>
        </div>
        <div
          className={
            modulesLoading
              ? "flex-1 pt-5 flex items-center justify-center"
              : "hidden"
          }
        >
          <div className="flex flex-col items-center gap-4">
            <Spinner className="h-8 w-8 text-muted-foreground" />

            <p className="text-sm font-medium text-muted-foreground animate-pulse">
              {t("semesters.detailView.modulesLoading")}
            </p>
          </div>
        </div>
        <div
          className={
            !modulesLoading && modules.length == 0
              ? "flex-1 pt-5 flex items-center justify-center"
              : "hidden"
          }
        >
          <div className="flex flex-col items-center gap-4">
            <FolderOpen className="h-8 w-8 text-muted-foreground" />

            <p className="text-sm font-medium text-muted-foreground">
              {t("semesters.detailView.noModules")}
            </p>
          </div>
        </div>
        <div
          className={
            !modulesLoading && modules.length > 0 ? "flex-1 min-h-0" : "hidden"
          }
        >
          <ScrollArea className="h-full pr-4" type="always">
            {modules.map((m) => {
              return <Module data={m} key={m.id} />;
            })}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
