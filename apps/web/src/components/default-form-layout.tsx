import { FieldGroup, FieldLegend, FieldSet } from '@ethica/ui/components/field';
import { ItemContent, ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils.js';

export type FormSection = {
  title: string;
  description?: string;
  fields: ReactNode[];
  layout?: 'horizontal' | 'vertical';
};

type DefaultFormLayoutProps = {
  sections: FormSection[];
  layout?: 'horizontal' | 'vertical';
};

// Port of ../IOT/iotlog-frontend-v2/src/components/default-form-layout.tsx
// — each section becomes a FieldSet with a title + subtitle (description) on the
// left and the fields in a grid on the right ('horizontal' layout, the default) or
// stacked (`vertical`). Named export (not default): project
// convention, same family as default-empty-data.tsx/default-loading.tsx.
export function DefaultFormLayout({ sections, layout = 'horizontal' }: DefaultFormLayoutProps) {
  return (
    // Container query, not a viewport breakpoint: the same form fits in a
    // wide page (label on the left) and in a narrow Dialog (stacked).
    <div className="@container flex flex-col gap-8">
      {sections.map((section, index) => {
        const sectionLayout = section.layout || layout;
        const isLast = index === sections.length - 1;
        return (
          <FieldSet
            // biome-ignore lint/suspicious/noArrayIndexKey: `sections` is a static list from the caller, never reordered.
            key={`${section.title}-${index}`}
            className={cn(
              'block w-full p-0',
              !isLast && 'border-b pb-8',
              sectionLayout === 'horizontal' ? 'grid grid-cols-1 gap-8 @2xl:grid-cols-3' : 'flex flex-col gap-6',
            )}
          >
            <ItemContent className="gap-1">
              <FieldLegend variant="label" className="m-0 p-0">
                <ItemTitle className="text-base font-medium">{section.title}</ItemTitle>
              </FieldLegend>
              {section.description && (
                <ItemDescription className="line-clamp-none">{section.description}</ItemDescription>
              )}
            </ItemContent>

            <div className={cn(sectionLayout === 'horizontal' && '@2xl:col-span-2')}>
              <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                {section.fields.map((field, fieldIndex) => (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: `fields` is a static list from the caller, never reordered.
                    key={`${section.title}-${fieldIndex}`}
                    className="col-span-full"
                  >
                    {field}
                  </div>
                ))}
              </FieldGroup>
            </div>
          </FieldSet>
        );
      })}
    </div>
  );
}
