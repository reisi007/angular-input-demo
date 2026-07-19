import { Component, DestroyRef, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';

import { MultiSelectChips, Option } from './multi-select-chips/multi-select-chips';

/** Mindestens 2 Optionen müssen gewählt werden. */
function minSelected(min: number) {
  return (control: AbstractControl<Option[] | null>) => {
    const count = Array.isArray(control.value) ? control.value.length : 0;
    return count >= min ? null : { minSelected: { required: min, actual: count } };
  };
}

@Component({
  selector: 'app-root',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatIconModule,
    MultiSelectChips,
  ],
  templateUrl: './app.html',
  // Kein eigenes Styling: Tailwind-Klassen + Angular Material übernehmen alles.
})
export class App {
  private readonly destroyRef = inject(DestroyRef);

  /** Auswahlmöglichkeiten für den Multi-Select. */
  readonly options: Option[] = [
    { label: 'Angular', value: 'angular' },
    { label: 'React', value: 'react' },
    { label: 'Vue', value: 'vue' },
    { label: 'Svelte', value: 'svelte' },
    { label: 'Solid', value: 'solid' },
    { label: 'Qwik', value: 'qwik' },
  ];

  /** Das FormControl – ganz normal, als wäre es ein <input>. */
  readonly frameworks = new FormControl<Option[] | null>(
    [{ label: 'Angular', value: 'angular' }],
    { validators: [Validators.required, minSelected(2)], nonNullable: true },
  );

  /** Live-Wert für die Anzeige. */
  readonly valueJson = signal('{ – }');

  constructor() {
    this.frameworks.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => {
        this.valueJson.set(JSON.stringify(v ?? null));
      });
    this.valueJson.set(JSON.stringify(this.frameworks.value));
  }
}
