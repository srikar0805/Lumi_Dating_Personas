import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthResponse, User } from '../models/user.model';

const TOKEN_KEY = 'ps-token';
const USER_KEY = 'ps-user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private userSubject = new BehaviorSubject<User | null>(this.readUser());
  user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient) {}

  register(name: string, email: string, password: string, city: string = '', state: string = ''): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register`, { name, email, password, city, state })
      .pipe(tap(res => this.persist(res)));
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(tap(res => this.persist(res)));
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.userSubject.next(null);
  }

  fetchMe(): Observable<User> {
    return this.http.get<User>(`${environment.apiUrl}/auth/me`)
      .pipe(tap(u => this.persistUser(u)));
  }

  updateProfile(patch: { name?: string; city?: string; state?: string; password?: string }): Observable<User> {
    return this.http.put<User>(`${environment.apiUrl}/auth/me`, patch)
      .pipe(tap(u => this.persistUser(u)));
  }

  private persistUser(u: User): void {
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    this.userSubject.next(u);
  }

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  isLoggedIn$: Observable<boolean> = this.user$.pipe(map(u => !!u));

  get isLoggedIn(): boolean {
    // Both a token in storage AND a user in memory must be present.
    // Keeps this getter consistent with isLoggedIn$ (which observes the BehaviorSubject).
    return !!this.token && !!this.userSubject.value;
  }

  private persist(res: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    this.userSubject.next(res.user);
  }

  private readUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  static explainError(err: any, fallback: string): string {
    if (!err) return fallback;
    if (err.status === 0) {
      return "Can't reach the server — is the backend running on http://localhost:5001?";
    }
    const fromBody = err?.error?.error || err?.error?.message;
    if (typeof fromBody === 'string' && fromBody.length) return fromBody;
    if (typeof err.error === 'string' && err.error.length) return err.error;
    if (err.status && err.statusText) return `${fallback} (${err.status} ${err.statusText})`;
    return err?.message || fallback;
  }
}
