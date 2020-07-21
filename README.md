# Tessel Climate Control

A simple controller and notifier for your climate needs. The current project is based on the Tessel 2 (T2), but was tested on a Tessel 1 until the unfortunate collission of a drill bit and the T1's micro USB port.

## Required Hardware

- Tessel (T1 and T2 both used for this project)
- climate module
- relay module
- CPU fan
- 12V power supply to feed the fan and the Vin/Gnd pin headers on Tessel 1. Power 12v to VIN header on Tessel (T1 only).
- 12V power supply to feed the fan and the 5V regulator to power the Tessel 2 (T2 or T1).

## Required Setup

- Use Node 8.x for `t1-cli`. Node 12 seems to work with `t2-cli`
- Install the `t1-cli` globally, `npm i -g tessel` or the `t2-cli` via `npm i -g t2-cli`
- Setup wifi `tessel wifi -n <ssid> -p <password>`
- Fill in the `env.json` file with credentials
- Debug the code with `t2 run index.js`
- Deploy the code `t2 push index.js`

## Gotchas

- Node 8 seemed to be the only version that allowed both `t1-cli` and `mqtt` to work even though Tessel does not appear to support Node 8 (ES6 language) features. Newer Node releases may work. All code is provided as ES6-compatible.
- The `mqtt` library is pegged on an old release
- ES5 code reduces the need for transpiling and bundling which may put exceed the user space limit of 30MB.
- MQTT reconnection logic may need more work
