import {
  DOCUMENT_MARKERS,
  type DocumentTextStyle,
  REPORT_FONTS,
  TEXT_ALIGNMENTS,
  type UpdateOffice,
} from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@ethica/ui/components/dropdown-menu';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@ethica/ui/components/form';
import { ItemDescription } from '@ethica/ui/components/item';
import { Textarea } from '@ethica/ui/components/textarea';
import { ALargeSmall, AlignCenter, AlignLeft, AlignRight, type LucideIcon, Type } from 'lucide-react';
import { type Control, useController } from 'react-hook-form';
import { t } from '@/lib/helpers/translate.helper.js';
import { useOfficeForm } from '../@hooks/use-office-form.js';
import type { OfficeView } from '../@query/office.js';

const FONT_LABEL = { times: 'font_times', arial: 'font_arial' } as const;
const ALIGN_LABEL = { left: 'align_left', center: 'align_center', right: 'align_right' } as const;
const ALIGN_ICON = { left: AlignLeft, center: AlignCenter, right: AlignRight } as const;
const FONT_SIZES = [7, 8, 8.5, 9, 10, 11, 12, 14];

export function OfficeTextsForm({ office }: { office: OfficeView }) {
  const { form, onSubmit, isPending } = useOfficeForm(office);
  const { control } = form;
  return (
    <Form {...form}>
      <form noValidate onSubmit={onSubmit} className="flex flex-col items-start gap-4">
        <div className="grid w-full gap-4">
          <StyledTextField control={control} name="header" label={t('header')} placeholder={t('header_placeholder')} />
          <StyledTextField control={control} name="footer" label={t('footer')} placeholder={t('footer_placeholder')} />
          <ItemDescription className="line-clamp-none">
            {t('document_markers_hint')} {DOCUMENT_MARKERS.join(' · ')}
          </ItemDescription>
        </div>
        <Button type="submit" disabled={isPending || !form.formState.isDirty}>
          {t('save')}
        </Button>
      </form>
    </Form>
  );
}

// Header or footer text with the three style icons beside its name: font, size and alignment (AD-172).
function StyledTextField({
  control,
  name,
  label,
  placeholder,
}: {
  control: Control<UpdateOffice>;
  name: 'header' | 'footer';
  label: string;
  placeholder: string;
}) {
  const { field: style } = useController({ control, name: `${name}Style` });
  const value = style.value as DocumentTextStyle;
  const set = (patch: Partial<DocumentTextStyle>) => style.onChange({ ...value, ...patch });
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <div className="flex items-center gap-1">
            <FormLabel className="mr-2">{label}</FormLabel>
            <StyleMenu
              icon={Type}
              heading={t('font')}
              current={t(FONT_LABEL[value.font])}
              value={value.font}
              items={REPORT_FONTS.map((font) => ({ value: font, label: t(FONT_LABEL[font]) }))}
              onChange={(font) => set({ font: font as DocumentTextStyle['font'] })}
            />
            <StyleMenu
              icon={ALargeSmall}
              heading={t('font_size')}
              current={String(value.fontSize).replace('.', ',')}
              value={String(value.fontSize)}
              items={FONT_SIZES.map((size) => ({ value: String(size), label: String(size).replace('.', ',') }))}
              onChange={(size) => set({ fontSize: Number(size) })}
            />
            <StyleMenu
              icon={ALIGN_ICON[value.align]}
              heading={t('alignment')}
              current={t(ALIGN_LABEL[value.align])}
              value={value.align}
              items={TEXT_ALIGNMENTS.map((align) => ({ value: align, label: t(ALIGN_LABEL[align]) }))}
              onChange={(align) => set({ align: align as DocumentTextStyle['align'] })}
            />
          </div>
          <FormControl>
            <Textarea placeholder={placeholder} {...field} value={field.value ?? ''} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// Icon button that opens the options; the name and the current choice go in its tooltip.
function StyleMenu({
  icon: Icon,
  heading,
  current,
  value,
  items,
  onChange,
}: {
  icon: LucideIcon;
  heading: string;
  current: string;
  value: string;
  items: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const label = `${heading}: ${current}`;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button type="button" size="icon-sm" variant="ghost" aria-label={label} title={label} />}
      >
        <Icon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{heading}</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={value} onValueChange={(next) => onChange(String(next))}>
            {items.map((item) => (
              <DropdownMenuRadioItem key={item.value} value={item.value}>
                {item.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
