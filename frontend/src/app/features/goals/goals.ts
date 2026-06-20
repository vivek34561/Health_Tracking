import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { GoalService, GoalRecord } from '../../core/services/goal.service';

@Component({
  selector: 'app-goals',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, DecimalPipe],
  templateUrl: './goals.html',
  styleUrl: './goals.css'
})
export class GoalsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly goalService = inject(GoalService);

  readonly Math = Math;

  readonly logs = signal<GoalRecord[]>([]); // Note: standard naming check
  readonly goals = signal<GoalRecord[]>([]);
  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  // Form for creating goals
  readonly goalForm = this.fb.group({
    goalType: ['Water', [Validators.required]],
    targetValue: ['', [Validators.required, Validators.min(0.01)]],
    currentValue: ['0', [Validators.min(0)]],
    startDate: [new Date().toISOString().substring(0, 10), [Validators.required]],
    endDate: [new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10), [Validators.required]],
    status: ['ACTIVE', [Validators.required]]
  });

  // Track if we are editing a record
  readonly editingRecordId = signal<number | null>(null);

  // Aggregated goals statistics
  readonly stats = computed(() => {
    const records = this.goals();
    const active = records.filter(r => r.status === 'ACTIVE').length;
    const completed = records.filter(r => r.status === 'COMPLETED').length;
    const failed = records.filter(r => r.status === 'FAILED').length;

    return {
      active,
      completed,
      failed,
      total: records.length
    };
  });

  ngOnInit(): void {
    this.fetchGoals();
  }

  fetchGoals(): void {
    this.isLoading.set(true);
    this.goalService.getGoals().subscribe({
      next: (data) => {
        this.goals.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.message || 'Failed to fetch goals.');
        this.isLoading.set(false);
      }
    });
  }

  onSubmit(): void {
    if (this.goalForm.invalid) {
      this.goalForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const formVal = this.goalForm.value;
    const payload = {
      goal_type: formVal.goalType!,
      target_value: parseFloat(formVal.targetValue!),
      current_value: parseFloat(formVal.currentValue || '0'),
      start_date: formVal.startDate!,
      end_date: formVal.endDate!,
      status: formVal.status!
    };

    if (new Date(payload.end_date) < new Date(payload.start_date)) {
      this.errorMessage.set('End Date must be greater than or equal to Start Date.');
      this.isSubmitting.set(false);
      return;
    }

    const editId = this.editingRecordId();

    if (editId !== null) {
      // Edit mode
      this.goalService.updateGoal(editId, payload).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.cancelEdit();
          this.fetchGoals();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err?.error?.message || 'Failed to update goal.');
        }
      });
    } else {
      // Add mode
      this.goalService.addGoal(payload).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.goalForm.reset({
            goalType: 'Water',
            targetValue: '',
            currentValue: '0',
            startDate: new Date().toISOString().substring(0, 10),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
            status: 'ACTIVE'
          });
          this.fetchGoals();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err?.error?.message || 'Failed to create goal.');
        }
      });
    }
  }

  // Easy action to increment progress on goals
  incrementProgress(record: GoalRecord, amount: number): void {
    const nextVal = record.current_value + amount;
    const isCompleted = nextVal >= record.target_value;
    const status = isCompleted ? 'COMPLETED' : record.status;

    this.goalService.updateGoal(record.id, {
      current_value: nextVal,
      status
    }).subscribe({
      next: () => {
        this.fetchGoals();
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.message || 'Failed to update progress.');
      }
    });
  }

  // Complete goal manually
  completeGoal(id: number): void {
    this.goalService.updateGoal(id, { status: 'COMPLETED' }).subscribe({
      next: () => {
        this.fetchGoals();
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.message || 'Failed to update status.');
      }
    });
  }

  startEdit(record: GoalRecord): void {
    this.editingRecordId.set(record.id);

    const formattedStart = new Date(record.start_date).toISOString().substring(0, 10);
    const formattedEnd = new Date(record.end_date).toISOString().substring(0, 10);

    this.goalForm.setValue({
      goalType: record.goal_type,
      targetValue: record.target_value.toString(),
      currentValue: record.current_value.toString(),
      startDate: formattedStart,
      endDate: formattedEnd,
      status: record.status
    });
  }

  cancelEdit(): void {
    this.editingRecordId.set(null);
    this.goalForm.reset({
      goalType: 'Water',
      targetValue: '',
      currentValue: '0',
      startDate: new Date().toISOString().substring(0, 10),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
      status: 'ACTIVE'
    });
  }

  deleteRecord(id: number): void {
    if (!confirm('Are you sure you want to delete this goal?')) return;

    this.goalService.deleteGoal(id).subscribe({
      next: () => {
        this.fetchGoals();
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.message || 'Failed to delete goal.');
      }
    });
  }
}
