// E-mail sending port — two implementations (nodemailer, log). Never
// throws: an SMTP failure cannot bring down the operation that triggered the e-mail
// (FND-12/18).
export type MailProvider = {
  send: (to: string, subject: string, body: string) => Promise<{ sent: boolean }>;
};
