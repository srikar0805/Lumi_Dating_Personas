import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, Router, NavigationEnd } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { NavbarComponent } from './components/navbar/navbar.component';
import { ToastHostComponent } from './shared/toast-host.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, NavbarComponent, ToastHostComponent],
  templateUrl: './app.component.html',
})
export class AppComponent {
  isAuthed$: Observable<boolean>;

  constructor(private router: Router) {
    this.isAuthed$ = this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      startWith(null),
      map(() => {
        const url = this.router.url;
        const publicPaths = ['/login', '/register', '/why', '/about'];
        return !publicPaths.some(p => url.startsWith(p));
      }),
    );
  }
}
