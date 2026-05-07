import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../shared/icon.component';
import { PersonaOrbComponent } from '../../shared/persona-orb.component';
import { PersonaService } from '../../services/persona.service';
import { MatchService, ConnectCandidate } from '../../services/match.service';
import { ToastService } from '../../shared/toast.service';
import { Persona } from '../../models/persona.model';
import { hueOf, formatGoal } from '../../shared/persona-helpers';

@Component({
  selector: 'app-connect',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, PersonaOrbComponent],
  template: `
    <div class="page connect-page">
      <div class="connect-head">
        <div>
          <h1>Connect</h1>
          <p class="sub">Swipe right to like, left to pass. Cards are ranked by compatibility and proximity.</p>
        </div>
        <div class="connect-controls">
          <label class="connect-as">
            <span>Swipe as</span>
            <select [ngModel]="activePersonaId" (ngModelChange)="onPersonaChange($event)">
              <option *ngFor="let p of myPersonas" [ngValue]="p._id">{{ p.name }}</option>
            </select>
          </label>
          <span *ngIf="me?.city || me?.state" class="chip">
            📍 {{ locationLabel(me?.city, me?.state) }}
          </span>
        </div>
      </div>

      <div *ngIf="loading" class="connect-empty">
        <div class="skel" style="width:340px; height:480px; border-radius: var(--r-xl)"></div>
      </div>

      <div *ngIf="!loading && stack.length === 0" class="connect-empty">
        <div class="empty-card">
          <div class="empty-orb">✨</div>
          <h3>No more cards right now</h3>
          <p>You've seen everyone available for this self. Check back later or try swiping as a different persona.</p>
        </div>
      </div>

      <div *ngIf="!loading && stack.length > 0" class="swipe-stage">
        <div class="swipe-stack">
          <div *ngFor="let c of visibleCards; let i = index"
               class="swipe-card connect-card"
               [class.is-top]="i === 0"
               [style.transform]="cardTransform(i)"
               [style.zIndex]="visibleCards.length - i"
               (pointerdown)="i === 0 && onPointerDown($event)"
               (pointermove)="i === 0 && onPointerMove($event)"
               (pointerup)="i === 0 && onPointerUp($event)"
               (pointercancel)="i === 0 && onPointerUp($event)">

            <div class="swipe-tag like" [style.opacity]="i === 0 ? likeOpacity : 0">LIKE</div>
            <div class="swipe-tag nope" [style.opacity]="i === 0 ? nopeOpacity : 0">NOPE</div>

            <div class="card-top">
              <app-persona-orb [initial]="initialFor(c)" [hue]="hueFor(c)" [size]="86"></app-persona-orb>
              <div class="card-id">
                <h3>{{ c.persona.name }}</h3>
                <div class="card-owner">{{ c.owner.name }} · {{ locationLabel(c.owner.city, c.owner.state) || 'Unknown' }}</div>
                <div class="card-mood" *ngIf="c.persona.moodTag">
                  <span class="chip">{{ c.persona.moodTag }}</span>
                  <span class="chip accent">{{ goalLabel(c.persona.connectionGoal) }}</span>
                </div>
              </div>
            </div>

            <div class="card-meta">
              <div class="meta-pill">
                <span class="meta-label">Compatibility</span>
                <b>{{ c.score }}%</b>
              </div>
              <div class="meta-pill" [class.near]="c.proximity.tier === 0" [class.mid]="c.proximity.tier === 1">
                <span class="meta-label">Distance</span>
                <b>{{ c.proximity.label }}</b>
              </div>
            </div>

            <div class="score-breakdown">
              <div class="sb-row">
                <span>Trait</span>
                <div class="sb-bar"><div class="sb-fill" [style.width.%]="c.traitOverlap"></div></div>
                <b>{{ c.traitOverlap }}</b>
              </div>
              <div class="sb-row">
                <span>Interest</span>
                <div class="sb-bar"><div class="sb-fill" [style.width.%]="c.interestSimilarity"></div></div>
                <b>{{ c.interestSimilarity }}</b>
              </div>
              <div class="sb-row">
                <span>Goal</span>
                <div class="sb-bar"><div class="sb-fill" [style.width.%]="c.goalAlignment"></div></div>
                <b>{{ c.goalAlignment }}</b>
              </div>
              <div class="sb-row">
                <span>Mood</span>
                <div class="sb-bar"><div class="sb-fill" [style.width.%]="c.moodAlignment"></div></div>
                <b>{{ c.moodAlignment }}</b>
              </div>
            </div>

            <div class="card-section" *ngIf="c.persona.traits?.length">
              <h6>Traits</h6>
              <div class="card-tags">
                <span *ngFor="let t of c.persona.traits" class="chip">{{ t }}</span>
              </div>
            </div>

            <div class="card-section" *ngIf="c.persona.interests?.length">
              <h6>Interests</h6>
              <div class="card-tags">
                <span *ngFor="let it of c.persona.interests" class="chip">{{ it }}</span>
              </div>
            </div>

            <div class="card-section" *ngIf="c.persona.bio">
              <h6>About</h6>
              <p style="margin:0; font-size: 13.5px; color: var(--text-dim); line-height: 1.5">{{ c.persona.bio }}</p>
            </div>
          </div>
        </div>

        <div class="swipe-controls">
          <button class="ctrl no" (click)="swipe('left')" title="Pass (left)">
            <app-icon name="x"></app-icon>
          </button>
          <button class="ctrl star" (click)="undo()" [disabled]="!lastSwiped" title="Undo">
            <app-icon name="clock"></app-icon>
          </button>
          <button class="ctrl yes" (click)="swipe('right')" title="Like (right)">
            <app-icon name="heart"></app-icon>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .connect-page { max-width: 880px; }
    .connect-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 22px; flex-wrap: wrap; }
    .connect-controls { display: flex; align-items: center; gap: 12px; }
    .connect-as { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-dim); }
    .connect-as select { background: var(--card); border: 1px solid var(--border); border-radius: var(--r-md); padding: 8px 12px; font-size: 13.5px; color: var(--text); }
    .swipe-stage { display: flex; flex-direction: column; align-items: center; gap: 22px; }
    .swipe-stack { position: relative; width: 360px; height: 540px; }
    .connect-card { padding: 22px; gap: 14px; cursor: grab; user-select: none; touch-action: none; }
    .connect-card.is-top { cursor: grab; }
    .connect-card.is-top:active { cursor: grabbing; }
    .card-top { display: flex; gap: 14px; align-items: center; }
    .card-id h3 { margin: 0 0 2px; font-family: 'Fraunces', serif; font-weight: 500; font-size: 22px; letter-spacing: -0.01em; }
    .card-owner { color: var(--text-dim); font-size: 12.5px; margin-bottom: 8px; }
    .card-mood { display: flex; gap: 6px; flex-wrap: wrap; }
    .card-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .meta-pill { padding: 12px 14px; background: var(--card-2); border: 1px solid var(--border); border-radius: var(--r-md); display: flex; flex-direction: column; gap: 2px; }
    .meta-pill.near { background: color-mix(in oklab, var(--success) 14%, transparent); border-color: color-mix(in oklab, var(--success) 30%, transparent); }
    .meta-pill.mid { background: var(--accent-soft); border-color: color-mix(in oklab, var(--accent) 30%, transparent); }
    .meta-label { font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-dim); font-weight: 600; }
    .meta-pill b { font-family: 'Fraunces', serif; font-weight: 500; font-size: 18px; letter-spacing: -0.01em; }
    .card-section h6 { margin: 0 0 6px; font-size: 10.5px; color: var(--text-dim); letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600; }
    .score-breakdown { display: flex; flex-direction: column; gap: 4px; padding: 8px 12px; background: var(--card-2); border-radius: var(--r-md); border: 1px solid var(--border); }
    .sb-row { display: grid; grid-template-columns: 56px 1fr 28px; align-items: center; gap: 8px; font-size: 11.5px; color: var(--text-dim); }
    .sb-row b { font-family: 'JetBrains Mono', monospace; font-weight: 500; font-size: 11px; color: var(--text); text-align: right; }
    .sb-bar { height: 5px; background: var(--card); border-radius: 999px; overflow: hidden; }
    .sb-fill { height: 100%; background: linear-gradient(90deg, var(--accent), var(--accent-2)); border-radius: 999px; transition: width .4s cubic-bezier(.2,.8,.2,1); }
    .card-tags { display: flex; flex-wrap: wrap; gap: 5px; }
    .swipe-tag {
      position: absolute; top: 22px; padding: 6px 14px; border-radius: 8px;
      font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 14px;
      letter-spacing: 0.12em; pointer-events: none; transition: opacity .12s linear;
      border: 2px solid currentColor;
    }
    .swipe-tag.like { right: 22px; color: var(--success); transform: rotate(12deg); }
    .swipe-tag.nope { left: 22px; color: var(--danger); transform: rotate(-12deg); }
    .connect-empty { display: grid; place-items: center; min-height: 480px; }
    .empty-card { padding: 36px; text-align: center; max-width: 360px; background: var(--card); border: 1px solid var(--border); border-radius: var(--r-xl); }
    .empty-orb { font-size: 42px; margin-bottom: 8px; }
    .empty-card h3 { margin: 0 0 6px; font-family: 'Fraunces', serif; font-weight: 500; font-size: 22px; }
    .empty-card p { margin: 0; color: var(--text-dim); font-size: 13.5px; line-height: 1.5; }
  `],
})
export class ConnectComponent implements OnInit {
  myPersonas: Persona[] = [];
  activePersonaId: string | null = null;
  stack: ConnectCandidate[] = [];
  loading = true;
  me: { city: string; state: string } = { city: '', state: '' };

