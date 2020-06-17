# Tessel Climate Control

A simple controller and notifier for your climate needs.

## Required Hardware

- Tessel (T1 used for this project)
- climate module
- relay module
- CPU fan
- 12V power supply to feed the fan and the Vin/Gnd pin headers on Tessel 1. Power 12v to VIN header on Tessel.

## Required Setup

- Use Node 8.x
- Install the `t1-cli` globally, `npm i -g tessel`
- Setup wifi `tessel wifi -n <ssid> -p <password>`
- Fill in the `env.json` file with credentials
- Push the code `tessel push index.js`

## Gotchas

- Node 8 seemed to be the only version that allowed both `t1-cli` and `mqtt` to work even though Tessel does not appear to support Node 8 (ES6 language) features. Newer Node releases may work. All code is provided as ES6-compatible.
- The `mqtt` library is pegged on an old release
- ES5 code reduces the need for transpiling and bundling which may put exceed the user space limit of 30MB.
- MQTT reconnection logic may need more work
