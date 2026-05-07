import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../shared/icon.component';
import { PersonaOrbComponent } from '../../shared/persona-orb.component';
import { Persona } from '../../models/persona.model';
import { initialOf, hueOf, formatGoal } from '../../shared/persona-helpers';

@Component({
  selector: 'app-persona-card',
  standalone: true,
  imports: [CommonModule, IconComponent, PersonaOrbComponent],
  template: `
    <div class="persona-card" (click)="open.emit(persona._id!)">
      <div class="ghost-ring"></div>
      <app-persona-orb [initial]="initialOf(persona)" [hue]="hueOf(persona)" [size]="orbSize"></app-persona-orb>
      <h4>{{ persona.name }}</h4>
      <div class="meta">Mood: {{ persona.moodTag || '—' }} · Goal: {{ formatGoal(persona.connectionGoal) }}</div>
      <div class="traits">
        <span *ngFor="let t of visibleTraits" class="chip">{{ t }}</span>
        <span *ngIf="hiddenTraitCount > 0" class="chip">+{{ hiddenTraitCount }}</span>
      </div>
      <p *ngIf="persona.bio" class="muted" style="font-size:13px; margin:4px 0 14px; line-height:1.5">{{ persona.bio }}</p>
      <div class="score-row">
        <div class="score-n">{{ footerLabel }}<small *ngIf="footerSub"> {{ footerSub }}</small></div>
        <div class="actions" *ngIf="showActions">
          <button *ngIf="showEdit" class="btn btn-sm btn-ghost" (click)="onEdit($event)" title="Edit">
            <app-icon name="edit"></app-icon>
          </button>
          <button *ngIf="showDrift" class="btn btn-sm btn-ghost" (click)="onDrift($event)" title="History">
            <app-icon name="clock"></app-icon>
          </button>
          <button *ngIf="showDelete" class="btn btn-sm btn-ghost" (click)="onDelete($event)" title="Delete">
            <app-icon name="trash"></app-icon>
          </button>
        </div>
      </div>
    </div>
  `,
})
export class PersonaCardComponent {
  @Input() persona!: Persona;
  @Input() orbSize = 64;
  @Input() maxTraits: number | null = null;
  @Input() footerLabel: string = '';
  @Input() footerSub: string = '';
  @Input() showActions = true;
  @Input() showEdit = true;
  @Input() showDrift = true;
  @Input() showDelete = true;

  @Output() open = new EventEmitter<string>();
  @Output() edit = new EventEmitter<string>();
  @Output() drift = new EventEmitter<string>();
  @Output() remove = new EventEmitter<string>();

  initialOf = initialOf;
  hueOf = hueOf;
  formatGoal = formatGoal;

  get visibleTraits(): string[] {
    const all = this.persona.traits || [];
    return this.maxTraits != null ? all.slice(0, this.maxTraits) : all;
  }
  get hiddenTraitCount(): number {
    const all = this.persona.traits || [];
    return this.maxTraits != null ? Math.max(0, all.length - this.maxTraits) : 0;
  }

  onEdit(e: Event): void  { e.stopPropagation(); this.edit.emit(this.persona._id!); }
  onDrift(e: Event): void { e.stopPropagation(); this.drift.emit(this.persona._id!); }
  onDelete(e: Event): void { e.stopPropagation(); this.remove.emit(this.persona._id!); }
}
