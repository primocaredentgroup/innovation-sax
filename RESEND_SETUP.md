# Configurazione Resend per Notifiche Email

## Variabili d'ambiente da configurare nel Dashboard Convex

Per abilitare l'invio di email di notifica quando un utente viene menzionato, configura le seguenti variabili d'ambiente nel Dashboard Convex:

### Variabili obbligatorie

1. **`RESEND_API_KEY`** (obbligatoria)
   - La tua API key di Resend
   - Ottienila dal dashboard Resend: https://resend.com/api-keys
   - Formato: `re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

2. **`APP_BASE_URL`** (obbligatoria)
   - URL base della tua applicazione per costruire i link alle note
   - Per sviluppo locale: `http://localhost:5173`
   - Per produzione: `https://your-app.vercel.app` (o il tuo dominio)

### Variabili opzionali

3. **`RESEND_WEBHOOK_SECRET`** (opzionale, consigliata)
   - Secret per validare i webhook di Resend
   - Utile per tracciare lo stato delle email (consegnate, rimbalzate, ecc.)
   - Ottienila dal dashboard Resend quando configuri il webhook

4. **`RESEND_TEST_MODE`** (opzionale)
   - Imposta a `"true"` per limitare gli invii solo a indirizzi email di test Resend
   - Utile durante lo sviluppo
   - Default: `false` (produzione)

## Configurazione Webhook (opzionale ma consigliato)

Per tracciare lo stato delle email (consegnate, rimbalzate, aperte, ecc.):

1. Vai al Dashboard Convex e trova l'URL del tuo progetto
2. Il webhook sarà disponibile a: `https://[your-project].convex.site/resend-webhook`
3. Nel dashboard Resend:
   - Vai a Settings → Webhooks
   - Crea un nuovo webhook con l'URL sopra
   - Abilita tutti gli eventi `email.*`
   - Copia il webhook secret e impostalo come `RESEND_WEBHOOK_SECRET`

## Configurazione dominio email (produzione)

Per inviare email da un dominio personalizzato:

1. Nel dashboard Resend, vai a Domains
2. Aggiungi e verifica il tuo dominio
3. Aggiorna il campo `from` in `convex/emails.ts`:
   ```typescript
   from: "Innovation Sax <noreply@yourdomain.com>"
   ```

## Test

Per testare l'invio email:

1. Assicurati che `RESEND_TEST_MODE` sia impostato a `"true"` durante lo sviluppo
2. Usa un indirizzo email di test Resend (es. `delivered@resend.dev`)
3. Crea una nota menzionando un utente con quell'email
4. Verifica che l'email venga ricevuta

## Note

- Le email vengono inviate solo se l'utente menzionato ha un'email nel database
- Le email vengono inviate in modo asincrono per non rallentare la creazione/aggiornamento delle note
- Il link include il parametro `highlightedNote` che evidenzia automaticamente la nota quando viene aperto
