import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIf } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [NgIf, ReactiveFormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class ProfileComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  readonly currentUser = this.authService.currentUser;
  readonly isEditing = signal(false);
  readonly isSaving = signal(false);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');

  readonly profileForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    age: [''],
    height: [''],
    weight: [''],
    activityLevel: ['']
  });

  constructor() {
    this.loadProfileForm();
  }

  loadProfileForm(): void {
    const user = this.currentUser();
    if (!user) return;

    this.profileForm.setValue({
      name: user.name || '',
      email: user.email || '',
      age: user.age || '',
      height: user.height || '',
      weight: user.weight || '',
      activityLevel: user.activityLevel || ''
    });
  }

  enableEdit(): void {
    this.isEditing.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');
  }

  cancelEdit(): void {
    this.isEditing.set(false);
    this.successMessage.set('');
    this.errorMessage.set('');
    this.loadProfileForm();
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');

    this.authService.updateProfile(this.profileForm.value).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.isEditing.set(false);
        this.successMessage.set('Profile updated successfully.');
      },
      error: (err) => {
        this.isSaving.set(false);
        this.errorMessage.set(err?.error?.message || 'Unable to update profile.');
      }
    });
  }
}
