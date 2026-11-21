import { type ContactMessage, contactMessageSchema } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { t } from '@/lib/helpers/translate.helper.js';
import { CONTACT_DEFAULTS } from '../@consts/contact.js';
import { sendContactMessage } from '../@query/contact.js';

// PUB-01/02 (AD-249): the message goes by e-mail to the Ethica; the page shows the confirmation.
export function useContactForm() {
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const form = useForm<ContactMessage>({
    resolver: zodResolver(contactMessageSchema),
    defaultValues: CONTACT_DEFAULTS,
  });

  const onSubmit = async (data: ContactMessage) => {
    setErrorMessage(undefined);
    const response = await sendContactMessage(data);
    if (!response.success) {
      setErrorMessage(response.message || t('action_error'));
      return;
    }
    form.reset(CONTACT_DEFAULTS);
    setSent(true);
  };

  return { form, sent, errorMessage, onSubmit, sendAnother: () => setSent(false) };
}
