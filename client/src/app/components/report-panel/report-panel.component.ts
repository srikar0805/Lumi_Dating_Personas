import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Match } from '../../models/match.model';
import { Persona } from '../../models/persona.model';
import { IconComponent } from '../../shared/icon.component';
import { AiService } from '../../services/ai.service';
import { ToastService } from '../../shared/toast.service';

@Component({
  selector: 'app-report-panel',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div *ngIf="match" class="drawer-mask" (click)="close.emit()"></div>
    <div *ngIf="match" class="drawer">
      <button class="close" type="button" (click)="close.emit()">
        <app-icon name="x"></app-icon>
      </button>
      <div style="font-size:11px; color:var(--accent); letter-spacing:0.1em; text-transform:uppercase; font-weight:700; margin-bottom:6px">
        AI Compatibility Report
      </div>
      <h3>{{ a?.name || '…' }} + {{ b?.name || '…' }}</h3>
      <div class="drawer-sub">
        <ng-container *ngIf="cached">Cached result</ng-container>
        <ng-container *ngIf="!cached && report">Fresh from Mistral-7B</ng-container>
        <ng-container *ngIf="loading">Generating with Mistral-7B…</ng-container>
        · Model: {{ model }}
      </div>

      <div class="report-bar">
        <b>{{ match.score }}%</b>
        <div>
          <div style="font-weight:600; font-size:14px">{{ match.score >= 80 ? 'Strong fit' : match.score >= 60 ? 'Moderate fit' : 'Weak signal' }}</div>
          <span>Trait {{ match.traitOverlap }} · Interest {{ match.interestSimilarity }} · Goal {{ match.goalAlignment }} · Mood {{ match.moodAlignment }}</span>
        </div>
      </div>

      <div *ngIf="loading" class="report-section">
        <div class="skel" style="height:14px; margin-bottom:8px"></div>
        <div class="skel" style="height:14px; width:90%; margin-bottom:8px"></div>
        <div class="skel" style="height:14px; width:85%"></div>
      </div>

      <div *ngIf="error" class="report-section">
        <h6>Couldn't generate</h6>
        <p class="muted" style="color:var(--danger)">{{ error }}</p>
        <p class="muted" style="font-size:12.5px; margin-top:8px">
          Check that HF_API_TOKEN is set in server/.env and the Hugging Face inference endpoint is reachable.
        </p>
      </div>

      <div *ngIf="!loading && !error && report" class="report-section">
        <h6>Compatibility narrative</h6>
        <p>{{ report }}</p>
      </div>

      <div *ngIf="sharedTokens.length" class="report-section">
        <h6>Shared ground</h6>
        <div class="row" style="gap:6px; flex-wrap:wrap">
          <span *ngFor="let s of sharedTokens" class="chip accent">{{ s }}</span>
        </div>
      </div>

      <div class="row" style="gap:8px; margin-top:24px">
        <button class="btn btn-ghost" style="flex:1" type="button" (click)="onSave()">
          <app-icon name="save"></app-icon> Save
        </button>
        <button class="btn btn-ghost" style="flex:1" type="button" (click)="onShare()">
          <app-icon name="share"></app-icon> Share
        </button>
        <button class="btn btn-primary" style="flex:1" type="button" [disabled]="loading" (click)="regenerate()">
          <app-icon name="refresh"></app-icon> Re-run
        </button>
      </div>
    </div>
  `,
})
export class ReportPanelComponent implements OnChanges {
  @Input() match: Match | null = null;
  @Input() a: Persona | null = null;
  @Input() b: Persona | null = null;
  @Output() close = new EventEmitter<void>();

  loading = false;
  report = '';
  cached = false;
  error = '';
  model = 'Mistral-7B-Instruct';
  sharedTokens: string[] = [];

  constructor(private ai: AiService, private toast: ToastService) {}

  ngOnChanges(_: SimpleChanges): void {
    if (!this.match) return;
    this.computeShared();
    if (this.match.aiReport) {
      this.report = this.match.aiReport;
      this.cached = true;
      this.error = '';
      this.loading = false;
      return;
    }
    this.fetch();
  }

  private computeShared(): void {
    if (!this.a || !this.b) { this.sharedTokens = []; return; }
    const setB = new Set([...(this.b.traits || []), ...(this.b.interests || [])].map(x => x.toLowerCase()));
    this.sharedTokens = Array.from(new Set(
      [...(this.a.traits || []), ...(this.a.interests || [])].filter(x => setB.has(x.toLowerCase()))
    ));
  }

  private fetch(): void {
    if (!this.match) return;
    this.loading = true;
    this.error = '';
    this.report = '';
    this.ai.requestReport(this.match._id).subscribe({
      next: (res) => {
        this.loading = false;
        this.report = res.report;
        this.cached = res.cached;
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.detail || err?.error?.error || err.message || 'AI generation failed';
      },
    });
  }

  regenerate(): void {
    if (!this.match) return;
    this.match.aiReport = '';
    this.fetch();
  }

  onSave(): void { this.toast.push('Saved to library', 'success'); }
  onShare(): void { this.toast.push('Link copied', 'info'); }
}
