import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DoCheck,
  ElementRef,
  Input,
  OnDestroy,
  signal,
  ViewChild,
} from '@angular/core';

import {
  MatAutocomplete,
  MatAutocompleteSelectedEvent,
  MatAutocompleteTrigger,
  MatOption,
} from '@angular/material/autocomplete';
import {
  MatChipGrid,
  MatChipInput,
  MatChipInputEvent,
  MatChipRemove,
  MatChipRow,
} from '@angular/material/chips';
import { MatFormFieldControl } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';

import { FormFieldMultiSelectBase } from './form-field-multi-select-base';

/** A single selectable option. */
export interface Option {
  label: string;
  value: string;
}

/**
 * Multi-Select als Chips + Autocomplete.
 *
 * Implementiert **zwei** Verträge in einer Komponente, aber der gesamte
 * Boilerplate steckt in {@link FormFieldMultiSelectBase}:
 *  - `ControlValueAccessor` – die *universelle* Schicht für `[formControl]`,
 *    `[formControlName]`, `[ngModel]` (und via Backward-Compat auch Signal
 *    Forms).
 *  - `MatFormFieldControl` – die *zusätzliche* Schicht für
 *    `<mat-form-field>` (Label-Float, Hints, Errors, Fokus-Underline).
 *
 * Interner Zustand läuft vollständig über Signals.
 */
@Component({
  selector: 'app-multi-select-chips',
  imports: [
    MatChipGrid,
    MatChipRow,
    MatChipRemove,
    MatChipInput,
    MatInput,
    MatAutocomplete,
    MatAutocompleteTrigger,
    MatOption,
    MatIcon,
  ],
  templateUrl: './multi-select-chips.html',
  host: {
    class: 'block w-full',
    '[attr.aria-labelledby]': 'parentFormField?.getLabelId()',
    '[attr.aria-describedby]': 'describedBy',
    '(focusin)': 'onFocusIn($event)',
    '(focusout)': 'onFocusOut($event)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: MatFormFieldControl, useExisting: MultiSelectChips }],
})
export class MultiSelectChips
  extends FormFieldMultiSelectBase<Option[]>
  implements DoCheck, OnDestroy
{
  // -----------------------------------------------------------------------
  // Signaler Zustand
  // -----------------------------------------------------------------------
  readonly selected = signal<Option[]>([]);
  readonly inputValue = signal('');
  private readonly _focused = signal(false);
  readonly touched = signal(false);

  private readonly _options = signal<Option[]>([]);

  readonly filteredOptions = computed(() => {
    const query = this.inputValue().trim().toLowerCase();
    const taken = new Set(this.selected().map((o) => o.value));
    return this._options().filter((o) => {
      if (taken.has(o.value)) return false;
      return query === '' || o.label.toLowerCase().includes(query);
    });
  });

  // --- MatFormFieldControl-Hooks --------------------------------------
  get currentValue(): Option[] | null {
    const v = this.selected();
    return v.length ? v : null;
  }
  get isEmpty(): boolean {
    return this.selected().length === 0 && this.inputValue().trim() === '';
  }
  get hasFocus(): boolean {
    return this._focused();
  }
  get isTouched(): boolean {
    return this.touched();
  }

  // -----------------------------------------------------------------------
  // Eigene Inputs / ViewChild
  // -----------------------------------------------------------------------
  @ViewChild('input') private _input?: ElementRef<HTMLInputElement>;

  @Input()
  set options(value: Option[] | null | undefined) {
    this._options.set(value ?? []);
  }

  @Input() allowFreeText = false;

  // -----------------------------------------------------------------------
  // ControlValueAccessor-Hooks
  // -----------------------------------------------------------------------
  onWriteValue(value: Option[] | null): void {
    this.onValueSet(value);
  }

  onSetDisabled(isDisabled: boolean): void {
    if (isDisabled) this._focused.set(false);
  }

  onValueSet(value: Option[] | null): void {
    this.selected.set(value ?? []);
  }

  // -----------------------------------------------------------------------
  // Interaktion
  // -----------------------------------------------------------------------
  onChipInputEnd(event: MatChipInputEvent): void {
    if (this.allowFreeText) {
      this.addChip(event.value);
    }
    event.chipInput?.clear();
    this.clearInput();
  }

  onOptionSelected(event: MatAutocompleteSelectedEvent): void {
    const value = event.option.value as string | undefined;
    if (value != null) {
      this.addChip(value);
    }
    this.clearInput();
    this._input?.nativeElement.focus();
  }

  removeChip(option: Option): void {
    this.selected.update((list) => list.filter((o) => o.value !== option.value));
    this.emitValue(this.currentValue);
  }

  private addChip(rawValue: string): void {
    const value = rawValue.trim();
    if (!value || this.disabled) return;

    const existing = this.selected().find((o) => o.value === value);
    if (existing) return;

    const known = this._options().find((o) => o.value === value);
    const option: Option = known ?? { label: value, value };
    this.selected.update((list) => [...list, option]);

    this.emitValue(this.currentValue);
  }

  /**
   * Leert das native Eingabefeld *und* das Signal.
   *
   * Wichtig: `<mat-autocomplete>` schreibt nach `optionSelected` selbst noch
   * den (via `displayWith` aufgelösten) Label-Text in das Input – teils erst in
   * einem späteren Macrotask. Daher wird das native Element erst im nächsten
   * `setTimeout` geleert, sonst überschreibt Material unseren Reset und der
   * alte Suchtext bleibt sichtbar.
   */
  private clearInput(): void {
    this.inputValue.set('');
    setTimeout(() => {
      if (this._input) this._input.nativeElement.value = '';
      this.stateChanges.next();
    });
  }

  // -----------------------------------------------------------------------
  // Fokus-Handling
  // -----------------------------------------------------------------------
  onFocusIn(_event: FocusEvent): void {
    if (!this._focused()) {
      this._focused.set(true);
      this.stateChanges.next();
    }
  }

  onFocusOut(event: FocusEvent): void {
    const stillInside = this._elementRef.nativeElement.contains(
      event.relatedTarget as Node | null,
    );
    if (!stillInside) {
      this.touched.set(true);
      this._focused.set(false);
      this.stateChanges.next();
    }
  }

  override onContainerClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.tagName.toLowerCase() !== 'input') {
      this._input?.nativeElement.focus();
    }
  }

  // -----------------------------------------------------------------------
  // Hooks
  // -----------------------------------------------------------------------

  ngDoCheck(): void {
    if (this.ngControl?.touched && !this.touched()) {
      this.touched.set(true);
    }
    this.updateErrorState(this.ngControl?.invalid ?? false);
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
  }

  displayFn = (value: string | null): string => {
    if (!value) return '';
    return this._options().find((o) => o.value === value)?.label ?? value;
  };
}
