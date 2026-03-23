# NYSC Attendance System - Offline-First Web App

A lightweight, offline-first QR attendance web application built for NYSC (National Youth Service Corps) CDS gatherings. Designed for LGI officers to efficiently manage attendance for 500-700+ corps members, even in areas with poor internet connectivity.

## Features

### QR Code Check-In
- Camera-based QR scanning using device camera
- Manual code entry fallback for damaged/unreadable QR codes
- Automatic member registration on first scan
- Batch QR code generation for printing

### Admin Dashboard
- Real-time attendance statistics (present, absent, attendance rate)
- Searchable and filterable attendance grid
- CSV export for record-keeping
- Event management (create, close events)

### Offline-First Architecture
- **IndexedDB** local storage - all data persists without internet
- **Service Worker** for full offline functionality
- **Background sync** when internet becomes available
- **PWA installable** - works like a native app on Android

### Duplicate Prevention
- Unique compound index on `[memberId, eventId]` prevents double check-ins
- QR scan debounce prevents rapid-fire duplicate scans
- Visual feedback for duplicate attempts (yellow warning)

### Security
- PIN-based admin authentication
- Session management with 8-hour expiry
- Input sanitization (XSS prevention)
- State code validation
- Device ID tracking for audit trail

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | React 18 + TypeScript |
| Build Tool | Vite 6 |
| Local Storage | IndexedDB (via `idb` library) |
| QR Scanning | html5-qrcode (browser camera API) |
| QR Generation | qrcode (canvas-based) |
| PWA | vite-plugin-pwa + Service Worker |
| Styling | Vanilla CSS (no framework - optimized for size) |

## Folder Structure

```
web-app/
├── public/
│   ├── icons/              # PWA icons (192x192, 512x512)
│   ├── manifest.json       # PWA manifest
│   ├── sw.js              # Service worker
│   └── vite.svg           # Favicon
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── AttendanceGrid.tsx   # Filterable attendance table
│   │   ├── Header.tsx           # Navigation + online status
│   │   ├── QRGenerator.tsx      # QR code canvas renderer
│   │   ├── QRScanner.tsx        # Camera QR scanner
│   │   └── SyncStatus.tsx       # Sync status indicator
│   ├── lib/               # Core business logic
│   │   ├── auth.ts              # Authentication + session mgmt
│   │   ├── db.ts                # IndexedDB data layer
│   │   └── sync.ts              # Background sync + CSV export
│   ├── pages/             # Page-level components
│   │   ├── Dashboard.tsx        # Admin dashboard with stats
│   │   ├── EventsPage.tsx       # Event management
│   │   ├── GenerateQRPage.tsx   # Batch QR generation
│   │   ├── Login.tsx            # Admin login
│   │   ├── MembersPage.tsx      # Corps member management
│   │   └── ScanPage.tsx         # QR check-in scanner
│   ├── types/             # TypeScript interfaces
│   │   └── index.ts
│   ├── App.tsx            # Root component + routing
│   ├── App.css            # Component styles
│   ├── index.css          # Base styles + CSS variables
│   ├── main.tsx           # Entry point
│   └── vite-env.d.ts
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
└── eslint.config.js
```

## Getting Started

### Prerequisites
- Node.js 18+ (recommended: 22.x)
- npm, pnpm, or yarn

### Installation

```bash
cd web-app
npm install
```

### Development

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

### Build for Production

```bash
npm run build
```

The production build is output to `web-app/dist/`.

### Preview Production Build

```bash
npm run preview
```

## Usage Guide

### First-Time Setup

1. Open the app and log in with default credentials:
   - **Username:** `admin`
   - **PIN:** `1234`
2. Go to **Events** and create a new event (e.g., "CDS Meeting - March 2026")
3. Go to **Members** and register corps members, or use **Load Demo Members** on the scan page
4. Go to **Generate QR** to print QR codes for distribution

### Taking Attendance

1. Navigate to **Scan QR**
2. Ensure an active event is selected
3. Point device camera at member's QR code
4. Successful check-ins show green confirmation
5. Duplicate attempts show yellow warning
6. Use **Manual Entry** as fallback

### Viewing Reports

1. Navigate to **Dashboard** to see live stats
2. Use filters to view Present/Absent members
3. Search by name or state code
4. Click **Export CSV** for spreadsheet records

### Installing as PWA (Android)

1. Open the app in Chrome on Android
2. Tap the browser menu (three dots)
3. Select "Add to Home screen" or "Install app"
4. The app now works fully offline

## Security Considerations

### Current Implementation
- **PIN-based authentication**: Simple but effective for field use
- **Session management**: Auto-expiry after 8 hours of inactivity
- **Input sanitization**: All user inputs are sanitized to prevent XSS
- **Local-first data**: Attendance data stays on device until explicitly synced
- **Device ID tracking**: Each device gets a unique ID for audit trails

### Production Recommendations
- Replace PIN auth with proper JWT-based authentication
- Use HTTPS for all sync operations
- Implement rate limiting on sync endpoints
- Add data encryption at rest (IndexedDB encryption)
- Enable Content Security Policy (CSP) headers
- Implement role-based access control (RBAC)
- Add audit logging for all admin actions
- Use bcrypt or argon2 for PIN hashing instead of plaintext comparison
- Implement certificate pinning for API communication

### Data Privacy
- All attendance data is stored locally on the device
- No data is transmitted without explicit user action
- Sync queue allows review before data transmission
- CSV exports should be handled according to NYSC data policies

## Sync Architecture

```
[Device A] ──IndexedDB──> [Sync Queue] ──Online──> [Server API]
[Device B] ──IndexedDB──> [Sync Queue] ──Online──> [Server API]
                                                        │
                                                   [Central DB]
```

- Each device operates independently with its own IndexedDB
- Attendance records are marked `synced: false` when created
- When internet is available, records are synced to the server
- The sync queue retries failed operations up to 3 times
- Auto-sync runs every 30 seconds when online

## Performance Optimizations

- **Vanilla CSS**: No CSS framework overhead (~15KB total CSS)
- **Code splitting**: Vendor and QR libraries loaded separately
- **ES2020 target**: Modern JavaScript for smaller bundles
- **Tree shaking**: Only used code is included in the build
- **Lazy camera init**: Camera only activates when scanner is opened
- **Debounced QR scanning**: Prevents rapid-fire re-scans
- **Auto-refresh dashboard**: 5-second polling (no WebSocket overhead)
- **Print styles**: Optimized CSS for printing attendance sheets

## Browser Compatibility

| Browser | Supported |
|---------|-----------|
| Chrome Android 80+ | Yes |
| Samsung Internet 14+ | Yes |
| Firefox Android 90+ | Yes |
| Safari iOS 15+ | Partial (no PWA install) |
| Chrome Desktop 80+ | Yes |
| Edge 80+ | Yes |

## License

MIT
