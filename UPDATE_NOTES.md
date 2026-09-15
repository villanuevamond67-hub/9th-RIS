# RIS 6.0 — Patient Dashboard update

`RIS_2.0_PATIENT_DASHBOARD.html` is now the **home page / hub** of the
package. Open it first — it links to every other page and shows the full
patient table without needing to scroll past menus first.

- **Top navigation bar** (always visible) links straight into: + New Order,
  Medication Orders (main menu), CBG Form, Vital Signs, Diet List,
  Medication Tracker, and Medication Database. These are plain links/URL
  parameters (`?view=hgb`, `?view=vital`, `?view=tracker`, `?view=database`,
  `?view=neworder`) handled by `RIS_2.0_Reference_Print_Updated.js`, not
  pop-up windows — so it behaves like a normal multi-page site.
- **No-scroll layout**: the page itself never scrolls (header, search/sort/
  room-filter bar, and the table all fit the viewport). Only the table body
  scrolls internally, with a sticky header, if there are more patients than
  fit on screen at once.
- **Table view** of every saved patient: Patient Name, Hospital Number, Room,
  CBG Frequency (OD/TID/Q6/Q4, blank if no CBG order), and an **Acuity
  Level** dropdown (Level I–IV, nursing dependency classification).
- **Room color coding** matches the rest of RIS (901 pink, 902 white, 903
  blue, 904 orange, 905 green, 906 yellow) as a left-border accent and a
  colored room badge; a room-filter legend and a free-text search box
  (name / hospital number / room) are both available, plus sorting by Room,
  Name, Level, or CBG.
- **Click a patient's name** to jump straight into that patient's Medication
  Order Form (`RIS_2.0_Reference_Print_Updated.html?openOrder=<id>`).
- **Acuity Level** selections save automatically to the same saved patient
  record used by the rest of RIS (`acuityLevel` field).
- From any other page, click **🏠 PATIENT DASHBOARD** in the Medication Order
  Main Menu header to come back home.
- A **REFRESH** button re-pulls the latest saved patient list; the dashboard
  also refreshes automatically when the browser tab regains focus.

# RIS 6.0 — 24-row Vital Signs and Print All update

Extract the complete ZIP, then open `RIS_2.0_Reference_Print_Updated.html`.

## What changed in this update

- Patients with a saved CBG order show only an underlined **CBG** beside their
  name. Frequency (OD/TID/Q4/Q6) and strips-per-shift are not displayed here.
  The original saved CBG orders and the separate CBG form are not changed.
- Every Vital Signs sheet has **24 patient rows**, with unused rows left blank.
  Empty room pairs still produce a 24-row sheet. More than 24 patients continue
  on another 24-row sheet, accessible with Previous Sheet / Next Sheet.
- **PRINT ALL SHEETS** prints all three room pairs in one print job, including
  empty pairs and continuation sheets. Each sheet starts on a new A4 page.
- Entered vital readings are retained during room switching and printing in the
  current session. These readings are not permanently saved across page reloads.
- The **IVF** column in the Vital Signs form is now **O2Sat**.
- Patients are separated into three paired-room sheets. Use the room buttons to
  open and print one pair at a time:
  - Rooms **901 and 904**
  - Rooms **902 and 903**
  - Rooms **905 and 906**
- The hospital header, reference details, remaining Vital Signs columns and
  diagonal BP/T/P/R guides are retained. Print rules keep sheets separate.

- The **VITAL SIGN FORM** page (opened from the main menu) has been replaced with
  the official DOH-style **Vital Signs Monitoring Sheet** layout — matching the
  hospital's printed form (Reference Code HF-NRS-016, Revision 1, Date Effective
  October 14, 2024), including the hospital logo, letterhead, and the diagonal
  guide lines on the BP / T / P / R columns for handwritten multi-reading entries
  per shift.
- **Patient Name**, **Room**, and **CBG** are pulled automatically from saved
  patient records (same source as the rest of RIS), so the sheet is pre-filled
  every time it's opened or refreshed:
  - CBG indicates monitoring only beside the name. Patients without a saved
    CBG order show no CBG line.
  - BP, T, P, R, O2Sat, PO/NGT, UO and BM remain blank, editable cells for staff
    to fill in by hand or on-screen each shift, same as the printed original.
- **PRINT CURRENT ROOM SHEET** prints the selected room pair, including any
  continuation sheets, with the same date, shift and prepared-by details.
- **REFRESH PATIENTS** re-pulls the latest saved patient list, room, and CBG
  values without leaving the page.

## Previous changes (carried over)

- Medical Supplies Inventory has been removed from the main menu and the package, including its RIS patient connection code.
- RIS, Kardex and Diet List retain the teal screen theme and existing official print layouts.
- Main-menu room sections are color-coded: 901 pink, 902 white, 903 blue, 904 orange, 905 green and 906 yellow.
- Compliance controls and labels are removed. **Print All** includes every saved medication order, grouped by room.
- Previous/Next Patient in RIS and Kardex follows the saved patient order, without alphabetical sorting.
- The separate **Medication Tracker** button opens a panel showing each medication's total Quantity, recorded doses and number of saved patients. Click a medication to see its patients, then click a patient to open that medication order.

## Medication tracker scope

Totals use all saved medication orders, including orders outside the current search results. They update when the main menu is opened or refreshed. Medication names are grouped without regard to letter case. Quantity is the entered item count; it is not a dose calculation, stock-on-hand balance, usage history or monetary total. The Dose(s) column identifies the different recorded doses included in each medication total.

## Verification

JavaScript syntax and automated function tests passed for CBG-only indicators,
24-row empty/filled/overflow sheets, room grouping, a single print-all call,
metadata/readings retained in print copies, and print cleanup. Tests use a DOM
test double; a browser executable was not available for live visual or print
preview verification. Check print preview before using it for a shift (A4,
100% scale, browser headers/footers off).
