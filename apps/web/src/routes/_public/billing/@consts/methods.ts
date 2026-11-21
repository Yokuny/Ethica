import { BarcodeIcon, CreditCardIcon, type LucideIcon, QrCodeIcon } from 'lucide-react';
import { t } from '@/lib/helpers/translate.helper.js';

export type BillingMethod = 'pix' | 'boleto' | 'card';

// AD-251: PIX and boleto on the Ethica screen; the card (credit or debit) on the Asaas invoice.
export const BILLING_METHODS: { method: BillingMethod; icon: LucideIcon; name: string; help: string }[] = [
  { method: 'pix', icon: QrCodeIcon, name: t('pix'), help: t('billing_pix_help') },
  { method: 'boleto', icon: BarcodeIcon, name: t('boleto'), help: t('billing_boleto_help') },
  { method: 'card', icon: CreditCardIcon, name: t('billing_card'), help: t('billing_card_help') },
];
