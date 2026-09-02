# AI-Invigilator — Merged Frontend

A single React + Vite application merging the two previously separate
prototypes (the marketing/student mini-apps and the admin/exam mini-apps)
into one seamless SPA, with **no visual redesign** — every page keeps its
original look exactly.

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL (typically http://localhost:5173).

To build for production:

```bash
npm run build
npm run preview
```

## Routes

| Route               | Page                         | Access                     |
|----------------------|-------------------------------|-----------------------------|
| `/`                  | Landing Page                  | Public                      |
| `/student-login`     | Student Login                 | Public                      |
| `/register`          | Student Registration          | Public                      |
| `/student-dashboard` | Student Dashboard             | Requires student mock login |
| `/exam`               | Active Exam Monitoring        | Requires student mock login |
| `/admin-overview`    | Admin Dashboard preview       | Public                      |
| `/admin-login`       | Admin Portal Login            | Public                      |
| `/admin-dashboard`   | Admin Dashboard (post-login)  | Requires admin mock login   |

## Mock authentication

There is no real backend. `src/services/authService.js` simulates
registration/login using `sessionStorage`/`localStorage`:

- A demo student account is seeded automatically:
  **email:** `student@university.edu` · **password:** `password123`
- Any new account created via **Register** can be used to log in
  immediately afterwards.
- Admin Login accepts any non-empty Administrator ID + password.

## Why two visual "themes" exist internally

The original prototypes used two related but distinct Tailwind design
systems (different fonts, spacing scale and color values under the same
token names — e.g. `primary`, `p-lg`). To merge them into one Tailwind
config **without altering either page's appearance**, every conflicting
token is resolved through a CSS variable (see `src/index.css`):

- `:root` / `.theme-classic` — Poppins + bright-blue palette, used by the
  Landing, Student Login, Register and Student Dashboard pages.
- `.theme-admin` — Inter + Material-3-style palette, used by the Admin
  Login, Admin Overview and Active Exam Monitoring pages.

No component markup or class names were changed to make this work — only
the token values feeding those classes are scoped per page wrapper.

## Project structure

```
src/
  pages/        One file per route (Landing, StudentLogin, Register,
                 StudentDashboard, ActiveExam, AdminLogin, AdminOverview)
  components/    Shared/reusable components (route guards)
  context/       AuthContext (mock student/admin session state)
  hooks/         useAuth hook
  services/      authService.js (mock login/register)
  utils/         mockMonitoring.js (AI proctoring event data for /exam)
  index.css      Tailwind + dual design-token themes
  App.jsx        Route definitions
  main.jsx       App entry point (BrowserRouter)
```
