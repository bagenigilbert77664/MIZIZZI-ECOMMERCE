export default function SettingsPage() {
  return (
    <div className="container py-8">
      <h1 className="mb-8 text-2xl font-bold">Account Settings</h1>
      <div className="max-w-2xl">
        <div className="rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Personal Information</h2>
          <form className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="first-name" className="block text-sm font-medium mb-1">
                  First Name
                </label>
                <input type="text" id="first-name" className="w-full rounded-md border border-input px-3 py-2" />
              </div>
              <div>
                <label htmlFor="last-name" className="block text-sm font-medium mb-1">
                  Last Name
                </label>
                <input type="text" id="last-name" className="w-full rounded-md border border-input px-3 py-2" />
              </div>
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email
              </label>
              <input type="email" id="email" className="w-full rounded-md border border-input px-3 py-2" />
            </div>
            <button type="submit" className="rounded-md bg-cherry-600 px-4 py-2 text-white hover:bg-cherry-700">
              Save Changes
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