  // Drag state for the top card
  dragX = 0;
  dragY = 0;
  startX = 0;
  startY = 0;
  dragging = false;
  animatingOff = false;
  animateDir: 'right' | 'left' | null = null;

  lastSwiped: { card: ConnectCandidate; direction: 'right' | 'left' } | null = null;

  constructor(
    private personaService: PersonaService,
    private matchService: MatchService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.personaService.load().subscribe(list => {
      this.myPersonas = list;
      if (list.length === 0) {
        this.loading = false;
        this.toast.push('Create a persona first to start connecting.', 'info');
        return;
      }
      this.activePersonaId = list[0]._id || null;
      this.loadStack();
    });
  }

  get visibleCards(): ConnectCandidate[] {
    return this.stack.slice(0, 3);
  }

  loadStack(): void {
    if (!this.activePersonaId) return;
    this.loading = true;
    this.matchService.getConnectStack(this.activePersonaId).subscribe({
      next: res => {
        this.me = res.me;
        this.stack = res.candidates;
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        this.toast.push(err?.error?.error || 'Could not load candidates', 'error');
      },
    });
  }

  onPersonaChange(id: string): void {
    this.activePersonaId = id;
    this.lastSwiped = null;
    this.loadStack();
  }

  initialFor(c: ConnectCandidate): string {
    return (c.persona.name || '?')[0].toUpperCase();
  }
  hueFor(c: ConnectCandidate): number {
    return hueOf({ _id: c.persona._id, name: c.persona.name });
  }
  goalLabel(g: string): string {
    return formatGoal(g);
  }
  locationLabel(city?: string, state?: string): string {
    const c = (city || '').trim();
    const s = (state || '').trim();
    if (c && s) return `${c}, ${s}`;
    return c || s || '';
  }

