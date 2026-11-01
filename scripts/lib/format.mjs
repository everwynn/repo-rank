const DAY_MS = 86_400_000;

export function formatStars(stars) {
  if (stars < 1000) return String(stars);
  if (stars < 10_000) return `${(stars / 1000).toFixed(1)}k`;
  if (stars < 999_500) return `${Math.round(stars / 1000)}k`;
  return `${(stars / 1_000_000).toFixed(1)}M`;
}

export function relativeTime(iso, now = Date.now()) {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return '—';
  const days = Math.round((now - time) / DAY_MS);
  if (days <= 0) return '今天';
  if (days === 1) return '昨天';
  if (days < 30) return `${days} 天前`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} 个月前`;
  return `${Math.round(months / 12)} 年前`;
}

export function formatUpdatedAt(iso) {
  const time = new Date(iso);
  if (!iso || Number.isNaN(time.getTime())) return '尚未抓取';
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(time);
}
