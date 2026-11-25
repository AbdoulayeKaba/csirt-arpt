'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

import { APP_LOCALE, APP_TIMEZONE } from '@/lib/datetime/locale';

const TIMEZONE = APP_TIMEZONE;

function formatClock(date: Date) {
  return date.toLocaleTimeString(APP_LOCALE, {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDate(date: Date) {
  return date.toLocaleDateString(APP_LOCALE, {
    timeZone: TIMEZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function DgHeaderClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const timeLabel = now ? formatClock(now) : '--:--:--';
  const dateLabel = now ? formatDate(now) : '···';

  return (
    <div
      className="dg-header-clock"
      aria-live="polite"
      aria-label={now ? `Heure actuelle ${timeLabel}` : 'Horloge'}
    >
      <span className="dg-header-clock-icon-wrap" aria-hidden>
        <Clock className="dg-header-clock-icon" />
      </span>
      <div className="dg-header-clock-text">
        <time
          className="dg-header-clock-time"
          dateTime={now?.toISOString()}
          suppressHydrationWarning
        >
          {timeLabel}
        </time>
        <span className="dg-header-clock-date" suppressHydrationWarning>
          {dateLabel}
        </span>
      </div>
    </div>
  );
}
