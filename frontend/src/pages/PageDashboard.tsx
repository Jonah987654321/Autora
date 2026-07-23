import { WeekView } from "@/components/specific/calendar";
import { TodoEntry, TodoList } from "@/components/specific/todo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { CardActionHeader } from "@/components/ui/cardActionHeader";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarPlus, CirclePlus, Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function PageDashboard() {
  const { t } = useTranslation();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Willkommen, Jonah</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <Card className="bg-muted rounded-xl">
            <CardActionHeader title={t("dashboard.current")} />
            <CardContent></CardContent>
          </Card>
        </div>
        <div>
          <Card className="bg-muted rounded-xl">
            <CardActionHeader
              title={t("dashboard.courses")}
              action={
                <Badge
                  variant="default"
                  className="bg-blue-200 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                >
                  SS26
                </Badge>
              }
            />
            <CardContent></CardContent>
          </Card>
        </div>
        <div>
          <Card className="bg-muted rounded-xl">
            <CardActionHeader
              title={t("dashboard.dailySchedule")}
              action={
                <Button>
                  <Settings2 /> {t("dashboard.dailyScheduleModify")}
                </Button>
              }
            />
            <CardContent></CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card className="bg-muted rounded-xl">
            <CardActionHeader
              title={t("dashboard.calendar")}
              action={
                <Button>
                  <CalendarPlus /> {t("dashboard.calendarNewEntry")}
                </Button>
              }
            />
            <CardContent className="h-75">
              <WeekView></WeekView>
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-1">
          <Card className="bg-muted rounded-xl">
            <CardActionHeader
              title={t("dashboard.toDoList")}
              action={
                <Button>
                  <CirclePlus /> {t("dashboard.toDoListNewEntry")}
                </Button>
              }
            />
            <CardContent>
              <ScrollArea className="h-75">
                <TodoList>
                  <TodoEntry title="Do something" id="ace" />
                  <TodoEntry title="Do something 2" id="ace2" />
                </TodoList>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
