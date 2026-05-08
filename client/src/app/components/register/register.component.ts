import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { IconComponent } from '../../shared/icon.component';
import { AuthBackdropComponent } from '../../shared/auth-backdrop.component';
import { PersonaOrbComponent } from '../../shared/persona-orb.component';
import { ToastService } from '../../shared/toast.service';

function matchPassword(control: AbstractControl) {
  const pw = control.get('password')?.value;
  const pw2 = control.get('confirm')?.value;
  return pw && pw === pw2 ? null : { mismatch: true };
}

interface Vibe { id: string; label: string; hue: number; }

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, IconComponent, AuthBackdropComponent, PersonaOrbComponent],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  step = 0;
  loading = false;
  error = '';

  vibes: Vibe[] = [
    { id: 'wanderer', label: 'Wanderer', hue: 265 },
    { id: 'creator',  label: 'Creator',  hue: 320 },
    { id: 'architect',label: 'Architect',hue: 200 },
    { id: 'seeker',   label: 'Seeker',   hue: 230 },
  ];

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    city: [''],
    state: [''],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirm: ['', Validators.required],
    vibe: ['wanderer'],
  }, { validators: matchPassword });

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private toast: ToastService,
  ) {}

  next(): void { if (this.step < 2) this.step++; }
  prev(): void { if (this.step > 0) this.step--; }

  get passwordStrength(): { level: number; label: string; color: string } {
    const pw: string = this.form.get('password')?.value || '';
    if (!pw) return { level: 0, label: '', color: '' };
    if (pw.length < 6)  return { level: 1, label: 'Too short', color: 'var(--danger)' };
    if (pw.length < 8)  return { level: 2, label: 'Weak',      color: 'var(--warning)' };
    if (pw.length < 12) return { level: 3, label: 'Good',      color: 'var(--accent-2)' };
    return                     { level: 4, label: 'Strong',    color: 'var(--success)' };
  }

  stepValid(): boolean {
    if (this.step === 0) return !!this.form.get('name')?.valid && !!this.form.get('email')?.valid;
    if (this.step === 1) return !!this.form.get('password')?.valid && !!this.form.get('confirm')?.valid && !this.form.errors?.['mismatch'];
    return true;
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    const { name, email, password, city, state } = this.form.getRawValue();
    this.auth.register(name, email, password, city, state).subscribe({
      next: () => {
        this.loading = false;
        this.toast.push('Account created — welcome!', 'success');
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.error = AuthService.explainError(err, 'Registration failed');
        this.loading = false;
      },
    });
  }
}
