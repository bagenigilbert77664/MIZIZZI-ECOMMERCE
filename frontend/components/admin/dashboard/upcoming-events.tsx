"use client"

import { motion } from "framer-motion"
import { CalendarIcon, Clock, Calendar, Plus, ChevronRight } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"

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
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  }

  const getEventTypeStyles = (type: string) => {
    switch (type) {
      case "meeting":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
      case "deadline":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
      case "task":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
      default:
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
    }
  }

  // Generate dates for the mini calendar
  const today = new Date()
  const calendarDays = Array.from({ length: 5 }, (_, i) => {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    return {
      day: date.getDate(),
      weekday: date.toLocaleDateString("en-US", { weekday: "short" }),
      month: date.toLocaleDateString("en-US", { month: "short" }),
      isToday: i === 0,
    }
  })

  return (
    <div>
      <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Upcoming Events</h3>
        <Button variant="outline" size="sm" className="h-8 gap-1">
          <Plus className="h-3.5 w-3.5" />
          <span>Add Event</span>
        </Button>
      </div>

      {/* Mini calendar strip */}
      <div className="px-6 pt-4 pb-2">
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {calendarDays.map((day, index) => (
            <motion.div
              key={index}
              className={`flex-shrink-0 flex flex-col items-center p-2 rounded-lg cursor-pointer ${
                day.isToday
                  ? "bg-cherry-50 text-cherry-700 border border-cherry-200 dark:bg-cherry-900/20 dark:text-cherry-400 dark:border-cherry-800"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
              }`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <span className="text-xs font-medium">{day.weekday}</span>
              <span className={`text-lg font-bold ${day.isToday ? "text-cherry-600 dark:text-cherry-400" : ""}`}>
                {day.day}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{day.month}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {events.length === 0 ? (
        <div className="p-6">
          <motion.div
            className="flex flex-col items-center justify-center py-8 text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <Calendar className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Your schedule is clear</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mb-6">
              No upcoming events scheduled. Add events to keep track of important dates and deadlines.
            </p>
            <Button className="bg-cherry-600 hover:bg-cherry-700 text-white gap-2">
              <Plus className="h-4 w-4" />
              Schedule Event
            </Button>
          </motion.div>
        </div>
      ) : (
        <ScrollArea className="h-[320px]">
          <motion.div className="p-4 space-y-3" variants={container} initial="hidden" animate="show">
            {events.map((event) => (
              <motion.div
                key={event.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-white dark:bg-gray-800 hover:shadow-md transition-shadow"
                variants={item}
                whileHover={{ x: 5 }}
              >
                <div className="flex flex-col items-center justify-center min-w-12 h-12 rounded-md bg-cherry-50 dark:bg-cherry-900/20 text-cherry-600 dark:text-cherry-400">
                  <CalendarIcon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{event.title}</h4>
                    <div className={`px-2 py-1 text-xs rounded-full ${getEventTypeStyles(event.type)}`}>
                      {event.type}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-1">
                    <span>{event.date}</span>
                    <span>•</span>
                    <div className="flex items-center">
                      <Clock className="h-3.5 w-3.5 mr-1" />
                      <span>{event.time}</span>
                    </div>
                  </div>
                </div>
                <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </motion.div>
            ))}
          </motion.div>
        </ScrollArea>
      )}
    </div>
  )
}
