export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
  const response = await fetch(`${baseUrl}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => `API error: ${response.status}`);
    throw new Error(message || `API error: ${response.status}`);
  }

  return response.json() as Promise<T>;
}


