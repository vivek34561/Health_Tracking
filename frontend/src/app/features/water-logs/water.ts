import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { WaterService, WaterRecord } from '../../core/services/water.service';

@Component({
  selector: 'app-water',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './water.html',
  styleUrl: './water.css'
})
export class WaterComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly waterService = inject(WaterService);

  readonly logs = signal<WaterRecord[]>([]);
  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  // Form for custom amount entry
  readonly waterForm = this.fb.group({
    amount: ['', [Validators.required, Validators.min(10), Validators.max(5000)]],
    consumedAt: [new Date().toISOString().substring(0, 16), [Validators.required]]
  });

  // Calculate statistics (Today's intake vs a standard goal of 2000 ml)
  readonly targetMl = signal<number>(2000);

  readonly stats = computed(() => {
    const records = this.logs();
    const target = this.targetMl();
    
    // Calculate total consumed today (localtime)
    const today = new Date().toDateString();
    const todayTotal = records
      .filter(r => new Date(r.consumedAt).toDateString() === today)
      .reduce((sum, r) => sum + Number(r.amountMl), 0);

    // Overall total log count
    const totalCount = records.length;
    const progressPercent = Math.min(100, Math.round((todayTotal / target) * 100));

    return {
      todayTotal,
      target,
      progressPercent,
      totalCount
    };
  });

  ngOnInit(): void {
    this.fetchHistory();
  }

  fetchHistory(): void {
    this.isLoading.set(true);
    this.waterService.getWaterHistory().subscribe({
      next: (data) => {
        this.logs.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.message || 'Failed to fetch water history logs.');
        this.isLoading.set(false);
      }
    });
  }

  // Quick add water helper
  quickAdd(amount: number): void {
    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const nowIso = new Date().toISOString();
    this.waterService.addWater(amount, nowIso).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.fetchHistory();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err?.error?.message || 'Failed to add quick record.');
      }
    });
  }

  onSubmit(): void {
    if (this.waterForm.invalid) {
      this.waterForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const amountVal = parseInt(this.waterForm.value.amount!, 10);
    const dateVal = new Date(this.waterForm.value.consumedAt!).toISOString();

    this.waterService.addWater(amountVal, dateVal).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.waterForm.get('amount')?.reset();
        this.waterForm.patchValue({ consumedAt: new Date().toISOString().substring(0, 16) });
        this.fetchHistory();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err?.error?.message || 'Failed to log water intake.');
      }
    });
  }

  deleteRecord(id: number): void {
    if (!confirm('Are you sure you want to delete this water log?')) return;

    this.waterService.deleteWater(id).subscribe({
      next: () => {
        this.fetchHistory();
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.message || 'Failed to delete record.');
      }
    });
  }
}
