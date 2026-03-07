# HealthGuard — Health Monitoring MVP

A lightweight, fully client-side health monitoring web app built with HTML, TailwindCSS, and Vanilla JavaScript.

## 📁 Project Structure

```
healthapp/
├── index.html          ← Login / Role selection
├── patient.html        ← Patient Dashboard
├── caregiver.html      ← Caregiver Dashboard
├── manifest.json       ← PWA manifest
├── sw.js               ← Service Worker (offline support)
├── js/
│   ├── storage.js      ← LocalStorage CRUD module
│   ├── location.js     ← Geolocation wrapper
│   └── reminders.js    ← Water & medicine timer logic
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

## 🚀 How to Run

1. Open `index.html` in any modern browser — no server needed.
2. For PWA install prompt (Add to Home Screen), serve over HTTP:
   ```bash
   # Python 3
   python3 -m http.server 8080
   # Then open: http://localhost:8080
   ```

## 👥 Roles

| Role      | Dashboard        | Features |
|-----------|-----------------|----------|
| Patient   | patient.html    | All health tools (water, medicine, SOS, etc.) |
| Caregiver | caregiver.html  | View all patient data, location, reports |

## ✨ Features

- **Water Reminder** — interval timer with browser alerts & notifications  
- **Medicine Reminder** — add medicine + dosage + time; auto-alerts at scheduled time  
- **Doctor Appointments** — upcoming/past appointment tracker  
- **SOS Button** — pulsing emergency button, captures GPS coords, logs to localStorage  
- **Health Reports** — drag-and-drop file upload (metadata stored in localStorage)  
- **Activity Log** — full timestamped history of all actions  
- **Caregiver Dashboard** — manage multiple patients, view all their data  
- **PWA** — installable on mobile as a native-like app  

## 🔒 Data Storage

All data is stored in `localStorage` under the `hg_*` namespace. No backend or database required.
