# AI-Enabled Self-Service Prototype

This repository hosts a lightweight Express-based prototype demonstrating an AI self-service platform for bank branches and contact centers.

## Features
- Simulates a voice-touch kiosk with quick actions, authentication, multilingual hints, and accessible UI controls.
- Provides a contact center voice bot view that logs simulated calls, keeps a transcript, and escalates to a human agent with context.
- Mock core banking endpoints (/api/dialog, /api/transaction, /api/auth, /api/escalate, /api/core/logs) illustrate secure integration points.
- Front-end uses Web Speech API for voice input/output, while the backend holds sample customer profiles and ledger logs.

## Getting started
1. Install dependencies: 
pm install
2. Run the server: 
pm start
3. Open http://localhost:3413 in a modern browser to explore the kiosk and contact center sections.

## Extending the prototype
- Replace the mock dialog logic with Gen-AI prompts or connect it to a cloud language endpoint.
- Add real authentication integration by replacing /api/auth with the bank's auth hub (MFA, voice biometrics).
- Wire /api/transaction to actual core banking services and include compliance logging for each step.
- Improve accessibility by swapping the CSS with the bank's design tokens and adding focus states for all interactive elements.
