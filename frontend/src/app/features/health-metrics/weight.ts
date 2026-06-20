import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { WeightService, WeightRecord } from '../../core/services/weight.service';

@Component({
  selector: 'app-weight',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, DecimalPipe],
  templateUrl: './weight.html',
  styleUrl: './weight.css'
})
export class WeightComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly weightService = inject(WeightService);

  readonly logs = signal<WeightRecord[]>([]);
  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  // Calendar State Signals
  readonly currentMonthDate = signal<Date>(new Date());
  readonly selectedDate = signal<Date | null>(new Date());

  // Form for adding/editing records
  readonly weightForm = this.fb.group({
    weight: ['', [Validators.required, Validators.min(0.1), Validators.max(500)]],
    recordedAt: [this.formatLocalDateTime(new Date()), [Validators.required]]
  });

  // Track if we are editing a record
  readonly editingRecordId = signal<number | null>(null);

  // Format Date to YYYY-MM-DDTHH:MM local string
  formatLocalDateTime(date: Date): string {
    const timezoneOffset = date.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(date.getTime() - timezoneOffset);
    return adjustedDate.toISOString().substring(0, 16);
  }

  // Format Date to local YYYY-MM-DD string
  formatLocalDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Check if two dates represent the same calendar day
  isSameDay(d1: Date, d2: Date): boolean {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  }

  // Select Date handler
  selectDate(day: { date: Date; weightRecord: WeightRecord | null }): void {
    this.selectedDate.set(day.date);
    const record = day.weightRecord;
    
    if (record) {
      this.editingRecordId.set(record.id);
      const localDate = new Date(record.recordedAt);
      this.weightForm.setValue({
        weight: parseFloat(record.weight as string).toString(),
        recordedAt: this.formatLocalDateTime(localDate)
      });
    } else {
      this.editingRecordId.set(null);
      const now = new Date();
      const localDate = new Date(day.date.getFullYear(), day.date.getMonth(), day.date.getDate(), now.getHours(), now.getMinutes());
      this.weightForm.setValue({
        weight: '',
        recordedAt: this.formatLocalDateTime(localDate)
      });
    }
  }

  // Navigate Calendar Month
  prevMonth(): void {
    const current = this.currentMonthDate();
    this.currentMonthDate.set(new Date(current.getFullYear(), current.getMonth() - 1, 1));
  }

  nextMonth(): void {
    const current = this.currentMonthDate();
    this.currentMonthDate.set(new Date(current.getFullYear(), current.getMonth() + 1, 1));
  }

  // Computes the grid of days shown in the calendar month view (35 or 42 days grid)
  readonly calendarDays = computed(() => {
    const current = this.currentMonthDate();
    const year = current.getFullYear();
    const month = current.getMonth();

    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay(); // 0 is Sunday, 6 is Saturday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: Array<{
      date: Date;
      dayNum: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      weightRecord: WeightRecord | null;
    }> = [];

    // Map logs by date string
    const logsMap = new Map<string, WeightRecord>();
    this.logs().forEach(log => {
      const logDateStr = this.formatLocalDate(new Date(log.recordedAt));
      logsMap.set(logDateStr, log);
    });

    // Previous month days to pad
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDays - i);
      const dStr = this.formatLocalDate(d);
      days.push({
        date: d,
        dayNum: d.getDate(),
        isCurrentMonth: false,
        isToday: this.isSameDay(d, new Date()),
        weightRecord: logsMap.get(dStr) || null
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const dStr = this.formatLocalDate(d);
      days.push({
        date: d,
        dayNum: i,
        isCurrentMonth: true,
        isToday: this.isSameDay(d, new Date()),
        weightRecord: logsMap.get(dStr) || null
      });
    }

    // Next month days to pad to standard 42 grid cells
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const dStr = this.formatLocalDate(d);
      days.push({
        date: d,
        dayNum: i,
        isCurrentMonth: false,
        isToday: this.isSameDay(d, new Date()),
        weightRecord: logsMap.get(dStr) || null
      });
    }

    return days;
  });

  // Computes KPI Statistics
  readonly stats = computed(() => {
    const records = [...this.logs()];
    if (records.length === 0) {
      return { current: 0, starting: 0, change: 0 };
    }

    // Sort chronologically so first/last are deterministic,
    // even if API order changes or an older record is updated.
    records.sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());

    const starting = parseFloat(records[0].weight as string);
    const current = parseFloat(records[records.length - 1].weight as string);
    const change = current - starting;
    return { current, starting, change };
  });

  // Computes SVG line chart path points dynamically
  readonly chartData = computed(() => {
    const records = [...this.logs()].reverse();
    if (records.length < 2) {
      return null;
    }

    const width = 500;
    const height = 200;
    const padding = 35;

    const weights = records.map(r => parseFloat(r.weight as string));
    const maxW = Math.max(...weights) + 2;
    const minW = Math.max(0, Math.min(...weights) - 2);
    const range = maxW - minW || 1;

    // Map each point to SVG coordinates
    const points = records.map((r, i) => {
      const x = padding + (i * (width - 2 * padding)) / (records.length - 1);
      const wVal = parseFloat(r.weight as string);
      const y = height - padding - ((wVal - minW) * (height - 2 * padding)) / range;
      return { x, y, weight: wVal, date: r.recordedAt };
    });

    // Create SVG line string
    let pathD = '';
    points.forEach((p, idx) => {
      if (idx === 0) {
        pathD += `M ${p.x} ${p.y}`;
      } else {
        pathD += ` L ${p.x} ${p.y}`;
      }
    });

    // Area path for gradient fill
    let areaD = pathD;
    if (points.length > 0) {
      areaD += ` L ${points[points.length - 1].x} ${height - padding}`;
      areaD += ` L ${points[0].x} ${height - padding} Z`;
    }

    return {
      points,
      pathD,
      areaD,
      width,
      height,
      minW,
      maxW,
      padding
    };
  });

  ngOnInit(): void {
    this.fetchHistory();
  }

  fetchHistory(): void {
    this.isLoading.set(true);
    this.weightService.getWeightHistory().subscribe({
      next: (data) => {
        this.logs.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.message || 'Failed to fetch history logs.');
        this.isLoading.set(false);
      }
    });
  }

  onSubmit(): void {
    if (this.weightForm.invalid) {
      this.weightForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const weightVal = parseFloat(this.weightForm.value.weight!);
    const dateVal = new Date(this.weightForm.value.recordedAt!).toISOString();
    const editId = this.editingRecordId();

    if (editId !== null) {
      // Edit mode
      this.weightService.updateWeight(editId, weightVal, dateVal).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.cancelEdit();
          this.fetchHistory();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err?.error?.message || 'Failed to update record.');
        }
      });
    } else {
      // Add mode
      this.weightService.addWeight(weightVal, dateVal).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.weightForm.get('weight')?.reset();
          
          const currentSelected = this.selectedDate() || new Date();
          const now = new Date();
          const localDate = new Date(currentSelected.getFullYear(), currentSelected.getMonth(), currentSelected.getDate(), now.getHours(), now.getMinutes());
          this.weightForm.patchValue({ recordedAt: this.formatLocalDateTime(localDate) });
          
          this.fetchHistory();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err?.error?.message || 'Failed to submit record.');
        }
      });
    }
  }

  startEdit(record: WeightRecord): void {
    const localDate = new Date(record.recordedAt);
    this.selectedDate.set(localDate);
    this.currentMonthDate.set(localDate); // Auto-navigate the calendar to that month!
    this.editingRecordId.set(record.id);

    this.weightForm.setValue({
      weight: parseFloat(record.weight as string).toString(),
      recordedAt: this.formatLocalDateTime(localDate)
    });
  }

  cancelEdit(): void {
    this.editingRecordId.set(null);
    const now = new Date();
    this.selectedDate.set(now);
    this.weightForm.reset({
      weight: '',
      recordedAt: this.formatLocalDateTime(now)
    });
  }

  deleteRecord(id: number): void {
    if (!confirm('Are you sure you want to delete this weight record?')) return;

    this.weightService.deleteWeight(id).subscribe({
      next: () => {
        this.fetchHistory();
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.message || 'Failed to delete record.');
      }
    });
  }
}
