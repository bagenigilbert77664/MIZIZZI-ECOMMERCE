"use client"

import { CalendarIcon, Clock } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Event {
  id: string
  title: string
  date: string
  time: string
  type: string
}

interface UpcomingEventsProps {
  events: Event[]
}

export function UpcomingEvents({ events = [] }: UpcomingEventsProps) {
  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold mb-4">Upcoming Events</h3>

      {events.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No upcoming events scheduled</div>
      ) : (
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-4">
            {events.map((event) => (
              <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                <div className="flex flex-col items-center justify-center w-12 h-12 rounded-md bg-primary/10 text-primary">
                  <CalendarIcon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">{event.title}</h4>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <span>{event.date}</span>
                    <span>•</span>
                    <div className="flex items-center">
                      <Clock className="h-3.5 w-3.5 mr-1" />
                      <span>{event.time}</span>
                    </div>
                  </div>
                </div>
                <div
                  className={`px-2 py-1 text-xs rounded-full ${
                    event.type === "meeting"
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                      : event.type === "deadline"
                        ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                        : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                  }`}
                >
                  {event.type}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}

