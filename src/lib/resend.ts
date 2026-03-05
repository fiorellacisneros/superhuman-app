import { Resend } from 'resend';

const apiKey = import.meta.env.RESEND_API_KEY;
const from = import.meta.env.RESEND_FROM_EMAIL;

if (!apiKey || !from) {
  throw new Error('Missing Resend environment variables');
}

const resend = new Resend(apiKey);

export interface SendBadgeEmailPayload {
  to: string;
  subject: string;
  html: string;
}

export const sendBadgeEmail = async ({ to, subject, html }: SendBadgeEmailPayload) => {
  await resend.emails.send({
    from,
    to,
    subject,
    html,
  });
};

