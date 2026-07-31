function parseLocalDate(value: string) {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/
  );

  if (!match) return new Date(value);

  const [, year, month, day, hour = "0", minute = "0", second = "0"] = match;

  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  );
}

export function formatLocalDate(value: string) {
  return parseLocalDate(value).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatLocalWeekdayDate(value: string) {
  return parseLocalDate(value).toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatLocalDateShort(value: string) {
  return parseLocalDate(value).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
  });
}

export function formatLocalDateTime(value: string) {
  return parseLocalDate(value).toLocaleString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatLocalTime(value: string) {
  const date = parseLocalDate(value);

  return date.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
