import * as Brevo from "@getbrevo/brevo";

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const APP_URL = process.env.APP_URL || "http://localhost:3000";
const SENDER_EMAIL = process.env.SENDER_EMAIL || "noreply@coachylearning.com";
const SENDER_NAME = process.env.SENDER_NAME || "CoachyLearning";

// Initialize Brevo API client
let apiInstance: Brevo.TransactionalEmailsApi | null = null;

function getApiInstance(): Brevo.TransactionalEmailsApi {
    if (!apiInstance) {
        if (!BREVO_API_KEY) {
            throw new Error("BREVO_API_KEY is not configured");
        }
        apiInstance = new Brevo.TransactionalEmailsApi();
        apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, BREVO_API_KEY);
    }
    return apiInstance;
}

/**
 * Send a password reset email to the user
 */
export async function sendPasswordResetEmail(
    to: string,
    resetLink: string,
    userName: string
): Promise<boolean> {
    // In development without API key, log to console
    if (!BREVO_API_KEY) {
        console.log("=".repeat(60));
        console.log("📧 PASSWORD RESET EMAIL (DEV MODE - No Brevo API Key)");
        console.log("=".repeat(60));
        console.log(`To: ${to}`);
        console.log(`Name: ${userName}`);
        console.log(`Reset Link: ${resetLink}`);
        console.log("=".repeat(60));
        return true;
    }

    try {
        const api = getApiInstance();

        const sendSmtpEmail = new Brevo.SendSmtpEmail();
        sendSmtpEmail.sender = { email: SENDER_EMAIL, name: SENDER_NAME };
        sendSmtpEmail.to = [{ email: to, name: userName }];
        sendSmtpEmail.subject = "Réinitialisation de votre mot de passe - CoachyLearning";
        sendSmtpEmail.htmlContent = generatePasswordResetEmailHtml(userName, resetLink);
        sendSmtpEmail.textContent = generatePasswordResetEmailText(userName, resetLink);

        await api.sendTransacEmail(sendSmtpEmail);
        console.log(`✅ Password reset email sent to ${to}`);
        return true;
    } catch (error) {
        console.error("❌ Failed to send password reset email:", error);
        return false;
    }
}

/**
 * Generate HTML content for the password reset email
 */
function generatePasswordResetEmailHtml(userName: string, resetLink: string): string {
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Réinitialisation de mot de passe</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(135deg, #5227ff 0%, #3b82f6 100%); border-radius: 16px 16px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">CoachyLearning</h1>
              <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Plateforme d'apprentissage en ligne</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 22px; font-weight: 600;">
                Réinitialisation de mot de passe
              </h2>
              
              <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                Bonjour <strong>${userName}</strong>,
              </p>
              
              <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour en créer un nouveau :
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${resetLink}" 
                       style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #5227ff 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 14px rgba(82, 39, 255, 0.4);">
                      Réinitialiser mon mot de passe
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                Si vous n'avez pas demandé cette réinitialisation, ignorez simplement cet email. Votre mot de passe restera inchangé.
              </p>
              
              <p style="margin: 20px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                <strong>⏱ Ce lien expirera dans 1 heure.</strong>
              </p>
              
              <!-- Alternative Link -->
              <div style="margin-top: 30px; padding: 20px; background-color: #f1f5f9; border-radius: 8px;">
                <p style="margin: 0 0 10px 0; color: #64748b; font-size: 13px;">
                  Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :
                </p>
                <p style="margin: 0; word-break: break-all;">
                  <a href="${resetLink}" style="color: #5227ff; font-size: 13px;">${resetLink}</a>
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8fafc; border-radius: 0 0 16px 16px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #94a3b8; font-size: 13px; text-align: center; line-height: 1.6;">
                Cet email a été envoyé par CoachyLearning.<br>
                Si vous avez des questions, contactez notre support.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

/**
 * Generate plain text content for the password reset email
 */
function generatePasswordResetEmailText(userName: string, resetLink: string): string {
    return `
Réinitialisation de mot de passe - CoachyLearning

Bonjour ${userName},

Vous avez demandé la réinitialisation de votre mot de passe.

Cliquez sur le lien ci-dessous pour en créer un nouveau :
${resetLink}

Ce lien expirera dans 1 heure.

Si vous n'avez pas demandé cette réinitialisation, ignorez simplement cet email. Votre mot de passe restera inchangé.

---
Cet email a été envoyé par CoachyLearning.
`;
}

export { APP_URL };
