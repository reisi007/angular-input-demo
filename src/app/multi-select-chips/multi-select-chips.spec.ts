import { Component, DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatChipInputEvent } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';

import { MultiSelectChips, Option } from './multi-select-chips';

const FRAMEWORKS: Option[] = [
  { label: 'Angular', value: 'angular' },
  { label: 'React', value: 'react' },
  { label: 'Vue', value: 'vue' },
];

@Component({
  template: `
    <mat-form-field appearance="outline">
      <app-multi-select-chips
        [formControl]="control"
        [options]="options"
      />
    </mat-form-field>
  `,
  imports: [MultiSelectChips, ReactiveFormsModule, MatFormFieldModule],
})
class TestHostComponent {
  readonly options = FRAMEWORKS;
  readonly control = new FormControl<Option[] | null>(null, {
    validators: [Validators.required],
  });
}

describe('MultiSelectChips (FormControl-bound)', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;
  let componentEl: DebugElement;
  let component: MultiSelectChips;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    componentEl = fixture.debugElement.query(By.directive(MultiSelectChips));
    component = componentEl.componentInstance;
    fixture.detectChanges();
  });

  it('should create and render', () => {
    expect(component).toBeTruthy();
  });

  it('renders chips above the input and keeps the grid available', () => {
    host.control.setValue([{ label: 'React', value: 'react' }]);
    fixture.detectChanges();

    const chipGrid = fixture.nativeElement.querySelector('mat-chip-grid');
    const input = fixture.nativeElement.querySelector('input');
    expect(chipGrid).toBeTruthy();
    expect(input).toBeTruthy();

    const gridTop = (chipGrid as HTMLElement).getBoundingClientRect().top;
    const inputTop = (input as HTMLElement).getBoundingClientRect().top;
    expect(gridTop).toBeLessThanOrEqual(inputTop);
  });

  describe('ControlValueAccessor', () => {
    it('setValue on FormControl populates selected chips', () => {
      host.control.setValue([{ label: 'React', value: 'react' }]);
      fixture.detectChanges();
      expect(component.selected()).toEqual([{ label: 'React', value: 'react' }]);
    });

    it('emits the new value to the form via onChange', () => {
      component.onOptionSelected({
        option: { value: 'angular' },
      } as MatAutocompleteSelectedEvent);
      fixture.detectChanges();

      expect(host.control.value).toEqual([{ label: 'Angular', value: 'angular' }]);
    });

    it('formControl.disable() disables the component', () => {
      host.control.disable();
      fixture.detectChanges();
      expect(component.disabled).toBe(true);
    });

    it('reset on FormControl clears chips', () => {
      host.control.setValue([{ label: 'React', value: 'react' }]);
      fixture.detectChanges();
      expect(component.selected().length).toBe(1);

      host.control.reset([]);
      fixture.detectChanges();
      expect(component.selected().length).toBe(0);
    });
  });

  describe('chip interactions', () => {
    it('adds a chip from autocomplete selection', () => {
      component.onOptionSelected({
        option: { value: 'react' },
      } as MatAutocompleteSelectedEvent);
      fixture.detectChanges();

      expect(component.selected().map((o) => o.value)).toContain('react');
      expect(host.control.value?.length).toBe(1);
    });

    it('does not add a duplicate chip', () => {
      component.onOptionSelected({
        option: { value: 'react' },
      } as MatAutocompleteSelectedEvent);
      component.onOptionSelected({
        option: { value: 'react' },
      } as MatAutocompleteSelectedEvent);
      fixture.detectChanges();

      const reactChips = component.selected().filter((o) => o.value === 'react');
      expect(reactChips.length).toBe(1);
      expect(host.control.value?.length).toBe(1);
    });

    it('removes a chip', () => {
      host.control.setValue([{ label: 'Vue', value: 'vue' }]);
      fixture.detectChanges();

      component.removeChip({ label: 'Vue', value: 'vue' });
      fixture.detectChanges();

      expect(component.selected().length).toBe(0);
      expect(host.control.value).toEqual(null);
    });

    it('does not add a chip when disabled', () => {
      host.control.disable();
      fixture.detectChanges();

      component.onOptionSelected({
        option: { value: 'react' },
      } as MatAutocompleteSelectedEvent);
      expect(component.selected().length).toBe(0);
    });

    it('adds free text chip only when allowFreeText is true', () => {
      component.allowFreeText = true;
      component.onChipInputEnd({
        value: 'Svelte',
        chipInput: { clear: vi.fn() },
      } as unknown as MatChipInputEvent);
      expect(component.selected().map((o) => o.value)).toContain('Svelte');

      component.allowFreeText = false;
      component.onChipInputEnd({
        value: 'Qwik',
        chipInput: { clear: vi.fn() },
      } as unknown as MatChipInputEvent);
      expect(component.selected().map((o) => o.value)).not.toContain('qwik');
    });
  });

  describe('BUG: input text cleared after selection', () => {
    it('clears the input after selecting an option with prior text', async () => {
      const input: HTMLInputElement =
        fixture.nativeElement.querySelector('input');
      input.value = 'Rea';
      component.inputValue.set('Rea');

      component.onOptionSelected({
        option: { value: 'react' },
      } as MatAutocompleteSelectedEvent);

      await fixture.whenStable();
      await new Promise((r) => setTimeout(r));

      expect(input.value).toBe('');
      expect(component.inputValue()).toBe('');
      expect(component.selected().map((o) => o.value)).toContain('react');
    });

    it('clears the input after selecting an option with empty prior text', async () => {
      const input: HTMLInputElement =
        fixture.nativeElement.querySelector('input');
      input.value = '';
      component.inputValue.set('');

      component.onOptionSelected({
        option: { value: 'vue' },
      } as MatAutocompleteSelectedEvent);

      input.value = 'Vue';

      await fixture.whenStable();
      await new Promise((r) => setTimeout(r));

      expect(input.value).toBe('');
      expect(component.selected().map((o) => o.value)).toContain('vue');
    });
  });

  describe('MatFormFieldControl', () => {
    it('reports empty state', () => {
      expect(component.empty).toBe(true);
      host.control.setValue([{ label: 'React', value: 'react' }]);
      fixture.detectChanges();
      expect(component.empty).toBe(false);
    });

    it('reports shouldLabelFloat when focused', () => {
      expect(component.shouldLabelFloat).toBe(false);
      component.onFocusIn(new FocusEvent('focusin'));
      expect(component.shouldLabelFloat).toBe(true);
    });

    it('emits stateChanges on FormControl setValue', () => {
      const spy = vi.fn();
      component.stateChanges.subscribe(spy);
      host.control.setValue([{ label: 'React', value: 'react' }]);
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('validation integration', () => {
    it('is invalid when required and value is empty', () => {
      host.control.setValue([]);
      fixture.detectChanges();
      expect(host.control.hasError('required')).toBe(true);
    });

    it('is valid when required and value is non-empty', () => {
      host.control.setValue([{ label: 'React', value: 'react' }]);
      fixture.detectChanges();
      expect(host.control.hasError('required')).toBeFalsy();
    });

    it('marks form control as touched when chip is added', () => {
      expect(host.control.touched).toBe(false);
      component.onOptionSelected({
        option: { value: 'react' },
      } as MatAutocompleteSelectedEvent);
      fixture.detectChanges();
      expect(host.control.touched).toBe(true);
    });

    it('errorState reflects form control invalid + touched', () => {
      component.onOptionSelected({
        option: { value: 'react' },
      } as MatAutocompleteSelectedEvent);
      fixture.detectChanges();
      expect(host.control.touched).toBe(true);

      component.removeChip({ label: 'React', value: 'react' });
      fixture.detectChanges();

      expect(host.control.hasError('required')).toBe(true);
      expect(component.errorState).toBe(true);
    });
  });
});
