/** Duración por defecto: 2 horas (7-9pm Perú) */
const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000;

/** true si la clase ya terminó (scheduled_at + duración < now) */
export function isLessonCompleted(
  scheduledAt: string | null,
  nowMs: number = Date.now(),
  durationMinutes?: number | null
): boolean {
  if (!scheduledAt) return false;
  const startMs = new Date(scheduledAt).getTime();
  if (!Number.isFinite(startMs)) return false;
  const durationMs =
    typeof durationMinutes === 'number' && durationMinutes > 0
      ? durationMinutes * 60 * 1000
      : DEFAULT_DURATION_MS;
  return startMs + durationMs < nowMs;
}
