import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { map, Observable, forkJoin, finalize } from 'rxjs';
import { PersonaService } from '../../services/persona.service';
import { MatchService } from '../../services/match.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../shared/toast.service';
import { Persona } from '../../models/persona.model';
import { Match } from '../../models/match.model';
import { IconComponent } from '../../shared/icon.component';
import { PersonaOrbComponent } from '../../shared/persona-orb.component';
import { PersonaCardComponent } from '../persona-card/persona-card.component';
import { initialOf, hueOf, ownerNameOf, ownerPossessive } from '../../shared/persona-helpers';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent, PersonaOrbComponent, PersonaCardComponent],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private destroyRef = inject(DestroyRef);

  personas$ = this.personaService.personas$;
  topMatches$ = this.matchService.topMatches$;
  allMatches$ = this.matchService.matches$;
  user$ = this.auth.user$;

  bestScore$: Observable<number>;

  initialOf = initialOf;
  hueOf = hueOf;
  ownerNameOf = ownerNameOf;
  ownerPossessive = ownerPossessive;

  showWelcome = localStorage.getItem('ps-welcome-dismissed') !== '1';
  currentUserId = '';
  refreshing = false;
  lastRefreshed: Date | null = null;

  dismissWelcome(): void {
    this.showWelcome = false;
    localStorage.setItem('ps-welcome-dismissed', '1');
  }

  otherPersonaOf(m: Match): Persona | null {
    const a = this.personaFrom(m, 'a');
    const b = this.personaFrom(m, 'b');
    if (!a || !b) return null;
    const aOwner = typeof a.userId === 'string' ? a.userId : a.userId?._id;
    return aOwner === this.currentUserId ? b : a;
  }

  myPersonaOf(m: Match): Persona | null {
    const a = this.personaFrom(m, 'a');
    const b = this.personaFrom(m, 'b');
    if (!a || !b) return null;
    const aOwner = typeof a.userId === 'string' ? a.userId : a.userId?._id;
    return aOwner === this.currentUserId ? a : b;
  }

  constructor(
    private personaService: PersonaService,
    private matchService: MatchService,
    private auth: AuthService,
    private router: Router,
    private toast: ToastService,
  ) {
    this.bestScore$ = this.matchService.matches$.pipe(
      map(list => list.length ? Math.max(...list.map(m => m.score)) : 0),
    );
  }

  ngOnInit(): void {
    this.auth.user$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(u => { this.currentUserId = u?.id || ''; });
    this.refresh(true);
  }

  refresh(silent = false): void {
    if (this.refreshing) return;
    this.refreshing = true;
    forkJoin([
      this.personaService.load(),
      this.matchService.load(),
    ]).pipe(finalize(() => { this.refreshing = false; })).subscribe({
      next: () => {
        this.lastRefreshed = new Date();
        if (!silent) this.toast.push('Dashboard refreshed', 'success');
      },
      error: () => {
        if (!silent) this.toast.push('Could not refresh', 'error');
      },
    });
  }

  get refreshedLabel(): string {
    if (!this.lastRefreshed) return '';
    const sec = Math.floor((Date.now() - this.lastRefreshed.getTime()) / 1000);
    if (sec < 5) return 'just now';
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    return `${hr}h ago`;
  }

  personaFrom(m: Match, side: 'a' | 'b'): Persona | null {
    const v = side === 'a' ? m.personaAId : m.personaBId;
    return typeof v === 'string' ? null : v;
  }

  traitsOf(p: Persona): string[] { return (p.traits || []).slice(0, 3); }
  extraTraits(p: Persona): number { return Math.max(0, (p.traits || []).length - 3); }

  sharedOf(m: Match): string[] {
    const a = this.personaFrom(m, 'a');
    const b = this.personaFrom(m, 'b');
    if (!a || !b) return [];
    const setB = new Set([...(b.traits || []), ...(b.interests || [])].map(x => x.toLowerCase()));
    return Array.from(new Set(
      [...(a.traits || []), ...(a.interests || [])].filter(x => setB.has(x.toLowerCase()))
    )).slice(0, 3);
  }

  openPersona(id: string): void { this.router.navigate(['/personas', id, 'edit']); }
  openMatches(): void { this.router.navigate(['/matches']); }
  newPersona(): void { this.router.navigate(['/personas/new']); }

  personaBest(p: Persona, matches: Match[] | null): number {
    if (!matches || !p._id) return 0;
    const related = matches.filter(m => {
      const a = this.personaFrom(m, 'a'); const b = this.personaFrom(m, 'b');
      return a?._id === p._id || b?._id === p._id;
    });
    if (!related.length) return 0;
    return Math.max(...related.map(m => m.score));
  }
}