  // ===== Drag handling =====
  onPointerDown(e: PointerEvent): void {
    if (this.animatingOff) return;
    this.dragging = true;
    this.startX = e.clientX;
    this.startY = e.clientY;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }
  onPointerMove(e: PointerEvent): void {
    if (!this.dragging) return;
    this.dragX = e.clientX - this.startX;
    this.dragY = e.clientY - this.startY;
  }
  onPointerUp(_e: PointerEvent): void {
    if (!this.dragging) return;
    this.dragging = false;
    const threshold = 110;
    if (this.dragX > threshold) {
      this.animateAndSwipe('right');
    } else if (this.dragX < -threshold) {
      this.animateAndSwipe('left');
    } else {
      this.dragX = 0; this.dragY = 0;
    }
  }

  cardTransform(i: number): string {
    if (i === 0) {
      if (this.animatingOff) {
        const off = this.animateDir === 'right' ? 1000 : -1000;
        const rot = this.animateDir === 'right' ? 24 : -24;
        return `translate(${off}px, 80px) rotate(${rot}deg)`;
      }
      const rot = this.dragX / 24;
      return `translate(${this.dragX}px, ${this.dragY}px) rotate(${rot}deg)`;
    }
    const scale = 1 - i * 0.04;
    const offset = i * 10;
    return `translate(0, ${offset}px) scale(${scale})`;
  }

  get likeOpacity(): number {
    return Math.max(0, Math.min(1, this.dragX / 120));
  }
  get nopeOpacity(): number {
    return Math.max(0, Math.min(1, -this.dragX / 120));
  }

  swipe(direction: 'right' | 'left'): void {
    if (this.animatingOff || this.stack.length === 0) return;
    this.animateAndSwipe(direction);
  }

  private animateAndSwipe(direction: 'right' | 'left'): void {
    if (this.animatingOff) return;
    this.animatingOff = true;
    this.animateDir = direction;
    setTimeout(() => this.commitSwipe(direction), 300);
  }

  private commitSwipe(direction: 'right' | 'left'): void {
    const card = this.stack.shift();
    this.animatingOff = false;
    this.animateDir = null;
    this.dragX = 0; this.dragY = 0;
    if (!card || !this.activePersonaId) return;

    this.lastSwiped = { card, direction };

    this.matchService.swipe(this.activePersonaId, card.persona._id, direction).subscribe({
      next: r => {
        if (direction === 'right') {
          this.toast.push(r.mutual ? `It's a match with ${card.owner.name}!` : `Liked ${card.persona.name}`, 'success');
        }
      },
      error: () => this.toast.push('Could not save swipe', 'error'),
    });
  }

  undo(): void {
    if (!this.lastSwiped || !this.activePersonaId) return;
    const last = this.lastSwiped;
    this.lastSwiped = null;
    this.matchService.undoSwipe(this.activePersonaId, last.card.persona._id).subscribe({
      next: () => {
        this.stack.unshift(last.card);
        this.toast.push('Swipe undone', 'info');
      },
      error: () => {
        this.lastSwiped = last;
        this.toast.push('Could not undo swipe', 'error');
      },
    });
  }

  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    if (e.key === 'ArrowRight') this.swipe('right');
    else if (e.key === 'ArrowLeft') this.swipe('left');
  }
}
