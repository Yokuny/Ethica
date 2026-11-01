import { ItemDescription } from '@ethica/ui/components/item';
import { AppLink } from '@/components/app-link.js';
import { Panel } from '@/components/panel.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { PdfExtraction } from '../../@query/import.js';
import { FIELD_LABEL } from '../@consts/field-label.js';

// What the PDF did not bring and the extraction warnings, above the already filled form.
export function PdfImportNotice({ extraction }: { extraction: PdfExtraction }) {
  const { missing, warnings, existingId } = extraction;
  return (
    <Panel size="sm" title={t('pdf_filled_review_before_saving')} role="status">
      {missing.length > 0 && (
        <ItemDescription className="line-clamp-none">
          {`${t('not_found_in_pdf')}: ${missing.map((field) => t(FIELD_LABEL[field] ?? field)).join(', ')}`}
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
