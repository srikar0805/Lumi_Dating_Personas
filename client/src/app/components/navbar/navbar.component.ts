import { Component, OnInit, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { IconComponent } from '../../shared/icon.component';
import { ThemeService } from '../../shared/theme.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, IconComponent],
  template: `
    <div class="navbar">
      <div class="nav-inner">
        <div class="logo" [routerLink]="'/dashboard'" style="cursor:pointer">
          <div class="logo-mark"></div>
          <div>
            Lumi
            <small>where your selves meet</small>
          </div>
        </div>
        <div class="nav-links">
          <a routerLink="/dashboard" routerLinkActive="active"><app-icon name="home"></app-icon> Home</a>
          <a routerLink="/personas" routerLinkActive="active"><app-icon name="user"></app-icon> My selves</a>
          <a routerLink="/connect" routerLinkActive="active"><app-icon name="spark"></app-icon> Connect</a>
          <a routerLink="/matches" routerLinkActive="active"><app-icon name="heart"></app-icon> Connections</a>
          <a routerLink="/graph" routerLinkActive="active"><app-icon name="graph"></app-icon> Network</a>
          <a routerLink="/drift" routerLinkActive="active"><app-icon name="clock"></app-icon> History</a>
        </div>
        <div class="nav-right">
          <button class="icon-btn" title="Toggle theme" (click)="theme.toggleTheme()">
            <app-icon [name]="(theme.state$ | async)?.theme === 'dark' ? 'sun' : 'moon'"></app-icon>
          </button>
          <div class="profile-wrap">
            <button class="avatar-chip" type="button" (click)="toggleMenu($event)" [class.open]="menuOpen">
              <div class="avatar">{{ initial }}</div>
              <div class="chip-text">
                <div class="chip-name">{{ name }}</div>
                <small class="chip-sub">{{ locationLabel || 'Signed in' }}</small>
              </div>
              <app-icon name="arrR" class="chip-caret"></app-icon>
            </button>

            <div class="profile-menu" *ngIf="menuOpen">
              <div class="pm-head">
                <div class="avatar lg">{{ initial }}</div>
                <div>
                  <div class="pm-name">{{ name }}</div>
                  <div class="pm-email">{{ email }}</div>
                  <div class="pm-loc" *ngIf="locationLabel">📍 {{ locationLabel }}</div>
                </div>
              </div>

              <div class="pm-section">
                <button class="pm-item" (click)="go('/profile')">
                  <app-icon name="edit"></app-icon>
                  <div>
                    <div>Edit profile</div>
                    <small>Name, city, password</small>
                  </div>
                </button>
                <button class="pm-item" (click)="go('/personas')">
                  <app-icon name="user"></app-icon>
                  <div>
                    <div>My selves</div>
                    <small>Manage your personas</small>
                  </div>
                </button>
                <button class="pm-item" (click)="go('/matches')">
                  <app-icon name="heart"></app-icon>
                  <div>
                    <div>Connections</div>
                    <small>People who clicked with you</small>
                  </div>
                </button>
                <button class="pm-item" (click)="go('/drift')">
                  <app-icon name="clock"></app-icon>
                  <div>
                    <div>History</div>
                    <small>How your selves have changed</small>
                  </div>
                </button>
              </div>

              <div class="pm-divider"></div>

              <div class="pm-section">
                <button class="pm-item" (click)="theme.toggleTheme()">
                  <app-icon [name]="(theme.state$ | async)?.theme === 'dark' ? 'sun' : 'moon'"></app-icon>
                  <div>
                    <div>{{ (theme.state$ | async)?.theme === 'dark' ? 'Light mode' : 'Dark mode' }}</div>
                    <small>Switch the theme</small>
                  </div>
                </button>
              </div>

              <div class="pm-divider"></div>

              <button class="pm-item danger" (click)="logout()">
                <app-icon name="x"></app-icon>
                <div>
                  <div>Sign out</div>
                  <small>You can come back any time</small>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .profile-wrap { position: relative; }
    .avatar-chip { cursor: pointer; transition: border-color .15s, background .15s; }
    .avatar-chip:hover, .avatar-chip.open { border-color: var(--border-strong); background: var(--card-2); }
    .avatar-chip .chip-text { display: flex; flex-direction: column; align-items: flex-start; }
    .avatar-chip .chip-name { font-size: 12.5px; font-weight: 600; color: var(--text); }
    .avatar-chip .chip-sub { font-size: 10.5px; color: var(--text-dim); }
    .avatar-chip .chip-caret { color: var(--text-faint); transform: rotate(90deg); transition: transform .2s; margin-left: 4px; }
    .avatar-chip.open .chip-caret { transform: rotate(-90deg); }
    .avatar.lg { width: 44px; height: 44px; font-size: 17px; }

    .profile-menu {
      position: absolute; top: calc(100% + 10px); right: 0; z-index: 80;
      width: 300px;
      background: var(--card);
      border: 1px solid var(--border-strong);
      border-radius: var(--r-lg);
      box-shadow: var(--shadow-lg);
      padding: 14px;
      animation: pm-in .18s cubic-bezier(.2,.8,.2,1);
    }
    @keyframes pm-in {
      from { opacity: 0; transform: translateY(-6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .pm-head {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 8px 14px; border-bottom: 1px solid var(--border);
      margin-bottom: 8px;
    }
    .pm-name { font-family: 'Fraunces', serif; font-weight: 500; font-size: 17px; letter-spacing: -0.01em; }
    .pm-email { font-size: 11.5px; color: var(--text-dim); margin-top: 1px; }
    .pm-loc { font-size: 11.5px; color: var(--text-dim); margin-top: 4px; }
    .pm-section { display: flex; flex-direction: column; }
    .pm-divider { height: 1px; background: var(--border); margin: 8px 0; }

    .pm-item {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 10px; border-radius: 10px;
      text-align: left; width: 100%; cursor: pointer;
      transition: background .15s; color: var(--text);
    }
    .pm-item:hover { background: var(--card-2); }
    .pm-item app-icon { color: var(--text-dim); }
    .pm-item:hover app-icon { color: var(--accent); }
    .pm-item div > div { font-size: 13px; font-weight: 600; line-height: 1.2; }
    .pm-item small { font-size: 11px; color: var(--text-dim); display: block; margin-top: 1px; }
    .pm-item.danger { color: var(--danger); }
    .pm-item.danger app-icon { color: var(--danger); }
    .pm-item.danger:hover { background: color-mix(in oklab, var(--danger) 10%, transparent); }
  `],
})
export class NavbarComponent implements OnInit {
  name = '';
  email = '';
  locationLabel = '';
  initial = '?';
  menuOpen = false;

  constructor(
    public theme: ThemeService,
    private auth: AuthService,
    private router: Router,
    private host: ElementRef<HTMLElement>,
  ) {}

  ngOnInit(): void {
    this.auth.user$.subscribe(u => {
      this.name = u?.name || '';
      this.email = u?.email || '';
      const c = (u?.city || '').trim();
      const s = (u?.state || '').trim();
      this.locationLabel = c && s ? `${c}, ${s}` : (c || s || '');
      this.initial = (u?.name || '?')[0].toUpperCase();
    });
  }

  toggleMenu(e: MouseEvent): void {
    e.stopPropagation();
    this.menuOpen = !this.menuOpen;
  }

  go(path: string): void {
    this.menuOpen = false;
    this.router.navigate([path]);
  }

  logout(): void {
    this.menuOpen = false;
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (!this.menuOpen) return;
    if (!this.host.nativeElement.contains(e.target as Node)) {
      this.menuOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEsc(): void { this.menuOpen = false; }
}
