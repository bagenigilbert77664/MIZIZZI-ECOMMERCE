export default function SizeGuidePage() {
  return (
    <div className="container py-8">
      <h1 className="mb-8 text-2xl font-bold">Size Guide</h1>
      <div className="prose max-w-none">
        <h2 className="text-xl font-semibold">Jewelry Sizes</h2>
        <table className="min-w-full mt-4">
          <thead>
            <tr className="border-b">
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Small</th>
              <th className="px-4 py-2">Medium</th>
              <th className="px-4 py-2">Large</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="px-4 py-2">Necklace</td>
              <td className="px-4 py-2">16"</td>
              <td className="px-4 py-2">18"</td>
              <td className="px-4 py-2">20"</td>
            </tr>
            <tr className="border-b">
              <td className="px-4 py-2">Bracelet</td>
              <td className="px-4 py-2">6"</td>
              <td className="px-4 py-2">7"</td>
              <td className="px-4 py-2">8"</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

