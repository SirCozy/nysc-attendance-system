# NYSC QR Attendance System

Offline-first attendance system for large NYSC CDS gatherings.

## Features
- QR check-in at gate
- Automatic number assignment
- Duplicate prevention
- LGI attendance grid
- Fast number search
- Tap-to-mark attendance
- Auto-refresh updates
- CSV attendance export

## Architecture
Gate Tablet:
- QR scanning
- Number assignment
- Offline storage

LGI Tablet:
- Dynamic attendance grid
- Marking interface
- Export attendance records

## Stack
Python
Flask
OpenCV
pyzbar

## Use Case
Designed for NYSC CDS groups handling 500–700 members efficiently without manual attendance lists.