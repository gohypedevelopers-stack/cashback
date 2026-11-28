// Client-side .ics (RFC 5545) for a booking_confirmation payload.booking:
// { id, advisorName, advisorTitle, startAt, endAt, mode, topic, meetingLink, timeLabel }

export const MODE_LABELS = { phone: "Phone call", video: "Video call", branch: "Branch visit" };

const pad = (n) => String(n).padStart(2, "0");

const toIcsUtc = (date) =>
  `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T` +
  `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;

const escapeText = (value) =>
  String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/([,;])/g, "\\$1");

const stripBreaks = (value) => String(value ?? "").replace(/[\r\n]+/g, "");

// Fold long content lines (75 octets; counted in code points, which is what
// calendar clients tolerate in practice).
const fold = (line) => {
  const chars = Array.from(line);
  if (chars.length <= 74) return line;
  const out = [chars.slice(0, 74).join("")];
  for (let i = 74; i < chars.length; i += 73) out.push(` ${chars.slice(i, i + 73).join("")}`);
  return out.join("\r\n");
};

export function buildBookingIcs(booking, { teamName = "Advisor desk", stamp = new Date() } = {}) {
  const start = new Date(booking?.startAt);
  if (Number.isNaN(start.getTime())) return null;
  let end = new Date(booking?.endAt);
  if (Number.isNaN(end.getTime()) || end <= start) end = new Date(start.getTime() + 30 * 60 * 1000);

  const mode = MODE_LABELS[booking?.mode] || "Advisor call";
  const advisor = booking?.advisorName || "your advisor";
  const summary = `${mode} with ${advisor}`;
  const link = /^https?:\/\//i.test(String(booking?.meetingLink || "")) ? stripBreaks(booking.meetingLink) : "";
  const description = [
    booking?.topic ? `Topic: ${booking.topic}` : null,
    booking?.advisorName
      ? `Advisor: ${booking.advisorName}${booking?.advisorTitle ? `, ${booking.advisorTitle}` : ""}`
      : null,
    link ? `Join: ${link}` : null,
    `Booked with ${teamName} on WhatsApp.`,
  ]
    .filter(Boolean)
    .join("\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Assured Rewards Labs//AI WhatsApp Concierge//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeText(booking?.id || start.getTime())}@ai-concierge.assuredrewards`,
    `DTSTAMP:${toIcsUtc(stamp)}`,
    `DTSTART:${toIcsUtc(start)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${escapeText(summary)}`,
    `DESCRIPTION:${escapeText(description)}`,
    `LOCATION:${escapeText(link || mode)}`,
    link ? `URL:${link}` : null,
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeText(summary)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return `${lines.map(fold).join("\r\n")}\r\n`;
}

// Builds the file in the browser and triggers a download. Returns false when
// the booking has no usable start time.
export function downloadBookingIcs(booking, options) {
  const ics = buildBookingIcs(booking, options);
  if (!ics) return false;
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "advisor-call.ics";
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return true;
}
