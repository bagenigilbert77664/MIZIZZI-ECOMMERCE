import { AdminCommunicationPanel } from "@/components/admin/communications/admin-communication-panel"

export default function CommunicationsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">User Communications</h1>
        <p className="text-muted-foreground mt-2">Send notifications and announcements to your users</p>
      </div>

      <AdminCommunicationPanel />
    </div>
  )
}

