# ODT - Online Design Tool

A web-based CASE (Computer-Aided Software Engineering) application for creating UML diagrams using the 4+1 architectural view model.

ODT helps software engineering students and teams move from architecture idea to model, validate UML quality, and generate starter code from class diagrams.

## What This Project Is

ODT is a React + TypeScript single-page app with:
- Secure authentication using Supabase Auth
- Guest mode with local browser storage
- Project-based diagram workspaces
- 4+1 architecture view support per project
- Architecture templates that pre-seed diagrams
- UML validation rules with actionable errors/warnings
- Java and C++ code generation from class diagrams
- Diagram export to PNG/SVG (plus cloud export for signed-in users)

The app targets practical architecture/design workflow:
1. Create a project and choose an architecture style
2. Automatically get 5 diagrams (Scenario, Logical, Development, Process, Physical)
3. Model with UML-like elements and relationships
4. Validate modeling consistency
5. Export or generate starter code

## Core Concepts

### 1) 4+1 Views Built Into Every Project

For each project, ODT manages these views:
- Scenario view
- Logical view
- Development view
- Process view
- Physical view

Each view is represented by a diagram with a default UML type. This keeps architecture work structured instead of dumping everything into one canvas.

### 2) Architecture-Aware Templates

When creating a project, users can choose:
- MVC
- Layered
- Client-Server
- Pipe & Filter
- SOA / Microservices
- Component-Based
- Custom

Template choice affects:
- Which diagrams are created
- Which palette tools appear per view
- Optional seed elements/connectors inserted into each diagram

### 3) Dual Storage Strategy (Cloud + Local)

ODT supports two data modes:
- Authenticated mode: Supabase database + storage
- Guest mode: localStorage in the browser

This allows instant try-out without login while still supporting persistent cloud-backed projects for signed-in users.

### 4) Diagram as Structured Data

Canvas content is normalized into:
- Elements
- Connectors
- Attributes (for class boxes)
- Methods (for class boxes)

This is why validation, code generation, and export features can work reliably.

## Key Features

### Project and Workspace Management
- Create/delete projects
- Architecture style tagging
- Dashboard cards with small preview visualizations
- Per-project 4+1 diagram set

### Diagram Editing
- Add UML elements from palette
- Place/move elements on SVG canvas with snap behavior
- Draw connectors (association, inheritance, dependency, etc.)
- Select and edit element/connector properties
- Keyboard support for delete/escape
- Zoom and pan canvas

### UML Validation
Validation engine checks:
- Generic diagram quality (missing labels, orphan elements, invalid connectors)
- Class diagram constraints (visibility, attribute/method naming, inheritance rules)
- Use case constraints (actor/use case connectivity, include/extend validity)

Validation output includes:
- Severity (error/warning/info)
- Rule IDs
- Optional element targeting (Locate action)

### Code Generation
From class-box elements and relations:
- Java class stubs
- C++ class/interface-like stubs
- Visibility mapping
- Basic inheritance realization
- Download or copy generated code

### Export
- Export canvas as PNG or SVG
- Authenticated users also upload export files to Supabase Storage
- Export metadata saved in exports table

## Tech Stack

### Frontend
- React 19
- TypeScript 5
- Vite 6
- React Router 7
- UUID

### Backend/Platform
- Supabase Auth
- Supabase Postgres
- Supabase Storage
- Row Level Security (RLS)

## Runtime Behavior

### Auth Flow
- App bootstraps AuthProvider and checks Supabase session
- If no session, can continue in guest mode
- Protected routes allow either authenticated or guest users
- Sign out clears auth state and guest flag

### Auto-Save Behavior
In editor:
- Changes to elements/connectors trigger delayed save (~1.5s)
- Manual save button also available
- Save target depends on mode:
  - Guest -> localStorage
  - Auth -> Supabase

### View Switching
Switching between Scenario/Logical/Development/Process/Physical:
- Saves current diagram first
- Loads matching diagram data for selected view
- Resets transient selection/connect state

## Data Model Overview (Supabase)

Main tables:
- users
- projects
- project_members
- diagrams
- elements
- attributes
- methods
- connectors
- exports
- validation_logs

Highlights:
- Strict CHECK constraints for architecture styles, UML/view/relation/element enums
- RLS policies across domain tables
- Cascading relationships for cleanup
- Trigger to auto-create public.users entry on auth.users insert
- Helper function user_owns_diagram(...) for deep policy checks

Schema file is located at: supabase/schema.sql

## Repository Structure

Top-level:
- src/: React app
- supabase/: SQL schema
- odt_*.html: design/prototype screens (reference artifacts)

Inside src:
- components/: editor and panel UI components
- hooks/: auth provider and hook
- lib/: templates, data layer, validation, code generation
- pages/: Login, Signup, Dashboard, Editor
- styles/: design system + page-specific CSS
- types.ts: domain models and enums

## Important Source Modules

- src/lib/architectureTemplates.ts
  - Maps architecture style to 4+1 view templates and allowed tools.

- src/lib/templateSeeds.ts
  - Provides starter elements/connectors per architecture + view.

- src/lib/validationEngine.ts
  - UML quality checks and rules.

- src/lib/codeGenerator.ts
  - Java/C++ code generation from class diagrams.

- src/lib/supabaseData.ts
  - Centralized database and storage operations.

- src/pages/Dashboard.tsx
  - Project list, create/delete flow, template project initialization.

- src/pages/Editor.tsx
  - Main editor orchestration, autosave, view switching, panel wiring.

## Environment Variables

Create a .env file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

These are required for authentication and cloud persistence.

## Scripts

From package.json:
- npm run dev -> Start Vite development server
- npm run build -> Type-check and create production build
- npm run preview -> Preview production build locally

## Prerequisites

- Node.js 18+ (recommended: latest LTS)
- npm 9+
- Supabase project (for auth/cloud mode)

## How To Set Up Supabase

1. Create a Supabase project.
2. Open SQL Editor in Supabase.
3. Run the SQL in supabase/schema.sql.
4. In Supabase Storage, create bucket:
   - diagram-exports
5. (Optional but recommended) Configure bucket access policies according to your deployment needs.
6. Copy Project URL and anon key into .env.

## Clone and Run (Start Here If You Just Want To Launch)

1. Clone the repository:

```bash
git clone <your-repo-url>
cd CEP-SDA
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment variables:

- Create .env in the root
- Add:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run development server:

```bash
npm run dev
```

5. Open browser:

- Vite default in this project is port 5173
- URL: http://localhost:5173

## Build for Production

```bash
npm run build
npm run preview
```

## Notes

- Guest mode works without Supabase login, but data is browser-local only.
- For full cloud persistence and export tracking, use authenticated mode.
- The repository includes UI prototype HTML files (odt_*.html) that document design direction; the React app in src is the production implementation.
