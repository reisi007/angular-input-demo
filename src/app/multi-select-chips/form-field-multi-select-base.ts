import {
  BooleanInput,
  coerceBooleanProperty,
} from '@angular/cdk/coercion';
import { ElementRef, inject, Input, signal, Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { FormGroupDirective, NgForm } from '@angular/forms';
import { MatFormField, MatFormFieldControl } from '@angular/material/form-field';

/**
 * Fasst den repetitiven Boilerplate von {@link ControlValueAccessor} und
 * {@link MatFormFieldControl} in **einer** abstrakten Basisklasse zusammen.
 *
 * Konkrete Controls erben davon und implementieren nur die fachlichen Hooks:
 *  - {@link onWriteValue} / {@link onValueSet} – Wert rein/raus
 *  - {@link onSetDisabled} – Disabled-State ändert sich
 *  - {@link currentValue}, {@link isEmpty}, {@link hasFocus}, {@link isTouched}
 *    – MatFormFieldControl-Getter
 *  - {@link emitValue} – neuen Wert ans Formular melden
 *
 * `NgControl` wird aus dem Injector geholt (nicht via Provider), um einen
 * Circular-Dependency-Fehler zu vermeiden – exakt wie im offiziellen Guide.
 */
@Injectable()
export abstract class FormFieldMultiSelectBase<T>
  implements ControlValueAccessor, MatFormFieldControl<T>
{
  protected readonly _elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly parentFormField = inject(MatFormField, { optional: true });
  private readonly _parentForm = inject(NgForm, { optional: true });
  private readonly _parentFormGroup = inject(FormGroupDirective, { optional: true });
  public readonly ngControl = inject(NgControl, { optional: true, self: true });

  constructor() {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  // --- ControlValueAccessor -------------------------------------------
  private _onChange: (value: T | null) => void = () => {};
  private _onTouched: () => void = () => {};

  writeValue(value: T | null): void {
    this.onWriteValue(value);
    this.stateChanges.next();
  }
  registerOnChange(fn: (value: T | null) => void): void {
    this._onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this._onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this._disabled.set(isDisabled);
    this.onSetDisabled(isDisabled);
  }

  /** Schickt einen neuen Wert ans Formular und markiert das Control. */
  protected emitValue(value: T | null): void {
    this._onChange(value);
    this._onTouched();
  }

  // --- MatFormFieldControl: Identität ---------------------------------
  static nextId = 0;
  id = `mat-field-control-${FormFieldMultiSelectBase.nextId++}`;
  controlType = 'mat-field-control';
  readonly stateChanges = new Subject<void>();

  // --- MatFormFieldControl: value -------------------------------------
  get value(): T | null {
    return this.currentValue;
  }
  set value(value: T | null) {
    this.onValueSet(value);
    this.stateChanges.next();
  }

  // --- MatFormFieldControl: placeholder -------------------------------
  private readonly _placeholder = signal('');
  @Input()
  get placeholder(): string {
    return this._placeholder();
  }
  set placeholder(value: string) {
    this._placeholder.set(value);
    this.stateChanges.next();
  }

  // --- MatFormFieldControl: required ----------------------------------
  private readonly _required = signal(false);
  @Input()
  get required(): boolean {
    return this._required();
  }
  set required(value: BooleanInput) {
    this._required.set(coerceBooleanProperty(value));
    this.stateChanges.next();
  }

  // --- MatFormFieldControl: disabled ----------------------------------
  private readonly _disabled = signal(false);
  @Input()
  get disabled(): boolean {
    return this._disabled();
  }
  set disabled(value: BooleanInput) {
    this._disabled.set(coerceBooleanProperty(value));
    this.stateChanges.next();
  }

  // --- MatFormFieldControl: getter ------------------------------------
  get focused(): boolean {
    return this.hasFocus;
  }
  get empty(): boolean {
    return this.isEmpty;
  }
  get shouldLabelFloat(): boolean {
    return this.hasFocus || !this.isEmpty;
  }

  // --- MatFormFieldControl: errorState --------------------------------
  errorState = false;

  // --- MatFormFieldControl: aria --------------------------------------
  describedBy = '';
  @Input('aria-describedby') userAriaDescribedBy = '';

  setDescribedByIds(ids: string[]): void {
    const merged = [...ids];
    if (this.userAriaDescribedBy) merged.unshift(this.userAriaDescribedBy);
    this.describedBy = merged.join(' ');
  }

  onContainerClick(_event: MouseEvent): void {}

  /** Fehler-State neu bewerten (von `ngDoCheck` der Komponente aufgerufen). */
  protected updateErrorState(invalid: boolean | undefined): void {
    const parentSubmitted = !!(
      this._parentFormGroup?.submitted || this._parentForm?.submitted
    );
    const touchedOrSubmitted = this.isTouched || parentSubmitted;
    const newState = !!invalid && touchedOrSubmitted;

    if (this.errorState !== newState) {
      this.errorState = newState;
      this.stateChanges.next();
    }
  }

  ngOnDestroy(): void {
    this.stateChanges.complete();
  }

  // --- von der konkreten Komponente bereitzustellen -------------------
  abstract onWriteValue(value: T | null): void;
  abstract onValueSet(value: T | null): void;
  abstract onSetDisabled(isDisabled: boolean): void;
  abstract currentValue: T | null;
  abstract isEmpty: boolean;
  abstract hasFocus: boolean;
  abstract isTouched: boolean;
}
