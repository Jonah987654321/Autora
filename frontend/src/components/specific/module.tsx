import { ChevronRight } from "lucide-react";
import type ModuleData from "@/models/module";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";
import SeperatorDot from "../ui/seperator-dot";

interface ModuleProps {
  data: ModuleData;
}

const colorMap: Record<string, string> = {
  red: "border-l-red-500",
  orange: "border-l-orange-500",
  amber: "border-l-amber-500",
  green: "border-l-green-500",
  emerald: "border-l-emerald-500",
  blue: "border-l-blue-500",
  indigo: "border-l-indigo-500",
  purple: "border-l-purple-500",
  pink: "border-l-pink-500",
  gray: "border-l-gray-500",
};

export default function Module({ data }: ModuleProps) {
  const { t } = useTranslation();

  return (
    <NavLink to={`/course/${data.id}`}>
      <div
        className={`border-muted border-2 p-2 rounded-md mt-2 hover:bg-accent cursor-pointer border-l-6 ${colorMap[data.color]} rounded-l-sm`}
      >
        <div className="flex pl-2">
          <div className="flex-1">
            {data.name}
            <div className="text-muted-foreground text-sm">
              {t("course.status")}:{" "}
              {data.grade !== undefined
                ? `${t("course.statusCompleted")} (${data.grade})`
                : t("course.statusInProgress")}
              {data.ects && (
                <>
                  <SeperatorDot /> {t("course.ects")}: {data.ects}
                </>
              )}
            </div>
          </div>
          <div className="flex items-center pr-1">
            <ChevronRight />
          </div>
        </div>
      </div>
    </NavLink>
  );
}
