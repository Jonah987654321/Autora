import {
  editModule,
  getModule,
  getSemesterByID,
  setWeeklySchedule,
} from "@/api/academic";
import ModuleDialog from "@/components/specific/moduleDialog";
import SemesterTransfer from "@/components/specific/modules/semesterTransfer";
import WeeklyScheduleDialog from "@/components/specific/modules/weeklyScheduleDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CardActionHeader } from "@/components/ui/cardActionHeader";
import SeperatorDot from "@/components/ui/seperator-dot";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getErrorStatus } from "@/lib/errors";
import type ModuleData from "@/models/module";
import type SemesterData from "@/models/semester";
import {
  ArrowLeftRight,
  CalendarFold,
  CalendarPlus,
  CircleX,
  Edit,
  FilePlusCorner,
  FileX,
  NotebookPen,
  Plus,
  Trash,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useParams } from "react-router";

interface courseMetatagProps {
  content: string;
}

function CourseMetatag({ content }: courseMetatagProps) {
  return (
    <span className="text-sm bg-muted rounded-xl px-2 py-1 inline-block">
      {content}
    </span>
  );
}

export default function PageCourse() {
  const { courseId } = useParams();
  const { t } = useTranslation();

  const [noCourseError, setNoCourseError] = useState(false);
  const [serverError, setServerError] = useState(false);
  const [mainModuleDataLoading, setMainModuleDataLoading] = useState(false);

  const [moduleData, setModuleData] = useState<ModuleData | undefined>();
  const [semesterData, setSemesterData] = useState<SemesterData | undefined>();

  const fetchCourse = async () => {
    if (courseId === undefined) {
      setNoCourseError(true);
      return;
    }

    setMainModuleDataLoading(true);
    setNoCourseError(false);
    setServerError(false);

    try {
      const module = await getModule(courseId);
      setModuleData(module);
      const semester = await getSemesterByID(module.semesterID);
      setSemesterData(semester);
    } catch (error) {
      const code = getErrorStatus(error);
      if (code === 404) {
        setNoCourseError(true);
      } else {
        setServerError(true);
      }
    } finally {
      setMainModuleDataLoading(false);
    }
  };

  useEffect(() => {
    fetchCourse();
  }, []);

  return (
    <>
      <div className="p-6 h-dvh">
        {!mainModuleDataLoading && noCourseError && (
          <div className="flex flex-col items-center justify-center h-full">
            <div>
              <FileX className="text-red-400 size-10 stroke-1" />
            </div>
            <div className="text-red-400 mt-5 mb-5">
              {t("course.errors.notFound")}
            </div>
            <div>
              <NavLink to="/semesters">
                <Button variant="secondary" size="lg">
                  {t("course.errors.notFoundAction")}
                </Button>
              </NavLink>
            </div>
          </div>
        )}
        {!mainModuleDataLoading && serverError && (
          <div className="flex flex-col items-center justify-center h-full">
            <div>
              <CircleX className="text-red-400 size-10 stroke-1" />
            </div>
            <div className="text-red-400 mt-5 mb-5">
              {t("course.errors.server")}
            </div>
            <div>
              <Button
                onClick={(_) => fetchCourse()}
                variant="secondary"
                size="lg"
              >
                {t("course.errors.serverAction")}
              </Button>
            </div>
          </div>
        )}
        {!mainModuleDataLoading && !serverError && !noCourseError && (
          <div className="h-full flex flex-col">
            <div className="flex mb-3">
              <div className="flex-1">
                <div className="mb-2">
                  {moduleData !== undefined ? (
                    <h1 className="text-2xl">
                      <span className="font-bold">
                        {t("course.title")}: {moduleData.name}
                      </span>{" "}
                      ({moduleData.abbreviation})
                    </h1>
                  ) : (
                    <Skeleton className="h-9 w-150 rounded-full" />
                  )}
                </div>
                <div className="space-x-2 flex">
                  {semesterData !== undefined ? (
                    <NavLink to={`/semesters/`}>
                      <CourseMetatag
                        content={`${t("course.semester")}: ${semesterData.name}`}
                      />
                    </NavLink>
                  ) : (
                    <Skeleton className="w-35 h-6.5" />
                  )}
                  {moduleData !== undefined ? (
                    <>
                      <CourseMetatag
                        content={`${t("course.status")}: ${
                          moduleData.grade !== undefined
                            ? `${t("course.statusCompleted")} (${moduleData.grade})`
                            : t("course.statusInProgress")
                        }`}
                      />
                      {moduleData.ects !== undefined ? (
                        <CourseMetatag
                          content={`${t("course.ects")}: ${moduleData.ects}`}
                        />
                      ) : (
                        <></>
                      )}
                    </>
                  ) : (
                    <>
                      <Skeleton className="w-35 h-6.5" />
                      <Skeleton className="w-35 h-6.5" />
                    </>
                  )}
                </div>
              </div>
              <div className="flex justify-center items-center h-full space-x-2">
                {semesterData !== undefined && moduleData !== undefined && (
                  <>
                    <SemesterTransfer
                      current={semesterData.id}
                      processTransfer={async (target: string) => {
                        await editModule(
                          moduleData.id,
                          target,
                          moduleData.name,
                          moduleData.abbreviation,
                          moduleData.color,
                          moduleData.ects,
                          moduleData.grade,
                        );
                        fetchCourse();
                      }}
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="secondary" size="icon-lg">
                            <ArrowLeftRight />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{t("course.tooltipsOptions.transferSemester")}</p>
                        </TooltipContent>
                      </Tooltip>
                    </SemesterTransfer>
                    <ModuleDialog
                      mode="edit"
                      onSave={async (
                        name: string,
                        abbr: string,
                        color: string,
                        ects?: number,
                        grade?: string,
                      ) => {
                        await editModule(
                          moduleData.id,
                          semesterData.id,
                          name,
                          abbr,
                          color,
                          ects,
                          grade,
                        );
                        fetchCourse();
                      }}
                      initialData={moduleData}
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="secondary" size="icon-lg">
                            <Edit />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{t("course.tooltipsOptions.editCourse")}</p>
                        </TooltipContent>
                      </Tooltip>
                    </ModuleDialog>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="destructive" size="icon-lg">
                          <Trash />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t("course.tooltipsOptions.deleteCourse")}</p>
                      </TooltipContent>
                    </Tooltip>
                  </>
                )}
              </div>
            </div>
            <div className="h-full grid grid-cols-3 gap-x-6 mt-4">
              <div className="flex flex-col gap-y-4">
                <div>
                  <Card className="rounded-xl">
                    <CardActionHeader
                      title={t("course.cards.flashcards")}
                      action={
                        <Button size="lg" variant="outline">
                          {t("course.cards.flashcardsActions")}
                        </Button>
                      }
                    ></CardActionHeader>
                  </Card>
                </div>
                <div className="flex-1">
                  <Card className="h-full rounded-xl">
                    <CardActionHeader
                      title={t("course.cards.lectureNotes")}
                      action={
                        <Button size="icon-lg" variant="outline">
                          <NotebookPen />
                        </Button>
                      }
                    ></CardActionHeader>
                  </Card>
                </div>
              </div>
              <div className="flex flex-col gap-y-4">
                <div>
                  <Card className="rounded-xl">
                    <CardActionHeader
                      title={t("course.cards.toDoList")}
                      action={
                        <Button size="icon-lg" variant="outline">
                          <Plus />
                        </Button>
                      }
                    ></CardActionHeader>
                  </Card>
                </div>
                <div className="flex-1">
                  <Card className="h-full rounded-xl">
                    <CardActionHeader
                      title={t("course.cards.exercises")}
                      action={
                        <Button size="icon-lg" variant="outline">
                          <FilePlusCorner />
                        </Button>
                      }
                    ></CardActionHeader>
                  </Card>
                </div>
              </div>
              <div className="flex flex-col gap-y-4">
                <div>
                  <Card className="rounded-xl">
                    <CardActionHeader
                      title={t("course.cards.weeklySchedule")}
                      action={
                        <WeeklyScheduleDialog
                          onSave={async (data) => {
                            if (moduleData !== undefined) {
                              await setWeeklySchedule(moduleData.id, data);
                              fetchCourse();
                            }
                          }}
                          initialData={moduleData?.weeklySchedule}
                        >
                          <Button
                            size="icon-lg"
                            variant="outline"
                            disabled={moduleData === undefined}
                          >
                            <Edit />
                          </Button>
                        </WeeklyScheduleDialog>
                      }
                    ></CardActionHeader>
                    <CardContent>
                      {!mainModuleDataLoading && moduleData !== undefined ? (
                        moduleData.weeklySchedule !== undefined &&
                        moduleData.weeklySchedule.length > 0 ? (
                          <div className="flex flex-col">
                            {(() => {
                              const timeFormatter = new Intl.DateTimeFormat(
                                undefined,
                                {
                                  timeStyle: "short",
                                },
                              );

                              return moduleData.weeklySchedule.map(
                                (e, index) => {
                                  const startDate = new Date();
                                  startDate.setHours(
                                    Math.floor(e.start / 60),
                                    e.start % 60,
                                    0,
                                    0,
                                  );

                                  const endDate = new Date();
                                  endDate.setHours(
                                    Math.floor(e.end / 60),
                                    e.end % 60,
                                    0,
                                    0,
                                  );

                                  return (
                                    <div
                                      key={index}
                                      className="flex justify-between items-baseline py-1.5 border-b border-border/40 last:border-0"
                                    >
                                      <div className="flex-1">
                                        <div className="flex items-baseline space-x-2 overflow-hidden">
                                          <span className="text-sm font-medium">
                                            {t(
                                              `calendar.weekdays.${e.weekday}`,
                                            )}
                                          </span>
                                          <span className="text-xs text-muted-foreground truncate">
                                            {t(`course.types.${e.type}`)}
                                          </span>
                                        </div>
                                      </div>
                                      {e.room !== "" && (
                                        <>
                                          <div className="text-muted-foreground">
                                            {e.room}
                                          </div>
                                          <SeperatorDot />
                                        </>
                                      )}
                                      <div className="text-xs font-medium whitespace-nowrap">
                                        {timeFormatter.format(startDate)} -{" "}
                                        {timeFormatter.format(endDate)}
                                      </div>
                                    </div>
                                  );
                                },
                              );
                            })()}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-muted-foreground mb-4 space-y-1">
                            <div>
                              <CalendarFold />
                            </div>
                            <div className="pt-2">
                              <p>{t("course.weeklySchedule.empty")}</p>
                            </div>
                          </div>
                        )
                      ) : (
                        <div className="space-y-2">
                          <Skeleton className="w-full h-7"></Skeleton>
                          <Skeleton className="w-full h-7"></Skeleton>
                          <Skeleton className="w-full h-7"></Skeleton>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
                <div className="flex-1">
                  <Card className="h-full rounded-xl">
                    <CardActionHeader
                      title={t("course.cards.events")}
                      action={
                        <Button size="icon-lg" variant="outline">
                          <CalendarPlus />
                        </Button>
                      }
                    ></CardActionHeader>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
