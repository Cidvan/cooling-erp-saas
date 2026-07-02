import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Gift } from "lucide-react";
import { Client } from "@shared/schema";

interface UpcomingBirthdaysProps {
  clients: Client[];
  daysAhead?: number;
}

export default function UpcomingBirthdays({ clients, daysAhead = 30 }: UpcomingBirthdaysProps) {
  const getUpcomingBirthdays = () => {
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + daysAhead);

    return clients.filter(client => {
      if (!client.birthdate) return false;
      
      const birthdate = new Date(client.birthdate);
      const thisYearBirthday = new Date(today.getFullYear(), birthdate.getMonth(), birthdate.getDate());
      
      // If birthday already passed this year, check next year
      if (thisYearBirthday < today) {
        thisYearBirthday.setFullYear(today.getFullYear() + 1);
      }
      
      return thisYearBirthday <= endDate;
    }).sort((a, b) => {
      if (!a.birthdate || !b.birthdate) return 0;
      const aDate = new Date(new Date().getFullYear(), new Date(a.birthdate).getMonth(), new Date(a.birthdate).getDate());
      const bDate = new Date(new Date().getFullYear(), new Date(b.birthdate).getMonth(), new Date(b.birthdate).getDate());
      return aDate.getTime() - bDate.getTime();
    });
  };

  const upcomingBirthdays = getUpcomingBirthdays();

  const getDaysUntilBirthday = (birthdate: Date | string) => {
    const today = new Date();
    const birth = new Date(birthdate);
    const thisYearBirthday = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
    
    if (thisYearBirthday < today) {
      thisYearBirthday.setFullYear(today.getFullYear() + 1);
    }
    
    const diffTime = thisYearBirthday.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getBirthdayBadge = (days: number) => {
    if (days === 0) return { variant: "destructive" as const, text: "Today!" };
    if (days <= 7) return { variant: "default" as const, text: `${days} days` };
    if (days <= 14) return { variant: "secondary" as const, text: `${days} days` };
    return { variant: "outline" as const, text: `${days} days` };
  };

  if (upcomingBirthdays.length === 0) {
    return null;
  }

  return (
    <Card data-testid="upcoming-birthdays" className="hover-elevate">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Gift className="h-5 w-5 text-primary" />
          Upcoming Birthdays
          <Badge variant="outline" className="ml-auto">
            {upcomingBirthdays.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcomingBirthdays.slice(0, 5).map((client) => {
          const daysUntil = getDaysUntilBirthday(client.birthdate!);
          const badge = getBirthdayBadge(daysUntil);
          
          return (
            <div 
              key={client.id}
              className="flex items-center justify-between p-3 border rounded-lg hover-elevate"
              data-testid={`birthday-client-${client.id}`}
            >
              <div className="flex items-center gap-3">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium text-sm" data-testid={`birthday-name-${client.id}`}>
                    {client.name}
                  </div>
                  <div className="text-xs text-muted-foreground" data-testid={`birthday-date-${client.id}`}>
                    {new Date(client.birthdate!).toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </div>
                </div>
              </div>
              <Badge 
                variant={badge.variant}
                className="text-xs"
                data-testid={`birthday-badge-${client.id}`}
              >
                {badge.text}
              </Badge>
            </div>
          );
        })}
        
        {upcomingBirthdays.length > 5 && (
          <div className="text-center pt-2">
            <span className="text-xs text-muted-foreground">
              +{upcomingBirthdays.length - 5} more upcoming
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}