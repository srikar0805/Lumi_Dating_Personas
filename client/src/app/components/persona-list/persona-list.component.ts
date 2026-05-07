import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { map, Observable, combineLatest, BehaviorSubject } from 'rxjs';
import { PersonaService } from '../../services/persona.service';
import { Persona } from '../../models/persona.model';
import { IconComponent } from '../../shared/icon.component';
import { PersonaCardComponent } from '../persona-card/persona-card.component';
import { ToastService } from '../../shared/toast.service';

@Component({
  selector: 'app-persona-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IconComponent, PersonaCardComponent],
  templateUrl: './persona-list.component.html',
  styles: [`
    .empty-shell {
      max-width: 720px; margin: 12px auto 40px; padding: 48px 32px;
      text-align: center;
      background: var(--card); border: 1px solid var(--border); border-radius: var(--r-xl);
      position: relative; overflow: hidden;
    }
    .empty-shell::before {
      content: ''; position: absolute; top: -120px; left: 50%; transform: translateX(-50%);
      width: 320px; height: 320px; border-radius: 50%;
      background: radial-gradient(circle, var(--accent-soft), transparent 70%);
      pointer-events: none;
    }
    .empty-art { position: relative; margin-bottom: 18px; }
    .orb-row { display: flex; gap: 14px; justify-content: center; align-items: center; }
    .empty-orb {
      width: 54px; height: 54px; border-radius: 50%;
      display: grid; place-items: center; font-size: 22px; color: white;
      box-shadow: 0 12px 28px -10px color-mix(in oklab, var(--accent) 40%, transparent);
    }
    .empty-orb.e1 { background: linear-gradient(135deg, #FB6F8E, #FFB39A); transform: translateY(6px) rotate(-6deg); }
    .empty-orb.e2 { background: linear-gradient(135deg, #C9B8E6, #FB6F8E); width: 64px; height: 64px; }
    .empty-orb.e3 { background: linear-gradient(135deg, #7FE5D5, #C9B8E6); transform: translateY(6px) rotate(6deg); }
    .empty-shell h2 {
      font-family: 'Fraunces', serif; font-weight: 500; font-size: 30px; letter-spacing: -0.02em;
      margin: 0 0 10px;
    }
    .empty-shell p {
      color: var(--text-dim); font-size: 14.5px; line-height: 1.6; margin: 0 auto 22px; max-width: 520px;
    }
    .empty-cta { display: flex; gap: 10px; justify-content: center; margin-bottom: 32px; flex-wrap: wrap; }
    .empty-tips {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
      text-align: left; max-width: 640px; margin: 0 auto;
    }
    .tip {
      display: flex; gap: 10px; align-items: flex-start;
      padding: 14px; background: var(--card-2); border-radius: var(--r-md);
      border: 1px solid var(--border);
    }
    .tip-num {
      flex: 0 0 24px; width: 24px; height: 24px; border-radius: 50%;
      background: var(--accent-soft); color: var(--accent);
      display: grid; place-items: center; font-weight: 700; font-size: 12px;
      font-family: 'JetBrains Mono', monospace;
    }
    .tip b { font-size: 12.5px; }
    .tip > div:last-child { font-size: 12.5px; color: var(--text-dim); line-height: 1.5; }
    @media (max-width: 720px) {
      .empty-tips { grid-template-columns: 1fr; }
    }
  `],
})
export class PersonaListComponent implements OnInit {
  private queryS = new BehaviorSubject<string>('');
  private moodFilterS = new BehaviorSubject<string>('All');

  moods$: Observable<string[]>;
  filtered$: Observable<Persona[]>;
  total$: Observable<number>;

  get query(): string { return this.queryS.value; }
  set query(v: string) { this.queryS.next(v); }

  get moodFilter(): string { return this.moodFilterS.value; }
  set moodFilter(v: string) { this.moodFilterS.next(v); }

  constructor(
    private service: PersonaService,
    private router: Router,
    private toast: ToastService,
  ) {
    this.moods$ = this.service.personas$.pipe(
      map(list => ['All', ...Array.from(new Set(list.map(p => p.moodTag || '—')))]),
    );
    this.total$ = this.service.personas$.pipe(map(list => list.length));
    this.filtered$ = combineLatest([this.service.personas$, this.queryS, this.moodFilterS]).pipe(
      map(([list, q, mood]) => list.filter(p => {
        if (mood !== 'All' && (p.moodTag || '—') !== mood) return false;
        const hay = `${p.name} ${(p.traits || []).join(' ')} ${p.connectionGoal}`.toLowerCase();
        return !q || hay.includes(q.toLowerCase());
      })),
    );
  }

  ngOnInit(): void {
    this.service.load().subscribe();
  }

  openPersona(id: string): void { this.router.navigate(['/personas', id, 'edit']); }
  openDrift(id: string): void { this.router.navigate(['/drift', id]); }

  deleteId(id: string): void {
    if (!confirm('Delete this persona?')) return;
    this.service.delete(id).subscribe({
      next: () => this.toast.push('Persona deleted', 'info'),
      error: (e) => this.toast.push(e?.error?.error || 'Delete failed', 'error'),
    });
  }
}
