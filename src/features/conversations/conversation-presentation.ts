const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});
const weekdayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
});

function startOfDay(value: Date): number {
  return new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate(),
  ).getTime();
}

export function formatConversationActivity(value: string): string | null {
  const activityAt = new Date(value);

  if (Number.isNaN(activityAt.getTime())) {
    return null;
  }

  const today = new Date();
  const dayDifference = Math.round(
    (startOfDay(today) - startOfDay(activityAt)) / 86_400_000,
  );

  if (dayDifference === 0) {
    return timeFormatter.format(activityAt);
  }

  if (dayDifference === 1) {
    return "Yesterday";
  }

  if (dayDifference > 1 && dayDifference < 7) {
    return weekdayFormatter.format(activityAt);
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    ...(activityAt.getFullYear() !== today.getFullYear()
      ? { year: "numeric" }
      : {}),
  }).format(activityAt);
}

export function formatLastSeen(value: string): string | null {
  const lastSeenAt = new Date(value);

  if (Number.isNaN(lastSeenAt.getTime())) {
    return null;
  }

  const today = new Date();
  const dayDifference = Math.round(
    (startOfDay(today) - startOfDay(lastSeenAt)) / 86_400_000,
  );

  if (dayDifference === 0) {
    return `Last seen ${timeFormatter.format(lastSeenAt)}`;
  }

  if (dayDifference === 1) {
    return `Last seen yesterday at ${timeFormatter.format(lastSeenAt)}`;
  }

  if (dayDifference > 1 && dayDifference < 7) {
    return `Last seen ${weekdayFormatter.format(lastSeenAt)} at ${timeFormatter.format(lastSeenAt)}`;
  }

  return `Last seen ${new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    ...(lastSeenAt.getFullYear() !== today.getFullYear()
      ? { year: "numeric" }
      : {}),
  }).format(lastSeenAt)}`;
}
