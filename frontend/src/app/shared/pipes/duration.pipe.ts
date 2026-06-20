import { Pipe, PipeTransform } from '@angular/core';

/**
 * Converts minutes (number) to "Xh Ym" format.
 * Example: 135 → "2h 15m"
 */
@Pipe({
  name: 'duration',
  standalone: true
})
export class DurationPipe implements PipeTransform {
  transform(minutes: number | string | null | undefined): string {
    if (minutes === null || minutes === undefined) return '—';
    const mins = typeof minutes === 'string' ? parseFloat(minutes) : minutes;
    if (isNaN(mins) || mins < 0) return '—';

    const hours = Math.floor(mins / 60);
    const remaining = Math.round(mins % 60);

    if (hours === 0) return `${remaining}m`;
    if (remaining === 0) return `${hours}h`;
    return `${hours}h ${remaining}m`;
  }
}
