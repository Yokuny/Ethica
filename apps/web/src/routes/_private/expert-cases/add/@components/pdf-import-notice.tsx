import { ItemDescription } from '@ethica/ui/components/item';
import { AppLink } from '@/components/app-link.js';
import { Panel } from '@/components/panel.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { PdfExtraction } from '../../@query/import.js';
import { CAMPO_LABEL } from '../@consts/campo-label.js';

// O que o PDF não trouxe e os avisos da extração, acima do formulário já preenchido.
export function PdfImportNotice({ extraction }: { extraction: PdfExtraction }) {
  const { missing, warnings, existingId } = extraction;
  return (
    <Panel size="sm" title={t('pdf_filled_review_before_saving')} role="status">
      {missing.length > 0 && (
        <ItemDescription className="line-clamp-none">
          {`${t('not_found_in_pdf')}: ${missing.map((campo) => t(CAMPO_LABEL[campo] ?? campo)).join(', ')}`}
        </ItemDescription>
      )}
      {warnings.map((warning) => (
        <ItemDescription key={warning} className="line-clamp-none">
          {t(warning)}
        </ItemDescription>
      ))}
      {existingId && (
        <AppLink to="/expert-cases/details" search={{ id: existingId }} as="description">
          {t('open_registered_expert_case')}
        </AppLink>
      )}
    </Panel>
  );
}
