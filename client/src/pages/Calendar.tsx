import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Wrench,
  ReceiptText,
  ShoppingCart,
  CalendarDays,
  List,
} from "lucide-react";
import { useCurrency } from "@/hooks/use-currency";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";

type CalendarEventType = "service_report" | "ar_due" | "ap_due";

interface CalendarEvent {
  id: string;
  date: string;
  type: CalendarEventType;
  title: string;
  subtitle?: string;
  entityId: string;
  entityType: "service_report" | "accounts_receivable" | "accounts_payable";
  status?: string;
  amount?: string;
}

const EVENT_META: Record<
  CalendarEventType,
  { label: string; badgeVariant: "info" | "success" | "warning"; dot: string; icon: typeof Wrench }
> = {
  service_report: { label: "Service Visit", badgeVariant: "info", dot: "bg-blue-500", icon: Wrench },
  ar_due: { label: "Receivable Due", badgeVariant: "success", dot: "bg-emerald-500", icon: ReceiptText },
  ap_due: { label: "Payable Due", badgeVariant: "warning", dot: "bg-amber-500", icon: ShoppingCart },
};

type ViewMode = "month" | "agenda";

export default function CalendarPage() {
  const [, setLocation] = useLocation();
  const { formatCurrency } = useCurrency();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [view, setView] = useState<ViewMode>("month");
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const { data: events = [], isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar"],
  });

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const key = format(new Date(event.date), "yyyy-MM-dd");
      const list = map.get(key) || [];
      list.push(event);
      map.set(key, list);
    }
    return map;
  }, [events]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const upcomingEvents = useMemo(() => {
    return [...events]
      .filter((e) => new Date(e.date) >= monthStart && new Date(e.date) <= monthEnd)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [events, monthStart, monthEnd]);

  const handleEventClick = (event: CalendarEvent) => {
    if (event.entityType === "service_report") {
      setLocation(`/service-reports/edit/${event.entityId}`);
    } else if (event.entityType === "accounts_receivable") {
      setLocation(`/accounts-receivables?editArId=${event.entityId}`);
    } else if (event.entityType === "accounts_payable") {
      setLocation(`/sales-financial/pl-cash-flow`);
    }
  };

  const selectedDayEvents = selectedDay
    ? eventsByDay.get(format(selectedDay, "yyyy-MM-dd")) || []
    : [];

  return (
    <div className="flex-1 space-y-6 p-6" data-testid="page-calendar">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight" data-testid="text-calendar-title">
            Calendar
          </h2>
          <p className="text-muted-foreground" data-testid="text-calendar-subtitle">
            Scheduled service visits, receivables, and payables in one place
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border p-0.5">
            <Button
              size="sm"
              variant={view === "month" ? "default" : "ghost"}
              className="h-8 gap-1.5"
              onClick={() => setView("month")}
              data-testid="button-view-month"
            >
              <CalendarDays className="h-4 w-4" />
              Month
            </Button>
            <Button
              size="sm"
              variant={view === "agenda" ? "default" : "ghost"}
              className="h-8 gap-1.5"
              onClick={() => setView("agenda")}
              data-testid="button-view-agenda"
            >
              <List className="h-4 w-4" />
              Agenda
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="outline"
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            data-testid="button-prev-month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            data-testid="button-next-month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-lg font-semibold ml-2" data-testid="text-current-month">
            {format(currentMonth, "MMMM yyyy")}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setCurrentMonth(new Date())}
            data-testid="button-today"
          >
            Today
          </Button>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          {(Object.keys(EVENT_META) as CalendarEventType[]).map((type) => (
            <div key={type} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${EVENT_META[type].dot}`} />
              {EVENT_META[type].label}
            </div>
          ))}
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
              Loading calendar…
            </div>
          </CardContent>
        </Card>
      ) : view === "month" ? (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-7 gap-px text-center text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="py-2">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px rounded-lg overflow-hidden border bg-border">
              {days.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const dayEvents = eventsByDay.get(key) || [];
                const inMonth = isSameMonth(day, currentMonth);
                const isSelected = selectedDay && isSameDay(day, selectedDay);
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDay(day)}
                    data-testid={`calendar-cell-${key}`}
                    className={`min-h-[100px] bg-card p-2 text-left align-top transition-colors hover:bg-accent/40 ${
                      inMonth ? "" : "opacity-40"
                    } ${isSelected ? "ring-2 ring-inset ring-primary" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-xs font-medium ${
                          isToday(day)
                            ? "flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {format(day, "d")}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEventClick(event);
                          }}
                          data-testid={`calendar-event-${event.id}`}
                          className="flex items-center gap-1 rounded px-1 py-0.5 text-[10px] font-medium truncate hover:opacity-80"
                          style={{ backgroundColor: "hsl(var(--muted))" }}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${EVENT_META[event.type].dot}`} />
                          <span className="truncate">{event.title}</span>
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-[10px] text-muted-foreground pl-1">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Events in {format(currentMonth, "MMMM yyyy")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm" data-testid="text-no-events">
                No scheduled events this month.
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map((event) => {
                  const meta = EVENT_META[event.type];
                  const Icon = meta.icon;
                  return (
                    <div
                      key={event.id}
                      onClick={() => handleEventClick(event)}
                      data-testid={`agenda-event-${event.id}`}
                      className="flex items-center justify-between gap-4 rounded-lg border p-3 cursor-pointer hover:bg-accent/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 ${meta.dot} bg-opacity-15`}>
                          <Icon className="h-4 w-4 text-foreground/70" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{event.title}</div>
                          {event.subtitle && (
                            <div className="text-xs text-muted-foreground truncate">{event.subtitle}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {event.amount && (
                          <span className="text-sm font-medium">{formatCurrency(event.amount)}</span>
                        )}
                        <Badge variant={meta.badgeVariant}>{meta.label}</Badge>
                        <span className="text-xs text-muted-foreground w-20 text-right">
                          {format(new Date(event.date), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedDay && view === "month" && (
        <Card data-testid="card-selected-day">
          <CardHeader>
            <CardTitle className="text-base">
              {format(selectedDay, "EEEE, MMMM d, yyyy")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDayEvents.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">
                No events on this day.
              </div>
            ) : (
              <div className="space-y-2">
                {selectedDayEvents.map((event) => {
                  const meta = EVENT_META[event.type];
                  const Icon = meta.icon;
                  return (
                    <div
                      key={event.id}
                      onClick={() => handleEventClick(event)}
                      data-testid={`day-event-${event.id}`}
                      className="flex items-center justify-between gap-4 rounded-lg border p-3 cursor-pointer hover:bg-accent/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon className="h-4 w-4 text-foreground/70 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{event.title}</div>
                          {event.subtitle && (
                            <div className="text-xs text-muted-foreground truncate">{event.subtitle}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {event.amount && (
                          <span className="text-sm font-medium">{formatCurrency(event.amount)}</span>
                        )}
                        <Badge variant={meta.badgeVariant}>{meta.label}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
