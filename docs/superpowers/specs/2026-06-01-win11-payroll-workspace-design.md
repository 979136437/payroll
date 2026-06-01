# Win11 Payroll Workspace Redesign

## Summary

Redesign the payroll workspace into a Win11-inspired desktop experience with a clearer two-level workflow:

- a default overview home
- a resource-browser style payroll sheet entry surface
- a dedicated sheet detail workspace for payroll editing

The current experience is functional, but it compresses overview, navigation, and editing into a single page-level widget. This milestone restructures the information architecture so the product feels closer to a modern desktop productivity app while preserving the existing payroll workflows, store, and API layer.

This redesign covers frontend information architecture, layout, styling, component decomposition, and state-flow updates needed to support the new experience.

This redesign does not introduce new backend payroll capabilities, new persistence logic, or new business rules for payroll operations.

## Goals

- Establish a Win11-inspired visual language for the payroll application.
- Introduce a default overview home instead of dropping directly into the editing surface.
- Present payroll sheets as resource-style cards on the overview page.
- Preserve a focused dual-column detail workspace for editing a selected payroll sheet.
- Keep existing payroll actions working:
  - create payroll sheet
  - create personnel
  - add personnel to sheet
  - remove personnel from sheet
  - edit and save net pay
- Reuse the existing frontend store and request layer where practical.
- Improve component boundaries so layout concerns and table concerns are easier to evolve independently.

## Non-Goals

- No new backend endpoints or Tauri commands.
- No changes to the payroll database schema.
- No introduction of filtering, sorting, or search unless it is already required by the redesign.
- No import/export workflows.
- No authentication, user profiles, or multi-user concepts.
- No full routing-library migration in this milestone.

## Recommended Approach

Keep the current single-store architecture and add an explicit page-view state on top of it. This provides the benefits of a two-level application flow without turning the redesign into a routing-infrastructure project.

Why this approach:

- it fits the current `zustand`-based state model
- it limits the change surface to frontend layout and state semantics
- it preserves the current API and action flows
- it makes the overview and detail experiences first-class without introducing unnecessary dependencies

Alternative approaches were considered:

- adding a full routing library now would create a cleaner long-term shell, but it expands scope beyond the current UI milestone
- keeping everything in one visual page with conditional blocks would be faster short-term, but it would continue to blur the boundaries between overview, navigation, and editing

## Information Architecture

The redesigned application should follow this primary flow:

1. The app opens to an overview home.
2. The overview page presents high-level payroll context and payroll sheet entry points.
3. Selecting a payroll sheet moves the user into a dedicated detail workspace.
4. The detail workspace provides a clear path back to the overview home.

### Overview Home

Purpose: provide orientation, summary, and entry into payroll sheet work.

Main regions:

- top welcome area with application context and primary actions
- summary tiles for payroll-relevant counts and recency
- payroll sheet browser grid styled like desktop resources
- empty state when no payroll sheets exist

The overview page should feel like the application landing surface rather than a placeholder state.

### Payroll Sheet Detail Workspace

Purpose: support focused editing on one payroll sheet.

Main regions:

- page header with back navigation, sheet title, status text, and key actions
- left navigation rail or panel for sheet navigation and supporting context
- right primary work area for payroll record editing
- action toolbar above the table for frequent operations and current selection state

The detail workspace should preserve the proven dual-column editing model while making the hierarchy cleaner and more desktop-like.

## Visual Direction

The visual style should evoke Win11 productivity surfaces rather than a generic web dashboard.

Key traits:

- soft layered backgrounds instead of flat fills
- large, consistent corner radii
- restrained glass-like surfaces with light transparency
- subtle borders and low-contrast shadows
- calmer spacing and less visual noise around controls
- limited motion focused on view transitions, panel reveals, and card hover states

The design should stay practical and understated. It should not drift into neon, glossy skeuomorphism, or decorative gradients that compete with data entry.

### Surface Language

- Background: pale atmospheric gradient with a clean neutral base.
- Panels: translucent light cards with thin borders and soft low-radius blur.
- Primary buttons: stronger filled emphasis, closer to Win11 action buttons.
- Secondary buttons: quieter surfaces with low-contrast borders.
- Informational messages: integrated notification cards rather than generic banners.

### Density And Rhythm

- Overview sections should breathe more than the current workspace.
- Detail pages should stay denser than the overview, but still use clearer spacing bands between header, toolbar, and table.
- Summary cards should remain compact and legible rather than dominating the editing surface.

## Component Structure

The redesign should split page layout responsibilities from feature responsibilities.

Suggested component boundaries:

- `payroll-workspace-shell`
  - chooses between overview and detail views
- `payroll-overview-panel`
  - renders welcome area, summary tiles, and sheet browser
