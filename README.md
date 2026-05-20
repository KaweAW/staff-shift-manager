# Staff Shift Manager

> **Advanced Shift Scheduling & Management Control System for Bars and Restaurants.**

Staff Shift Manager is a mobile-first Web/PWA (Progressive Web App) designed to streamline, automate, and track employee shift scheduling. Built specifically for on-the-go management, it offers a native-app-like user experience, real-time labor cost tracking, and an intelligent dispatch engine.

---

### Project Status Notice
> **Current Phase:** This application is currently undergoing active enhancements, including the implementation of full multilingual/localization support. Despite these ongoing developments, the system is **completely operational, production-ready, and fully stable** for daily management tasks.

---

## Key Features

* **Dynamic Shift Board:** Features a continuous horizontal scroll layout (180-day timeline) with live calculations of scheduled hours and real-time labor costs (Budgeting).
* **"Consigliere" Smart Assigner:** A rule-based decision engine that prevents human error during scheduling. It automatically ranks staff by shift equality while excluding employees on leave, overlapping shifts, or those violating the legal 8-hour rest window.
* **WhatsApp Export Engine:** A headless graphic generator that compiles daily schedules into an elegant, high-resolution PNG. It formats the data perfectly for smartphone screens and hides sensitive financial metrics before sharing with the staff group.
* **Exceptions & Recurrences Engine:** Advanced handling of employee unavailability (ND). Supports single-block vacation periods as well as granular recurring rules (e.g., "Every Sunday from 10:00 AM to 3:00 PM until the end of August").
* **Audit Log (Black Box):** An immutable, time-stamped ledger tracking every insertion, update, or deletion, recording exactly which Manager executed the change.
* **Custom Authentication with "Ghost Admin":** Secure login system featuring client-side hashing, a dynamic first-access password setup, and support for hidden maintenance accounts.

---

## Technology Stack

The application relies on a modern, serverless **JAMstack** architecture:

* **Frontend Framework:** `React 18` + `TypeScript` + `Vite`
* **Styling:** `Tailwind CSS v4` (utilizing the native `oklch` color space and utility-first paradigm)
* **Database & Backend:** `Supabase` (PostgreSQL)
* **Data & Time Management:** `date-fns` for strict ISO 8601 timezone normalization and date arithmetic
* **Graphics & Export:** `modern-screenshot` (fully compatible with modern CSS) for seamless DOM-to-PNG rendering
* **Iconography:** `Lucide React`
* **Hosting & CI/CD:** `Netlify`

---

## Deep Dive: Core Engine Architecture

### 1. The "Consigliere" Smart Assigner (`useTurni.ts`)
Whenever the "New Shift" modal opens, the system runs a 3-phase algorithmic evaluation in real time:
1. **Absolute Exclusion (Blocking):** Intersects the proposed timeframe with the `non_disponibilita` table and concurrent shifts. Overlapping candidates are immediately disabled.
2. **Safety Compliance (Fatigue Check):** Calculates the exact hours between the end of the candidate's last recorded shift and the start of the new one. If the break is under 8 hours, the user receives an alert tag.
3. **Equality Ranking:** Sums up the decimal hours worked by each employee over the last 3 weeks and sorts the eligible list in ascending order, prioritizing under-scheduled staff.

### 2. WhatsApp Export Engine (`Dashboard.tsx`)
To prevent raw admin panel screenshots from being sent to staff, the app targets a hidden template container positioned safely off-screen (`-left-2499.75`).
* This element bundles shifts by employee chronologically, merging split shifts natively (e.g., `10:00-14:00` / `18:00-22:00`) on a single item.
* The renderer takes this snapshot at a `2.5x` scale ratio, producing pixel-perfect images on high-DPI mobile screens while filtering out internal budget data.

### 3. Client-Side Hashing (`AuthContext.tsx`)
To maintain complete modular autonomy and hide maintenance routines, authentication is decoupled into a custom `utenti_titolari` table.
* Plain-text passwords never touch the network. They are converted into **SHA-256** string digests locally via `crypto.subtle` before posting to Supabase.
* Persistence is handled via `localStorage` JWT token keys to handle instant session keep-alives upon app launch.

---

## Database Schema (PostgreSQL / Supabase)

Referential integrity is strictly enforced via foreign keys using `ON DELETE CASCADE`.

| Table | Primary Key | Foreign Keys | Key Fields |
|---|---|---|---|
| **`utenti_titolari`** | `id_titolare` | - | `email`, `password_hash`, `nome`, `password_configurata`, `invisibile` |
| **`camerieri`** | `id_cameriere` | - | `nome`, `cognome`, `tariffa_oraria`, `sesso`, `telefono`, `note` |
| **`turni_pianificati`** | `id_turno` | `id_cameriere` | `data_ora_inizio`, `data_ora_fine` (TIMESTAMPTZ) |
| **`non_disponibilita`** | `id_blocco` | `id_cameriere` | `data_ora_inizio`, `data_ora_fine`, `tipo_ricorrenza`, `id_gruppo_ricorrenza` |
| **`audit_log`** | `id_log` | `id_titolare` | `azione`, `descrizione`, `data_ora` |

> **Security Note:** Row Level Security (RLS) is enabled globally across all tables, authorizing public client API key payloads while enforcing validation boundaries through our custom encryption layers.

---

## Local Setup & Installation

### Prerequisites
* **Node.js** (v18 or higher)
* An active **Supabase** instance

### Setup Steps

1. **Clone the repository:**
   ```bash
   git clone <repository-url>

2. **Install core dependencies:**
   ```bash
   npm install

3. **Create a .env file in the project root directory:**
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_public_anon_key

4. **Launch Local Development Server:**
   ```bash
   npm run dev