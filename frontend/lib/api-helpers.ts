export async function handleApiError(response: Response) {
  let errorData
  try {
    errorData = await response.json()
  } catch (e) {
    errorData = { error: "An unknown error occurred" }
  }

  const error = new Error(errorData.error || `API error: ${response.status}`)
  // @ts-ignore
  error.status = response.status
  // @ts-ignore
  error.data = errorData
  return error
}

