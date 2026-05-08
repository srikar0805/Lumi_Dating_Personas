import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { IconComponent } from '../../shared/icon.component';
import { AuthBackdropComponent } from '../../shared/auth-backdrop.component';
import { ToastService } from '../../shared/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, IconComponent, AuthBackdropComponent],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  loading = false;
  error = '';
  showForgot = false;

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private toast: ToastService,
  ) {}

  submit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: (res) => {
        this.loading = false;
        this.toast.push(`Welcome back, ${res.user.name.split(' ')[0]}`, 'success');
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.error = AuthService.explainError(err, 'Login failed');
        this.loading = false;
      },
    });
  }
}
