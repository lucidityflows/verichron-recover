/**
 * EmailJS Configuration
 *
 * To set up:
 * 1. Create free account at https://www.emailjs.com/
 * 2. Create an email service (Gmail, Outlook, etc.)
 * 3. Create an email template
 * 4. Get your Public Key from Account > API Keys
 * 5. Add these values to .env.local file
 */

export const emailConfig = {
  serviceId: (import.meta.env.VITE_EMAILJS_SERVICE_ID as string) ?? '',
  templateId: (import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string) ?? '',
  autoReplyTemplateId: (import.meta.env.VITE_EMAILJS_AUTO_REPLY_TEMPLATE_ID as string) ?? '',
  publicKey: (import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string) ?? '',
};

export const isEmailConfigured = () => {
  return (
    emailConfig.serviceId &&
    emailConfig.templateId &&
    emailConfig.publicKey
  );
};
