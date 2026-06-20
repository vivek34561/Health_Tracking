import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { SleepService, SleepRecord } from '../../core/services/sleep.service';

@Component({
  selector: 'app-sleep',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, DecimalPipe],
  templateUrl: './sleep.html',
  styleUrl: './sleep.css'
})
export class SleepComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly sleepService = inject(SleepService);

  readonly logs = signal<SleepRecord[]>([]);
  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  // Form for custom sleep logs
  readonly sleepForm = this.fb.group({
    sleepStart: ['', [Validators.required]],
    sleepEnd: ['', [Validators.required]],
    qualityScore: [7, [Validators.required, Validators.min(1), Validators.max(10)]]
  });

  // Track if we are editing a record
  readonly editingRecordId = signal<number | null>(null);

  // Calculate statistics (Avg sleep duration, last sleep, avg quality)
  readonly stats = computed(() => {
    const records = this.logs();
    if (records.length === 0) {
      return { avgDuration: 0, lastSleep: 0, avgQuality: 0 };
    }

    // Records are ordered by sleep_start DESC, so the first is the latest
    const lastSleep = parseFloat(records[0].totalHours as string) || 0;
    
    const sumDuration = records.reduce((sum, r) => sum + parseFloat(r.totalHours as string), 0);
    const avgDuration = parseFloat((sumDuration / records.length).toFixed(1));

    const ratedRecords = records.filter(r => r.qualityScore !== null);
    const sumQuality = ratedRecords.reduce((sum, r) => sum + Number(r.qualityScore), 0);
    const avgQuality = ratedRecords.length > 0 ? parseFloat((sumQuality / ratedRecords.length).toFixed(1)) : 0;

    return {
      avgDuration,
      lastSleep,
      avgQuality
    };
  });

  ngOnInit(): void {
    this.fetchHistory();
  }

  fetchHistory(): void {
    this.isLoading.set(true);
    this.sleepService.getSleepHistory().subscribe({
      next: (data) => {
        this.logs.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.message || 'Failed to fetch sleep history logs.');
        this.isLoading.set(false);
      }
    });
  }

  onSubmit(): void {
    if (this.sleepForm.invalid) {
      this.sleepForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const startVal = new Date(this.sleepForm.value.sleepStart!).toISOString();
    const endVal = new Date(this.sleepForm.value.sleepEnd!).toISOString();
    const qualityVal = Number(this.sleepForm.value.qualityScore!);
    const editId = this.editingRecordId();

    if (new Date(endVal) <= new Date(startVal)) {
      this.errorMessage.set('Sleep End time must be after Sleep Start time.');
      this.isSubmitting.set(false);
      return;
    }

    if (editId !== null) {
      // Edit mode
      this.sleepService.updateSleep(editId, startVal, endVal, qualityVal).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.cancelEdit();
          this.fetchHistory();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err?.error?.message || 'Failed to update sleep record.');
        }
      });
    } else {
      // Add mode
      this.sleepService.addSleep(startVal, endVal, qualityVal).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.sleepForm.reset({
            sleepStart: '',
            sleepEnd: '',
            qualityScore: 7
          });
          this.fetchHistory();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err?.error?.message || 'Failed to submit sleep record.');
        }
      });
    }
  }

  startEdit(record: SleepRecord): void {
    this.editingRecordId.set(record.id);

    // Parse ISO date strings to Local datetime-local strings (YYYY-MM-DDTHH:MM)
    const localStart = new Date(record.sleepStart);
    const timezoneOffsetStart = localStart.getTimezoneOffset() * 60000;
    const adjustedStart = new Date(localStart.getTime() - timezoneOffsetStart);
    const formattedStart = adjustedStart.toISOString().substring(0, 16);

    const localEnd = new Date(record.sleepEnd);
    const timezoneOffsetEnd = localEnd.getTimezoneOffset() * 60000;
    const adjustedEnd = new Date(localEnd.getTime() - timezoneOffsetEnd);
    const formattedEnd = adjustedEnd.toISOString().substring(0, 16);

    this.sleepForm.setValue({
      sleepStart: formattedStart,
      sleepEnd: formattedEnd,
      qualityScore: record.qualityScore || 7
    });
  }

  cancelEdit(): void {
    this.editingRecordId.set(null);
    this.sleepForm.reset({
      sleepStart: '',
      sleepEnd: '',
      qualityScore: 7
    });
  }

  deleteRecord(id: number): void {
    if (!confirm('Are you sure you want to delete this sleep record?')) return;

    this.sleepService.deleteSleep(id).subscribe({
      next: () => {
        this.fetchHistory();
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.message || 'Failed to delete record.');
      }
    });
  }
}
