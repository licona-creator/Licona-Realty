/**
 * Shared fetcher for SWR hooks.
 * Throws on non-OK responses so SWR can handle errors.
 */
export const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return res.json();
};
