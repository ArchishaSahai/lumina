export function formatDateTime(value: string | Date) {
  return new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).replace(",", " •");
}

export function formatUpdatedAt(value: string | Date) {
  const differenceInMinutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (differenceInMinutes < 1) return "Updated just now";
  if (differenceInMinutes < 60) return `Updated ${differenceInMinutes} minutes ago`;
  if (differenceInMinutes < 1_440) return `Updated ${Math.floor(differenceInMinutes / 60)} hours ago`;
  return `Updated ${formatDateTime(value)}`;
}

export function formatMediaTimestamp(milliseconds: number | null | undefined) {
  if (milliseconds == null || milliseconds < 0) return null;
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${String(totalSeconds % 60).padStart(2, "0")}`;
}
