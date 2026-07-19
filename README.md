# angular-input-demo

> Live-Demo: https://reisi007.github.io/angular-input-demo/

A custom multi-select chips component for Angular Material, built with reactive forms integration and autocomplete.

## Tech Stack

- **Angular 22** with Signals and `OnPush` change detection
- **Angular Material 22** (`mat-form-field`, `mat-chip`, `mat-autocomplete`)
- **Tailwind CSS v4** for layout styling
- **Vitest** for unit testing
- **pnpm** as package manager

## Key Features

- Chip-based multi-select with autocomplete filtering
- Implements both `ControlValueAccessor` (for reactive/template-driven forms) and `MatFormFieldControl` (for `<mat-form-field>` integration)
- Signal-based internal state
- Optional free-text entry (`allowFreeText`)
- Custom validators work seamlessly (e.g. `minSelected`)

## Architecture

The abstract class `FormFieldMultiSelectBase<T>` consolidates all `ControlValueAccessor` and `MatFormFieldControl` boilerplate. Concrete components like `MultiSelectChips` extend it and only implement domain-specific hooks (`onWriteValue`, `onSetDisabled`, `isEmpty`, etc.).

## Usage

```html
<mat-form-field appearance="outline">
  <mat-label>Frameworks</mat-label>
  <app-multi-select-chips
    [formControl]="frameworks"
    [options]="options"
    placeholder="Search…"
    required
  />
  <mat-hint>Select at least 2.</mat-hint>
</mat-form-field>
```

## Commands

```sh
pnpm install      # Install dependencies
pnpm start        # Start dev server (ng serve)
pnpm test         # Run Vitest tests
```

## Deployment (GitHub Pages)

Das Projekt wird automatisch per GitHub Actions auf GitHub Pages veröffentlicht. Bei jedem Push auf den `main`-Branch baut der Workflow (`.github/workflows/deploy.yml`) die App und deployt sie nach `https://reisi007.github.io/angular-input-demo/`.

Die App verwendet `baseHref: /angular-input-demo/` (siehe `angular.json`), damit sie unter dem Repository-Unterpfad korrekt lädt.

Lokal mit korrektem Base-Path bauen:

```sh
pnpm ng build --configuration production --base-href /angular-input-demo/
```
