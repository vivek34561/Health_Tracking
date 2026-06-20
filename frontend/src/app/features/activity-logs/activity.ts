import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ActivityService, ActivityRecord } from '../../core/services/activity.service';

@Component({
  selector: 'app-activity',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, DecimalPipe],
  templateUrl: './activity.html',
  styleUrl: './activity.css'
})
export class ActivityComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly activityService = inject(ActivityService);

  readonly logs = signal<ActivityRecord[]>([]);
  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  // Form for custom activity logs
  readonly activityForm = this.fb.group({
    activityType: ['Walking', [Validators.required]],
    duration: ['', [Validators.required, Validators.min(1), Validators.max(1440)]],
    caloriesBurned: ['', [Validators.min(0)]],
    distanceKm: ['', [Validators.min(0)]],
    activityDate: [new Date().toISOString().substring(0, 10), [Validators.required]]
  });

  // Track if we are editing a record
  readonly editingRecordId = signal<number | null>(null);

  // Calculate statistics (Total workouts, total duration, total calories)
  readonly stats = computed(() => {
    const records = this.logs();
    
    const count = records.length;
    const totalDuration = records.reduce((sum, r) => sum + Number(r.duration), 0);
    const totalCalories = records.reduce((sum, r) => sum + Number(r.calories_burned || 0), 0);

    return {
      count,
      totalDuration,
      totalCalories
    };
  });

  ngOnInit(): void {
    this.fetchHistory();
  }

  fetchHistory(): void {
    this.isLoading.set(true);
    this.activityService.getActivityHistory().subscribe({
      next: (data) => {
        this.logs.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.message || 'Failed to fetch activity logs.');
        this.isLoading.set(false);
      }
    });
  }

  onSubmit(): void {
    if (this.activityForm.invalid) {
      this.activityForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const formVal = this.activityForm.value;
    const payload = {
      activity_type: formVal.activityType!,
      duration: parseInt(formVal.duration!, 10),
      calories_burned: formVal.caloriesBurned ? parseInt(formVal.caloriesBurned, 10) : 0,
      distance_km: formVal.distanceKm ? parseFloat(formVal.distanceKm) : 0.0,
      activity_date: formVal.activityDate!
    };
    
    const editId = this.editingRecordId();

    if (editId !== null) {
      // Edit mode
      this.activityService.updateActivity(editId, payload).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.cancelEdit();
          this.fetchHistory();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err?.error?.message || 'Failed to update activity record.');
        }
      });
    } else {
      // Add mode
      this.activityService.addActivity(payload).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.activityForm.reset({
            activityType: 'Walking',
            duration: '',
            caloriesBurned: '',
            distanceKm: '',
            activityDate: new Date().toISOString().substring(0, 10)
          });
          this.fetchHistory();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err?.error?.message || 'Failed to submit activity record.');
        }
      });
    }
  }

  startEdit(record: ActivityRecord): void {
    this.editingRecordId.set(record.id);

    // Format Date object to Local YYYY-MM-DD
    const formattedDate = new Date(record.activity_date).toISOString().substring(0, 10);

    this.activityForm.setValue({
      activityType: record.activity_type,
      duration: record.duration.toString(),
      caloriesBurned: record.calories_burned ? record.calories_burned.toString() : '',
      distanceKm: record.distance_km ? record.distance_km.toString() : '',
      activityDate: formattedDate
    });
  }

  cancelEdit(): void {
    this.editingRecordId.set(null);
    this.activityForm.reset({
      activityType: 'Walking',
      duration: '',
      caloriesBurned: '',
      distanceKm: '',
      activityDate: new Date().toISOString().substring(0, 10)
    });
  }

  deleteRecord(id: number): void {
    if (!confirm('Are you sure you want to delete this activity record?')) return;

    this.activityService.deleteActivity(id).subscribe({
      next: () => {
        this.fetchHistory();
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.message || 'Failed to delete record.');
      }
    });
  }
}
