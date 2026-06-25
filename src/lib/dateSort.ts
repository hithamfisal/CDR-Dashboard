export function monthSortValue(label: string) {
  const text = `${label ?? ""}`.trim().toLowerCase();
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const monthIndex = months.findIndex((month) => text.includes(month));
  const numericMonth = /(?:^|\D)(1[0-2]|0?[1-9])(?:\D|$)/.exec(text)?.[1];
  const index = monthIndex >= 0 ? monthIndex : numericMonth ? Number(numericMonth) - 1 : 99;
  const year = /(19|20)\d{2}/.exec(text)?.[0];
  return (year ? Number(year) * 12 : 0) + index;
}

export function weekSortValue(label: string) {
  const text = `${label ?? ""}`.trim();
  const lower = text.toLowerCase();
  if (!lower || lower === "unknown") return Number.MAX_SAFE_INTEGER;

  const formatted = /week\s*(\d+)\s*of\s*([a-z]+)\s*((?:19|20)\d{2})/i.exec(text);
  if (formatted) {
    const week = Number(formatted[1]);
    const monthText = formatted[2].slice(0, 3).toLowerCase();
    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const monthIndex = months.indexOf(monthText);
    const year = Number(formatted[3]);
    if (monthIndex >= 0 && Number.isFinite(week) && Number.isFinite(year)) {
      return year * 100 + monthIndex * 6 + week;
    }
  }

  const numeric = /\d+/.exec(text)?.[0];
  return numeric ? Number(numeric) : Number.MAX_SAFE_INTEGER - 1;
}
