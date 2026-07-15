import { WeekView } from "@/components/specific/calendar";
import { TodoEntry, TodoList } from "@/components/specific/todo";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarPlus, CirclePlus } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function PageDashboard() {
  const { t } = useTranslation();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Willkommen, Jonah</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <Card className="bg-muted rounded-xl">
            <CardHeader>
              <CardTitle>{t("dashboard.dailySchedule")}</CardTitle>
            </CardHeader>
            <CardContent>
            </CardContent>
          </Card>
        </div>
        <div>
          <Card className="bg-muted rounded-xl">
            <CardHeader>
              <CardTitle>{t("dashboard.courses")}</CardTitle>
            </CardHeader>
            <CardContent>
            </CardContent>
          </Card>
        </div>
        <div>
          <Card className="bg-muted rounded-xl">
            <CardHeader>
              <CardTitle>N/A</CardTitle>
            </CardHeader>
            <CardContent>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card className="bg-muted rounded-xl">
            <CardHeader>
              <CardTitle>{t("dashboard.calendar")}</CardTitle>
              <CardAction>
                <Button><CalendarPlus /> {t("dashboard.calendarNewEntry")}</Button>
              </CardAction>
            </CardHeader>
            <CardContent className="h-75">
              <WeekView></WeekView>
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-1">
          <Card className="bg-muted rounded-xl">
            <CardHeader>
              <CardTitle>{t("dashboard.toDoList")}</CardTitle>
              <CardAction>
                <Button><CirclePlus /> {t("dashboard.toDoListNewEntry")}</Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-75">
                <TodoList>
                  <TodoEntry title="Do something" id="ace"/>
                  <TodoEntry title="Do something 2" id="ace2"/>
                </TodoList>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
