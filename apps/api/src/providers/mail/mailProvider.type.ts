// E-mail sending port — three implementations (resend, nodemailer, log). Never
// throws: a delivery failure cannot bring down the operation that triggered the e-mail
// (FND-12/18).
export type MailProvider = {
  send: (to: string, subject: string, body: string) => Promise<{ sent: boolean }>;
};
