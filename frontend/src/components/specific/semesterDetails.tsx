import type SemesterData from "@/models/semester";
import { Button } from "../ui/button";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
import { editSemester } from "@/api/academic";

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
      <div className="flex-1 pt-5">
        <div className="flex">
          <div className="flex-1 flex items-center text-lg">
            {t("semesters.detailView.modules")}
          </div>
          <div>
            <Button variant="outline">
              <Plus />
              {t("semesters.detailView.newModule")}
            </Button>
          </div>
        </div>
        <div>
          <Module />
          <Module />
        </div>
      </div>
    </div>
  );
}
