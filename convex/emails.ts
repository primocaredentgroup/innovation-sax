"use node";

import { components, internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { Resend } from "@convex-dev/resend";
import { v } from "convex/values";

// Inizializza il componente Resend
// testMode può essere configurato tramite variabile d'ambiente RESEND_TEST_MODE
// Per default è false (produzione). Impostare a "true" per limitare invii a indirizzi test
export const resend: Resend = new Resend(components.resend, {
  testMode: process.env.RESEND_TEST_MODE === "true",
});

/**
 * Ottiene l'indirizzo email del mittente configurato
 * Usa RESEND_FROM_EMAIL se disponibile, altrimenti usa l'indirizzo di produzione di default
 */
function getFromEmail(): string {
  const emailAddress = process.env.RESEND_FROM_EMAIL || "noreply@primogroup.it";
  return `Innovation Sax <${emailAddress}>`;
}

/**
 * Genera il template HTML per l'email di notifica menzione
 */
function generateMentionEmailTemplate(
  mentionedUserName: string,
  authorName: string,
  keyDevTitle: string,
  notePreview: string,
  noteUrl: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sei stato menzionato</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <h1 style="color: #1f2937; margin-top: 0; font-size: 24px;">Ciao ${mentionedUserName},</h1>
    
    <p style="color: #4b5563; font-size: 16px; margin-bottom: 20px;">
      <strong>${authorName}</strong> ti ha menzionato in una nota su <strong>${keyDevTitle}</strong>.
    </p>
    
    <div style="background-color: #f3f4f6; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: #374151; font-style: italic;">
        "${notePreview}"
      </p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${noteUrl}" 
         style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Vai alla nota
      </a>
    </div>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <p style="color: #6b7280; font-size: 14px; margin: 0;">
      Ricevi questa email perché sei stato menzionato in una nota. 
      Clicca sul pulsante sopra per visualizzare la nota completa.
    </p>
  </div>
  
  <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
    <p>Questa è una notifica automatica. Non rispondere a questa email.</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Invia una notifica email quando un utente viene menzionato in una nota
 */
export const sendMentionNotification = internalAction({
  args: {
    noteId: v.id("notes"),
    mentionedUserId: v.id("users"),
    keyDevId: v.id("keydevs"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log(`[sendMentionNotification] Inizio invio email per nota ${args.noteId}, utente ${args.mentionedUserId}`)
    
    // Recupera i dati necessari tramite query interne
    const noteData = await ctx.runQuery(internal.emailsQueries.getNoteWithContext, {
      noteId: args.noteId,
      keyDevId: args.keyDevId,
      mentionedUserId: args.mentionedUserId,
    });

    if (!noteData) {
      console.error(`[sendMentionNotification] Dati nota non trovati per nota ${args.noteId}`);
      return null;
    }
    
    console.log(`[sendMentionNotification] Dati recuperati: nota=${noteData.note._id}, utente=${noteData.mentionedUser.name}, email=${noteData.mentionedUser.email || 'N/A'}`)

    const { note, keyDev, author, mentionedUser } = noteData;

    // Verifica che l'utente menzionato abbia un'email
    if (!mentionedUser.email) {
      console.log(
        `[sendMentionNotification] Utente ${mentionedUser.name} non ha un'email, skip invio notifica`
      );
      return null;
    }

    // Costruisci l'URL della nota
    const baseUrl =
      process.env.APP_BASE_URL || "http://localhost:5173";
    const noteUrl = `${baseUrl}/keydevs/${keyDev.readableId}/notes?highlightedNote=${note._id}`;

    console.log(`[sendMentionNotification] URL nota: ${noteUrl}`)

    // Genera anteprima del testo (primi 200 caratteri)
    const notePreview =
      note.body.length > 200
        ? note.body.substring(0, 200) + "..."
        : note.body;

    // Genera il template HTML
    const html = generateMentionEmailTemplate(
      mentionedUser.name,
      author.name,
      keyDev.title,
      notePreview,
      noteUrl
    );

    // Invia l'email
    try {
      console.log(`[sendMentionNotification] Tentativo invio email a ${mentionedUser.email}`)
      await resend.sendEmail(ctx, {
        from: getFromEmail(),
        to: mentionedUser.email,
        subject: `${author.name} ti ha menzionato in una nota su ${keyDev.title}`,
        html,
      });
      console.log(
        `[sendMentionNotification] ✅ Email di notifica inviata con successo a ${mentionedUser.email} per nota ${note._id}`
      );
    } catch (error) {
      console.error(
        `[sendMentionNotification] ❌ Errore nell'invio email a ${mentionedUser.email}:`,
        error
      );
      // Rilancia l'errore per vedere i dettagli nel dashboard
      throw error;
    }

    return null;
  },
});

/**
 * Genera il template HTML per notifica answer su KeyDev questions.
 */
function generateKeyDevQuestionAnswerTemplate(
  recipientName: string,
  senderName: string,
  keyDevTitle: string,
  questionText: string,
  answerPreview: string,
  questionsUrl: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nuova risposta alle Questions</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <h1 style="color: #1f2937; margin-top: 0; font-size: 24px;">Ciao ${recipientName},</h1>
    <p style="color: #4b5563; font-size: 16px; margin-bottom: 20px;">
      <strong>${senderName}</strong> ha inviato una risposta nella sezione Questions di <strong>${keyDevTitle}</strong>.
    </p>
    <div style="background-color: #f3f4f6; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0 0 8px 0; color: #111827;"><strong>Domanda:</strong> ${questionText}</p>
      <p style="margin: 0; color: #374151;"><strong>Risposta:</strong> "${answerPreview}"</p>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${questionsUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Apri Questions
      </a>
    </div>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    <p style="color: #6b7280; font-size: 14px; margin: 0;">
      Ricevi questa email perché sei destinatario della risposta o sei stato menzionato nel messaggio.
    </p>
  </div>
  <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
    <p>Questa è una notifica automatica. Non rispondere a questa email.</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Invia una notifica email per una nuova answer nelle KeyDev Questions.
 * Destinatari: owner/requester scelto + menzionati, senza duplicati e senza sender.
 */
export const sendKeyDevQuestionAnswerNotification = internalAction({
  args: {
    answerId: v.id('keyDevQuestionAnswers')
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const data = await ctx.runQuery(internal.emailsQueries.getKeyDevQuestionAnswerContext, {
      answerId: args.answerId
    })
    if (!data) {
      return null
    }

    const recipientMap = new Map<string, { _id: string; name: string; email: string }>()
    const senderId = data.sender._id

    if (data.primaryRecipient?.email && data.primaryRecipient._id !== senderId) {
      recipientMap.set(data.primaryRecipient._id, {
        _id: data.primaryRecipient._id,
        name: data.primaryRecipient.name,
        email: data.primaryRecipient.email
      })
    }

    for (const mentioned of data.mentionedUsers) {
      if (!mentioned.email) continue
      if (mentioned._id === senderId) continue
      recipientMap.set(mentioned._id, {
        _id: mentioned._id,
        name: mentioned.name,
        email: mentioned.email
      })
    }

    const recipients = Array.from(recipientMap.values())
    if (recipients.length === 0) {
      console.log(`[sendKeyDevQuestionAnswerNotification] Nessun destinatario valido per answer ${args.answerId}`)
      return null
    }

    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5173'
    const questionsUrl = `${baseUrl}/keydevs/${data.keyDev.readableId}/questions`
    const answerPreview =
      data.answer.body.length > 200 ? `${data.answer.body.substring(0, 200)}...` : data.answer.body

    for (const recipient of recipients) {
      const html = generateKeyDevQuestionAnswerTemplate(
        recipient.name,
        data.sender.name,
        data.keyDev.title,
        data.question.text,
        answerPreview,
        questionsUrl
      )

      await resend.sendEmail(ctx, {
        from: getFromEmail(),
        to: recipient.email,
        subject: `${data.sender.name} ha risposto su ${data.keyDev.title}`,
        html
      })
    }

    return null
  }
});

/**
 * Genera il template HTML per l'email reminder settimanale agli owner
 */
function generateWeeklyReminderTemplate(
  ownerName: string,
  coreAppName: string,
  coreAppSlug: string,
  baseUrl: string
): string {
  const createUpdateUrl = `${baseUrl}/core-apps/${coreAppSlug}/updates/new`;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reminder Aggiornamento Settimanale</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <h1 style="color: #1f2937; margin-top: 0; font-size: 24px;">Ciao ${ownerName},</h1>
    
    <p style="color: #4b5563; font-size: 16px; margin-bottom: 20px;">
      È venerdì! È tempo di creare l'aggiornamento settimanale per <strong>${coreAppName}</strong>.
    </p>
    
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: #92400e;">
        📹 Ricorda di registrare un video Loom per mostrare i progressi della settimana ai tuoi colleghi.
      </p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${createUpdateUrl}" 
         style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Crea Aggiornamento
      </a>
    </div>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <p style="color: #6b7280; font-size: 14px; margin: 0;">
      Ricevi questa email perché sei l'owner di ${coreAppName}.
    </p>
  </div>
  
  <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
    <p>Questa è una notifica automatica. Non rispondere a questa email.</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Genera il template HTML per l'email di notifica nuovo update ai subscribers
 */
function generateNewUpdateNotificationTemplate(
  subscriberName: string,
  coreAppName: string,
  updateTitle: string,
  coreAppUrl: string,
  loomUrl: string | undefined
): string {
  const loomButton = loomUrl ? `
    <div style="text-align: center; margin: 20px 0;">
      <a href="${loomUrl}" 
         style="display: inline-block; background-color: #8b5cf6; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 16px;">
        🎬 Guarda il Video Loom
      </a>
    </div>
  ` : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nuovo Aggiornamento</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <h1 style="color: #1f2937; margin-top: 0; font-size: 24px;">Ciao ${subscriberName},</h1>
    
    <p style="color: #4b5563; font-size: 16px; margin-bottom: 20px;">
      È stato pubblicato un nuovo aggiornamento per <strong>${coreAppName}</strong>:
    </p>
    
    <div style="background-color: #f3f4f6; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: #374151; font-weight: 600;">
        ${updateTitle}
      </p>
    </div>
    
    ${loomButton}
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${coreAppUrl}" 
         style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Vai alla Core App
      </a>
    </div>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <p style="color: #6b7280; font-size: 14px; margin: 0;">
      Ricevi questa email perché sei iscritto agli aggiornamenti di ${coreAppName}.
    </p>
  </div>
  
  <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
    <p>Questa è una notifica automatica. Non rispondere a questa email.</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Invia reminder settimanale agli owner di CoreApps con status InProgress
 * Chiamata dal cron job ogni venerdì alle 14:00 CET
 */
export const sendWeeklyReminder = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    console.log("[sendWeeklyReminder] Inizio invio reminder settimanali");
    
    const baseUrl = process.env.APP_BASE_URL || "http://localhost:5173";
    
    // Recupera tutti gli owner di CoreApps InProgress
    const ownersData = await ctx.runQuery(internal.emailsQueries.getOwnersOfInProgressApps, {});
    
    console.log(`[sendWeeklyReminder] Trovati ${ownersData.length} owner da notificare`);
    
    for (const { owner, coreApp } of ownersData) {
      if (!owner.email) {
        console.log(`[sendWeeklyReminder] Owner ${owner.name} non ha email, skip`);
        continue;
      }
      
      const html = generateWeeklyReminderTemplate(
        owner.name,
        coreApp.name,
        coreApp.slug,
        baseUrl
      );
      
      try {
        await resend.sendEmail(ctx, {
          from: getFromEmail(),
          to: owner.email,
          subject: `📹 Reminder: Aggiornamento settimanale per ${coreApp.name}`,
          html,
        });
        console.log(`[sendWeeklyReminder] ✅ Reminder inviato a ${owner.email} per ${coreApp.name}`);
      } catch (error) {
        console.error(`[sendWeeklyReminder] ❌ Errore invio a ${owner.email}:`, error);
      }
    }
    
    console.log("[sendWeeklyReminder] Completato");
    return null;
  },
});

/**
 * Invia notifica ai subscribers quando viene creato un nuovo update
 */
export const sendNewUpdateNotification = internalAction({
  args: {
    updateId: v.id("coreAppUpdates"),
    coreAppId: v.id("coreApps"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log(`[sendNewUpdateNotification] Inizio invio notifiche per update ${args.updateId}`);
    
    const baseUrl = process.env.APP_BASE_URL || "http://localhost:5173";
    
    // Recupera i dati della CoreApp con subscribers
    const data = await ctx.runQuery(internal.emailsQueries.getCoreAppWithSubscribers, {
      coreAppId: args.coreAppId,
      updateId: args.updateId,
    });
    
    if (!data) {
      console.error(`[sendNewUpdateNotification] Dati non trovati per CoreApp ${args.coreAppId}`);
      return null;
    }
    
    const { coreApp, update, subscribers } = data;
    
    console.log(`[sendNewUpdateNotification] Trovati ${subscribers.length} subscribers per ${coreApp.name}`);
    
    const coreAppUrl = `${baseUrl}/core-apps/${coreApp.slug}`;
    
    for (const subscriber of subscribers) {
      if (!subscriber.email) {
        console.log(`[sendNewUpdateNotification] Subscriber ${subscriber.name} non ha email, skip`);
        continue;
      }
      
      const html = generateNewUpdateNotificationTemplate(
        subscriber.name,
        coreApp.name,
        update.title || `Aggiornamento ${update.weekRef}`,
        coreAppUrl,
        update.loomUrl
      );
      
      try {
        await resend.sendEmail(ctx, {
          from: getFromEmail(),
          to: subscriber.email,
          subject: `🆕 Nuovo aggiornamento per ${coreApp.name}`,
          html,
        });
        console.log(`[sendNewUpdateNotification] ✅ Notifica inviata a ${subscriber.email}`);
      } catch (error) {
        console.error(`[sendNewUpdateNotification] ❌ Errore invio a ${subscriber.email}:`, error);
      }
    }
    
    console.log("[sendNewUpdateNotification] Completato");
    return null;
  },
});
