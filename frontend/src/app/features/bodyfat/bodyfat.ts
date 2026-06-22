import { Component, OnInit, signal, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { TitleCasePipe } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { BodyFatService, BodyFatResponse } from '../../core/services/bodyfat.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-bodyfat',
  standalone: true,
  imports: [ReactiveFormsModule, TitleCasePipe],
  templateUrl: './bodyfat.html',
  styleUrl: './bodyfat.css'
})
export class BodyFatComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly bodyFatService = inject(BodyFatService);
  private readonly toastService = inject(ToastService);

  readonly isLoading = signal(false);
  readonly result = signal<BodyFatResponse | null>(null);
  readonly currentUnitSystem = signal<'metric' | 'imperial'>('metric');

  // Reactively define the form group
  readonly form = this.fb.group({
    density: [1.05, [Validators.required, Validators.min(0.9), Validators.max(1.2)]],
    age: [30, [Validators.required, Validators.min(2), Validators.max(120)]],
    weight: [70, [Validators.required, Validators.min(1), Validators.max(1000)]],
    height: [175, [Validators.required, Validators.min(10), Validators.max(300)]],
    neck: [38.0, [Validators.required, Validators.min(10), Validators.max(100)]],
    chest: [100.0, [Validators.required, Validators.min(30), Validators.max(250)]],
    abdomen: [90.0, [Validators.required, Validators.min(30), Validators.max(250)]],
    hip: [95.0, [Validators.required, Validators.min(30), Validators.max(250)]],
    thigh: [60.0, [Validators.required, Validators.min(10), Validators.max(150)]],
    knee: [38.0, [Validators.required, Validators.min(10), Validators.max(100)]],
    ankle: [23.0, [Validators.required, Validators.min(5), Validators.max(50)]],
    biceps: [33.0, [Validators.required, Validators.min(10), Validators.max(100)]],
    forearm: [28.0, [Validators.required, Validators.min(10), Validators.max(100)]],
    wrist: [18.0, [Validators.required, Validators.min(5), Validators.max(50)]],
    gender: ['male', [Validators.required]],
  });

  ngOnInit(): void {
    this.prefillFromProfile();
  }

  prefillFromProfile(): void {
    const user = this.authService.currentUser();
    if (user) {
      const updateData: any = {};
      if (user.age) updateData.age = user.age;
      if (user.height) updateData.height = user.height;
      if (user.weight) updateData.weight = user.weight;
      if (user.gender) {
        const genderL = user.gender.toLowerCase();
        if (genderL === 'male' || genderL === 'female') {
          updateData.gender = genderL;
        }
      }
      this.form.patchValue(updateData);
      
      // If we prefilled, show a toast
      if (user.age || user.height || user.weight) {
        this.toastService.info(
          'Profile Data Pre-filled',
          'We loaded your age, height, and weight from your profile settings.'
        );
      }
    }
  }

  toggleUnitSystem(system: 'metric' | 'imperial'): void {
    if (this.currentUnitSystem() === system) return;

    const weightCtrl = this.form.get('weight');
    const heightCtrl = this.form.get('height');

    const weightVal = weightCtrl?.value ? parseFloat(weightCtrl.value.toString()) : 0;
    const heightVal = heightCtrl?.value ? parseFloat(heightCtrl.value.toString()) : 0;

    if (system === 'imperial') {
      // Metric -> Imperial
      if (weightVal) weightCtrl?.setValue(parseFloat((weightVal * 2.20462).toFixed(1)));
      if (heightVal) heightCtrl?.setValue(parseFloat((heightVal / 2.54).toFixed(1)));
    } else {
      // Imperial -> Metric
      if (weightVal) weightCtrl?.setValue(parseFloat((weightVal / 2.20462).toFixed(1)));
      if (heightVal) heightCtrl?.setValue(parseFloat((heightVal * 2.54).toFixed(1)));
    }

    this.currentUnitSystem.set(system);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastService.warning('Validation Error', 'Please check that all measurements are within sensible ranges.');
      return;
    }

    this.isLoading.set(true);
    this.result.set(null);

    const formValues = this.form.value;
    const payload = {
      density: parseFloat(formValues.density!.toString()),
      age: parseInt(formValues.age!.toString(), 10),
      weight: parseFloat(formValues.weight!.toString()),
      height: parseFloat(formValues.height!.toString()),
      neck: parseFloat(formValues.neck!.toString()),
      chest: parseFloat(formValues.chest!.toString()),
      abdomen: parseFloat(formValues.abdomen!.toString()),
      hip: parseFloat(formValues.hip!.toString()),
      thigh: parseFloat(formValues.thigh!.toString()),
      knee: parseFloat(formValues.knee!.toString()),
      ankle: parseFloat(formValues.ankle!.toString()),
      biceps: parseFloat(formValues.biceps!.toString()),
      forearm: parseFloat(formValues.forearm!.toString()),
      wrist: parseFloat(formValues.wrist!.toString()),
      gender: formValues.gender!,
      unit_system: this.currentUnitSystem()
    };

    this.bodyFatService.predictBodyFat(payload).subscribe({
      next: (res) => {
        this.result.set(res);
        this.isLoading.set(false);
        this.toastService.success('Body Fat Predicted!', `Your body fat is estimated at ${res.predicted_bodyfat}%.`);
      },
      error: (err) => {
        this.isLoading.set(false);
        const errMsg = err?.error?.message || err?.message || 'Failed to predict body fat percentage.';
        this.toastService.error('Prediction Failed', errMsg);
      }
    });
  }

  resetForm(): void {
    this.result.set(null);
    this.form.reset({
      density: 1.05,
      age: 30,
      weight: 70,
      height: 175,
      neck: 38.0,
      chest: 100.0,
      abdomen: 90.0,
      hip: 95.0,
      thigh: 60.0,
      knee: 38.0,
      ankle: 23.0,
      biceps: 33.0,
      forearm: 28.0,
      wrist: 18.0,
      gender: 'male',
    });
    this.currentUnitSystem.set('metric');
    this.prefillFromProfile();
  }

  // Get gauge rotation degree based on body fat percentage
  // 0% -> -90 deg, 50% -> 90 deg
  getGaugeRotation(): string {
    const val = this.result()?.predicted_bodyfat || 0;
    const bounded = Math.min(50, Math.max(0, val));
    const deg = -90 + (bounded / 50) * 180;
    return `rotate(${deg}deg)`;
  }

  getCategoryColor(): string {
    const cat = this.result()?.category || '';
    switch (cat) {
      case 'Athletes':
      case 'Fitness':
        return '#2ecc71'; // Green
      case 'Acceptable / Average':
        return '#f1c40f'; // Yellow
      case 'Essential Fat':
        return '#3498db'; // Blue
      case 'Dangerously Low':
      case 'Obese':
        return '#e74c3c'; // Red
      default:
        return '#9b59b6'; // Purple
    }
  }
}
