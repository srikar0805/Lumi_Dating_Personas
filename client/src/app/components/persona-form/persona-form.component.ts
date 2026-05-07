import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PersonaService } from '../../services/persona.service';
import { ConnectionGoal, Persona } from '../../models/persona.model';
import { IconComponent } from '../../shared/icon.component';
import { PersonaOrbComponent } from '../../shared/persona-orb.component';
import { ToastService } from '../../shared/toast.service';
import { initialOf, hueOf, formatGoal } from '../../shared/persona-helpers';

const GOALS: ConnectionGoal[] = [
  'romantic', 'collaborator', 'friend', 'mentor', 'travel',
  'co-founder', 'deep-conversation', 'creative-partner', 'casual',
];

const MOODS: { key: string; em: string }[] = [
  { key: 'Curious', em: '◌' },
  { key: 'Focused', em: '◐' },
  { key: 'Ambitious', em: '↗' },
  { key: 'Contemplative', em: '∞' },
  { key: 'Playful', em: '◊' },
  { key: 'Restless', em: '≈' },
  { key: 'Grounded', em: '▢' },
  { key: 'Dreaming', em: '☽' },
];

const TRAIT_LIBRARY = [
  'Adventurous', 'Open-minded', 'Social', 'Spontaneous',
  'Imaginative', 'Sensitive', 'Deep', 'Patient',
  'Analytical', 'Driven', 'Organized', 'Direct',
  'Introspective', 'Quiet', 'Reader', 'Stoic',
  'Playful', 'Empathetic', 'Loyal', 'Curious',
  'Ambitious', 'Night Owl', 'Morning Person', 'Focused',
];

@Component({
  selector: 'app-persona-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, IconComponent, PersonaOrbComponent],
  templateUrl: './persona-form.component.html',
})
export class PersonaFormComponent implements OnInit {
  goals = GOALS;
  moods = MOODS;
  library = TRAIT_LIBRARY;
  id: string | null = null;
  isNew = false;
  loading = false;
  saving = false;
  error = '';
  interestInput = '';
  traits: string[] = [];
  interests: string[] = [];
  hue = 265;

  initialOf = initialOf;
  formatGoal = formatGoal;

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    moodTag: ['Curious'],
    connectionGoal: ['friend' as ConnectionGoal, Validators.required],
    bio: [''],
  });

  constructor(
    private fb: FormBuilder,
    private service: PersonaService,
    private route: ActivatedRoute,
    private router: Router,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id');
    this.isNew = !this.id;
    if (!this.id) return;
    this.loading = true;
    this.service.load().subscribe(list => {
      const p = list.find(x => x._id === this.id);
      this.loading = false;
      if (!p) return;
      this.form.patchValue({
        name: p.name,
        moodTag: p.moodTag || '',
        connectionGoal: p.connectionGoal,
        bio: p.bio,
      });
      this.traits = [...(p.traits || [])];
      this.interests = [...(p.interests || [])];
      this.hue = hueOf(p);
    });
  }

  get draftName(): string { return this.form.get('name')?.value || ''; }
  get draftInitial(): string { return initialOf({ name: this.draftName }); }
  get draftMood(): string { return this.form.get('moodTag')?.value || ''; }
  get draftGoal(): ConnectionGoal { return this.form.get('connectionGoal')?.value as ConnectionGoal; }
  get draftBio(): string { return this.form.get('bio')?.value || ''; }

  toggleTrait(t: string): void {
    this.traits = this.traits.includes(t) ? this.traits.filter(x => x !== t) : [...this.traits, t];
  }

  addInterest(event: KeyboardEvent): void {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const v = this.interestInput.trim();
    if (!v) return;
    if (!this.interests.includes(v)) this.interests = [...this.interests, v];
    this.interestInput = '';
  }

  removeInterest(i: string): void {
    this.interests = this.interests.filter(x => x !== i);
  }

  setMood(key: string): void { this.form.patchValue({ moodTag: key }); }

  submit(): void {
    if (this.form.invalid) {
      this.toast.push('Give your persona a name first', 'error');
      return;
    }
    this.saving = true;
    this.error = '';
    const v = this.form.getRawValue();
    const payload: Partial<Persona> = {
      name: v.name,
      moodTag: v.moodTag,
      connectionGoal: v.connectionGoal,
      bio: v.bio,
      traits: this.traits,
      interests: this.interests,
    };
    const req = this.id
      ? this.service.update(this.id, payload)
      : this.service.create(payload);
    req.subscribe({
      next: () => {
        this.saving = false;
        this.toast.push(this.id ? 'Persona updated' : 'Persona created', 'success');
        this.router.navigate(['/personas']);
      },
      error: (err) => {
        this.error = err?.error?.error || 'Save failed';
        this.saving = false;
      },
    });
  }

  remove(): void {
    if (!this.id) return;
    if (!confirm('Delete this persona?')) return;
    this.service.delete(this.id).subscribe({
      next: () => {
        this.toast.push('Persona deleted', 'info');
        this.router.navigate(['/personas']);
      },
      error: (err) => this.toast.push(err?.error?.error || 'Delete failed', 'error'),
    });
  }

  cancel(): void { this.router.navigate(['/personas']); }
}
