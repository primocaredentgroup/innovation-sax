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
        from: "Innovation Sax <noreply@resend.dev>", // TODO: Configurare dominio verificato in produzione
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
