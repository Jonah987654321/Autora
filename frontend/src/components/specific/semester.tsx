import { format } from "date-fns";
import { Badge } from "../ui/badge";
import { useTranslation } from "react-i18next";
import type { MouseEventHandler } from "react";
import { useDateLocale } from "@/hooks/use-dateLocale";

interface SemesterProps {
  semesterName: string;
  start: Date;
  end: Date;
  onClick?: MouseEventHandler;
  isActive: boolean;
}

export default function Semester({
  semesterName,
  start,
  end,
  onClick,
  isActive
}: SemesterProps) {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const now = new Date();
  return (
    <div className={`hover:bg-accent/50 cursor-pointer p-5 ${isActive ? "border-r-2 border-r-primary bg-accent":"bg-transparent "}`} onClick={onClick}>
      <div className="flex">
        <div className="flex-1 text-base font-medium text-foreground">
          {semesterName}
        </div>
        <div>
          {start <= now && now <= end ? (
            <Badge className="bg-green-200 text-green-700 dark:bg-green-950 dark:text-green-300">
              Laufend
            </Badge>
          ) : (
            <></>
          )}
        </div>
      </div>
      <div className="text-sm text-muted-foreground">
        {t("semesters.duration", {
          start: format(start, "PPP", { locale: dateLocale }),
          end: format(end, "PPP", { locale: dateLocale }),
        })}
      </div>
    </div>
  );
}
