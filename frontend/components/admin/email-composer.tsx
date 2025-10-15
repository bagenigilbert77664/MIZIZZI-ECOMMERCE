"use client"

import { useState } from "react"
import { X, Send, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { api } from "@/lib/api"

interface EmailComposerProps {
  isOpen: boolean
  onClose: () => void
  recipientEmail: string
  recipientName: string
  userId?: number
}

export function EmailComposer({ isOpen, onClose, recipientEmail, recipientName, userId }: EmailComposerProps) {
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [isSending, setIsSending] = useState(false)

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in both subject and message fields.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSending(true)

      const response = await api.post("/api/admin/send-email", {
        to: recipientEmail,
        subject,
        message,
        user_id: userId,
      })

      toast({
        title: "Email Sent",
        description: `Your message has been sent to ${recipientName}.`,
      })

      // Reset form and close
      setSubject("")
      setMessage("")
      onClose()
    } catch (error) {
      toast({
        title: "Failed to Send",
        description:
          error instanceof Error ? error.message : "There was an error sending your email. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleClose = () => {
    if (!isSending) {
      setSubject("")
      setMessage("")
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 overflow-hidden">
        <VisuallyHidden>
          <DialogTitle>Send Email to {recipientName}</DialogTitle>
          <DialogDescription>Compose and send an email message to {recipientEmail}</DialogDescription>
        </VisuallyHidden>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-0.5">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">New Message</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Send an email to {recipientName}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            disabled={isSending}
            className="h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Form */}
        <div className="px-6 py-6 space-y-5">
          {/* To Field */}
          <div className="space-y-2">
            <Label htmlFor="to" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              To
            </Label>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-white text-xs font-semibold">
                {recipientName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-white">{recipientName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{recipientEmail}</p>
              </div>
            </div>
          </div>

          {/* Subject Field */}
          <div className="space-y-2">
            <Label htmlFor="subject" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Subject
            </Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject"
              disabled={isSending}
              className="h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500"
            />
          </div>

          {/* Message Field */}
          <div className="space-y-2">
            <Label htmlFor="message" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Message
            </Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              disabled={isSending}
              className="min-h-[200px] resize-none bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">{message.length} characters</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <Button variant="outline" onClick={handleClose} disabled={isSending} className="h-10 px-5 bg-transparent">
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSending || !subject.trim() || !message.trim()}
            className="h-10 px-5 bg-blue-500 hover:bg-blue-600 text-white shadow-sm"
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Email
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
