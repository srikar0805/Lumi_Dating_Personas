import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { IconComponent } from '../../shared/icon.component';
import { ToastService } from '../../shared/toast.service';

function passwordOptionalMatch(control: AbstractControl) {
  const pw = control.get('password')?.value;
  const pw2 = control.get('confirm')?.value;
  if (!pw && !pw2) return null;
  return pw === pw2 ? null : { mismatch: true };
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  template: `
    <div class="page" style="max-width: 720px">
      <div style="margin-bottom: 24px">
        <h1>Edit profile</h1>
        <div class="sub">Keep your name and city up to date — your location is used to rank people near you on Connect.</div>
      </div>

      <form class="card" [formGroup]="form" (ngSubmit)="save()" style="padding: 28px">
        <h3 style="margin: 0 0 4px; font-family:'Fraunces', serif; font-weight: 500; font-size: 20px; letter-spacing: -0.01em">
          Account
        </h3>
        <div class="muted" style="font-size: 12.5px; margin-bottom: 18px">
          Email is fixed at sign-up and can't be changed here.
        </div>

        <div class="field">
          <label>Name</label>
          <input formControlName="name" placeholder="Your name"/>
        </div>
        <div class="field">
          <label>Email</label>
          <input [value]="email" disabled style="opacity: 0.7; cursor: not-allowed"/>
        </div>

        <h3 style="margin: 22px 0 4px; font-family:'Fraunces', serif; font-weight: 500; font-size: 20px; letter-spacing: -0.01em">
          Location
        </h3>
        <div class="muted" style="font-size: 12.5px; margin-bottom: 18px">
          Used only to rank people near you. Cards on Connect surface same-city, then same-state, then everyone else.
        </div>
        <div style="display:grid; grid-template-columns: 1.6fr 1fr; gap:10px">
          <div class="field" style="margin-bottom: 0">
            <label>City</label>
            <input formControlName="city" placeholder="Boston"/>
          </div>
          <div class="field" style="margin-bottom: 0">
            <label>State</label>
            <input formControlName="state" placeholder="MA"/>
          </div>
        </div>

        <h3 style="margin: 22px 0 4px; font-family:'Fraunces', serif; font-weight: 500; font-size: 20px; letter-spacing: -0.01em">
          Change password
        </h3>
        <div class="muted" style="font-size: 12.5px; margin-bottom: 18px">
          Optional — leave blank to keep your current password.
        </div>
        <div class="field">
          <label>New password</label>
          <input type="password" formControlName="password" placeholder="At least 6 characters"/>
        </div>
        <div class="field">
          <label>Confirm new password</label>
          <input type="password" formControlName="confirm" placeholder="Repeat it"/>
          <span *ngIf="form.errors?.['mismatch'] && form.get('confirm')?.touched" class="hint" style="color: var(--danger)">
            Passwords don't match.
          </span>
        </div>

        <div *ngIf="error" role="alert"
             style="margin-top: 6px; padding: 11px 14px; border-radius: 12px; background: color-mix(in oklab, var(--danger) 10%, transparent); border: 1px solid color-mix(in oklab, var(--danger) 30%, transparent); color: var(--danger); font-size: 13px; line-height: 1.4">
          {{ error }}
        </div>

        <div class="row" style="gap: 10px; margin-top: 22px; align-items: center">
          <button type="button" class="btn btn-ghost" (click)="cancel()">
            <app-icon name="arrL"></app-icon> Back
          </button>
          <div class="spacer"></div>
          <button type="submit" class="btn btn-primary" [disabled]="form.invalid || loading">
            <ng-container *ngIf="loading; else ready">Saving…</ng-container>
            <ng-template #ready><app-icon name="save"></app-icon> Save changes</ng-template>
          </button>
        </div>
      </form>
    </div>
  `,
})
export class ProfileComponent implements OnInit {
  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    city: [''],
    state: [''],
    password: [''],
    confirm: [''],
  }, { validators: passwordOptionalMatch });

  email = '';
  loading = false;
  error = '';

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    // Pull fresh state from server in case localStorage is stale
    this.auth.fetchMe().subscribe({
      next: u => {
        this.email = u.email;
        this.form.patchValue({
          name: u.name || '',
          city: u.city || '',
          state: u.state || '',
        });
      },
      error: err => {
        this.error = AuthService.explainError(err, 'Could not load your profile');
      },
    });
  }

  save(): void {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    const patch: { name: string; city: string; state: string; password?: string } = {
      name: raw.name,
      city: raw.city,
      state: (raw.state || '').toUpperCase(),
    };
    if (raw.password) patch.password = raw.password;

    this.loading = true;
    this.error = '';
    this.auth.updateProfile(patch).subscribe({
      next: () => {
        this.loading = false;
        this.toast.push('Profile updated', 'success');
        this.form.patchValue({ password: '', confirm: '' });
      },
      error: err => {
        this.loading = false;
        this.error = AuthService.explainError(err, 'Could not save changes');
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/dashboard']);
  }
}
