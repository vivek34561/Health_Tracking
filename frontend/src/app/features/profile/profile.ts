import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule, DecimalPipe],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class ProfileComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly isChangingPassword = signal(false);
  readonly showPasswordSection = signal(false);
  readonly showDangerZone = signal(false);

  // Profile form model
  readonly profileForm = signal({
    name: '',
    email: '',
    age: null as number | null,
    height: null as number | null,
    weight: null as number | null,
    gender: '',
    activityLevel: ''
  });

  // Password form
  readonly passwordForm = signal({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  readonly bmi = computed(() => {
    const form = this.profileForm();
    if (!form.height || !form.weight) return null;
    const h = form.height / 100;
    return form.weight / (h * h);
  });

  readonly bmiCategory = computed(() => {
    const b = this.bmi();
    if (!b) return null;
    if (b < 18.5) return { label: 'Underweight', color: 'var(--color-info)' };
    if (b < 25)   return { label: 'Normal',      color: 'var(--color-success)' };
    if (b < 30)   return { label: 'Overweight',  color: 'var(--color-warning)' };
    return             { label: 'Obese',          color: 'var(--color-danger)' };
  });

  ngOnInit(): void {
    this.loadProfile();
  }

  private loadProfile(): void {
    this.isLoading.set(true);
    this.authService.getProfile().subscribe({
      next: (profile: any) => {
        this.profileForm.set({
          name:          profile.name          || '',
          email:         profile.email         || '',
          age:           profile.age           || null,
          height:        profile.height        || null,
          weight:        profile.weight        || null,
          gender:        profile.gender        || '',
          activityLevel: profile.activityLevel || ''
        });
        this.isLoading.set(false);
      },
      error: () => {
        // Fall back to cached user data
        const user = this.authService.currentUser();
        if (user) {
          this.profileForm.set({
            name:          user.name          || '',
            email:         user.email         || '',
            age:           user.age           || null,
            height:        user.height        || null,
            weight:        user.weight        || null,
            gender:        user.gender        || '',
            activityLevel: user.activityLevel || ''
          });
        }
        this.isLoading.set(false);
      }
    });
  }

  updateFormField(field: string, value: any): void {
    this.profileForm.update(f => ({ ...f, [field]: value }));
  }

  saveProfile(): void {
    this.isSaving.set(true);
    this.authService.updateProfile(this.profileForm()).subscribe({
      next: () => {
        this.toastService.success('Profile updated successfully!');
        this.isSaving.set(false);
      },
      error: (err: any) => {
        this.toastService.error(err?.error?.message || 'Failed to update profile.');
        this.isSaving.set(false);
      }
    });
  }

  changePassword(): void {
    const form = this.passwordForm();
    if (!form.currentPassword || !form.newPassword) {
      this.toastService.error('Please fill in all password fields.');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      this.toastService.error('New passwords do not match.');
      return;
    }
    if (form.newPassword.length < 6) {
      this.toastService.error('New password must be at least 6 characters.');
      return;
    }
    this.isChangingPassword.set(true);
    this.authService.changePassword(form.currentPassword, form.newPassword).subscribe({
      next: () => {
        this.toastService.success('Password changed successfully!');
        this.passwordForm.set({ currentPassword: '', newPassword: '', confirmPassword: '' });
        this.showPasswordSection.set(false);
        this.isChangingPassword.set(false);
      },
      error: (err: any) => {
        this.toastService.error(err?.error?.message || 'Failed to change password.');
        this.isChangingPassword.set(false);
      }
    });
  }

  getUserInitials(): string {
    const name = this.profileForm().name || this.authService.currentUser()?.name || 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0][0]?.toUpperCase() || 'U';
  }
}
