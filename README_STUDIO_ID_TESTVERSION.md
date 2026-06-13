# Nagelstudio App – Studio-ID Testversion

Diese Version ist für GitHub/GitHub Pages gedacht. Die App bleibt funktional vollständig, aber jedes Studio braucht eine Studio-ID.

## Steuerung über `studio-licenses.json`

Beispiel:

```json
{
  "id": "STUDIO-001",
  "name": "Beauty Nails Teststudio",
  "plan": "trial",
  "expiresAt": "2026-07-13",
  "active": true
}
```

### plan-Werte

- `trial`: Testversion bis `expiresAt`
- `full`: Vollversion ohne Ablaufdatum
- `blocked`: gesperrt

### Testzeit verlängern

In `studio-licenses.json` einfach das Datum ändern:

```json
"expiresAt": "2026-08-31"
```

### Studio auf Vollversion stellen

```json
"plan": "full",
"expiresAt": null,
"active": true
```

### Studio sperren

```json
"plan": "blocked",
"active": false
```

## Wichtig

Diese Lizenzprüfung ist clientseitig und für Tests gedacht. Auf GitHub Pages kann ein technischer Nutzer die Sperre umgehen, weil der JavaScript-Code und die Lizenzdatei öffentlich geladen werden. Für echte bezahlte Abos später Backend/Login/Zahlungsprüfung verwenden.
