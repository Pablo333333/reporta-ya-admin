# Reporta Ya — Admin panel

Web console for operators and supervisors of **Reporta Ya**. Citizens file incidents in the mobile app. This panel is where a territory **sees, prioritizes, resolves, and configures** those incidents.

The backend owns the rules (statuses, risk score, SLA, points, tenant isolation). This app applies them in the daily workflow.

## Who signs in

| Role | Workspace |
| --- | --- |
| **RESPONSABLE** | Operations: map, report board, statistics, announcements, audit. |
| **SUPERVISOR** | The same operations, plus the configurator (system rules, message templates, form builder, statuses, priorities, roles). |

Citizens do not use this panel. A supervisor can switch the active territory; requests are sent with that territory so one console can operate more than one area.

## Operations

### Incident map

Open cases are plotted on the map. Markers, a heatmap, and risk zones show where problems cluster. The risk score comes from the API: severity of the priority weighted against how often the same zone and category are still open. Operators use it to decide where to go first.

### Reports

Three views of the same queue:

- **Table**, filterable by status, category, and text.
- **Kanban**, one column per status, so a case moves Pendiente → En Proceso → Solucionado (or Reabierto).
- **Map**, the same selection in place.

Opening a case shows photo, voice transcription, location, zone, extra fields, and the status history. Changing status is restricted to operators and supervisors of that territory. If the target status requires evidence, a resolution photo must be attached or the API rejects the change.

Marking a case solved does not close the loop by itself. The citizen is asked to confirm. If they reject it, the case returns to Pendiente and shows up in the queue again. The history distinguishes an operator update from a citizen reopening.

Cases that passed the SLA limit are flagged so the board can surface work that has been open too long (default 48 hours).

### Statistics

KPIs for a date range (default last 30 days):

- Counts by status (pending, in progress, solved, reopened).
- Time-to-resolution: average, median, and 90th percentile, measured until the last final status after the latest reopening.
- Volume by category and by zone, including an average priority level per zone.
- A matrix of problem type by zone.
- Daily trend.
- Operator ranking: cases closed, reopenings attributed to them, and average hours to close.

### Announcements

Operators publish a message to everyone in the territory. It can name a zone, a map point, a radius, and how long a restriction lasts (for example a road closure). Publishing notifies devices that registered a push token. Supervisors read the feed; creating an announcement is an operator action.

### Audit

Supervisors and operators can review the action log: who changed a report, a category, a status rule, a role, or a system setting, and when.

## Configurator (supervisor)

These screens change behavior for the territory without a code change.

| Screen | Business effect |
| --- | --- |
| **System** | App name and branding, risk weights, critical-event threshold and time window, points for creating a report and for confirming a fix, SLA hours, and whether AI classification is on. |
| **Automatic messages** | Templates for new reports, critical events, high priority, announcements, citizen validation, and SLA breaches. Placeholders such as zone, category, and hours are filled when the notice is sent. |
| **Form builder** | Categories citizens can pick, plus extra fields (text, number, yes/no), some required. A report stores the answers with the case. |
| **Statuses** | Name, color, order, whether the status is final, and whether a photo is mandatory to enter it. |
| **Priorities** | Name, color, and numeric level. Level 3 and above is treated as urgent. The level is the severity input of the risk score. |
| **Roles and permissions** | Which capabilities each role has. Only a supervisor can change the assignment. |

## What this panel does not decide

Points, critical-event detection, SLA flagging, citizen validation, and the risk formula all run on the API. The panel displays the result and sends the operator’s decision (new status, evidence, announcement, or a new config value).
