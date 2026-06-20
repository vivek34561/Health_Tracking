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

  // Form for adding/editing records
  readonly weightForm = this.fb.group({
    weight: ['', [Validators.required, Validators.min(0.1), Validators.max(500)]],
    recordedAt: [new Date().toISOString().substring(0, 16), [Validators.required]]
  });

  // Track if we are editing a record
  readonly editingRecordId = signal<number | null>(null);

  // Computes KPI Statistics
  readonly stats = computed(() => {
    const records = this.logs();
    if (records.length === 0) {
      return { current: 0, starting: 0, change: 0 };
    }
    // API returns sorted descending (latest first)
    const current = parseFloat(records[0].weight as string);
    const starting = parseFloat(records[records.length - 1].weight as string);
    const change = current - starting;
    return { current, starting, change };
  });

  // Computes SVG line chart path points dynamically
  readonly chartData = computed(() => {
    const records = [...this.logs()].reverse(); // chronological order for plotting left-to-right
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
          this.weightForm.patchValue({ recordedAt: new Date().toISOString().substring(0, 16) });
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
    this.editingRecordId.set(record.id);
    
    // Parse ISO date string to Local datetime-local string (YYYY-MM-DDTHH:MM)
    const localDate = new Date(record.recordedAt);
    const timezoneOffset = localDate.getTimezoneOffset() * 60000; // in milliseconds
    const adjustedDate = new Date(localDate.getTime() - timezoneOffset);
    const formattedDate = adjustedDate.toISOString().substring(0, 16);

    this.weightForm.setValue({
      weight: parseFloat(record.weight as string).toString(),
      recordedAt: formattedDate
    });
  }

  cancelEdit(): void {
    this.editingRecordId.set(null);
    this.weightForm.reset({
      weight: '',
      recordedAt: new Date().toISOString().substring(0, 16)
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