- `payroll-sheet-browser`
  - renders payroll sheet resource cards
- `payroll-sheet-detail-panel`
  - renders detail header and the two-column workspace shell
- `payroll-record-toolbar`
  - renders table-adjacent actions and selection state

Existing feature components should remain focused on business interactions:

- payroll sheet creation dialog
- personnel picker dialog
- payroll record table

Existing UI primitives such as cards, buttons, empty panels, summary tiles, and message surfaces can be restyled or extended to support the new visual direction, but their responsibilities should stay small and reusable.

## Data Flow And State Management

The current store should remain the single frontend state source.

### Store Semantics

Add an explicit view state, for example:

- `currentView: "overview" | "sheet-detail"`

The current `selectedSheetId` should continue to represent the active payroll sheet, but it should no longer determine page mode by itself. This removes the current overloaded meaning where `null` can imply both "no sheet selected" and "show the non-detail layout."

### Navigation Behavior

- Initial app load should enter the overview view.
- Selecting a payroll sheet on the overview page should set the selected sheet and transition into detail view.
- Returning from detail view should keep the selected sheet available for context, but switch the interface back to overview.
- If the selected sheet becomes invalid after refresh, the app should fall back safely to overview.

### Subscription Strategy

To limit unnecessary rerenders, the page-level components should subscribe only to the smallest state slices they need:

- overview page: `sheets`, `personnel`, summary counts, feedback state
- detail page: `selectedSheetId`, `sheetDetail`, `salaryDrafts`, loading state, current selections

This keeps the redesign aligned with React performance guidance and the recent work already done to reduce overly broad workspace subscriptions.

## Interaction Design

### Overview Entry

- Payroll sheets should appear as desktop-like cards rather than a simple vertical list.
- Each card should show:
  - sheet name
  - updated time
  - personnel count
  - a clear affordance to open the sheet

### Detail Header

The detail header should make context obvious immediately:

- back-to-overview action
- current sheet title
- supporting text such as updated time or current record count
- primary actions such as adding personnel

### Table Toolbar

The payroll record table should gain a distinct toolbar region above the table for:

- add personnel
- remove selected personnel
- selected count
- inline status or feedback messaging

This prevents the table itself from carrying unrelated layout responsibilities.

## Error Handling And Empty States

Overview and detail states should be visually differentiated instead of sharing one generic empty surface.

### Overview Empty State

When there are no payroll sheets:

- show a full welcome-style empty state on the overview page
- keep the primary "create payroll sheet" action prominent
- avoid presenting the user with an editing shell that has nothing to edit

### Detail Loading And Error States

- Detail loading should preserve the page structure while the content area shows a loading panel or skeleton surface.
- Error and notice states should appear in stable positions near the page header or toolbar, not as floating interruptions.
- Save and mutation errors should continue to reuse the current store-driven feedback model.

## React And Performance Considerations

The redesign should follow the current codebase direction and the referenced React best-practice guidance:

- continue lazy-loading dialogs and preload them on likely user intent
- keep transition-worthy view changes inside `startTransition`
- avoid defining ad hoc inline child components inside large render functions
- split page-level UI into focused components with narrow subscriptions
- avoid adding memoization by default unless profiling or the existing patterns justify it

This milestone is primarily a UI restructure, so the main performance goal is preventing the new page composition from broadening rerender scope.

## Testing And Verification

Verification for this redesign should cover both behavior and presentation-level confidence.

Functional checks:

- initial launch enters the expected overview experience
- selecting a payroll sheet enters the detail workspace
- returning to overview preserves stable app state
- creating a payroll sheet still works and leads to a usable entry point
- creating personnel still works through the existing dialog flow
- adding and removing personnel still refreshes detail correctly
- editing and saving net pay still updates records correctly

Developer checks:

- `eslint` passes
- the existing workspace store test script passes
- any new view-state logic is covered by focused tests if it is extracted into testable store logic

## Resolved Decisions

- visual direction: `Win11-inspired desktop productivity`
- information architecture: `overview home + sheet browser + dedicated detail workspace`
- state strategy: `extend existing zustand store`
- routing strategy: `explicit frontend view state, no new routing library in this milestone`
- detail layout: `keep dual-column model`
- overview entry surface: `resource-style payroll sheet cards`
- implementation priority: `layout and state semantics first, business workflows preserved`

## Implementation Notes

The implementation should begin by separating page-level layout from the current all-in-one workspace widget. This is the structural change that unlocks the rest of the redesign safely.

After the layout split:

- update visual tokens and shared primitives
- build the overview page
- build the detail shell
- adapt the existing list and table features into the new page regions
- verify the existing payroll flows end to end

The result should feel like a deliberate desktop app redesign rather than a cosmetic reskin of the current workspace.
