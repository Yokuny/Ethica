import { DOCUMENT_MARKERS, type SignatoryInput, signatorySchema } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { Form } from '@ethica/ui/components/form';
import { ItemDescription } from '@ethica/ui/components/item';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type ChangeEvent, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { DefaultFormLayout } from '@/components/default-form-layout.js';
import { FormDialog } from '@/components/form-dialog.js';
import { TextareaField, TextField } from '@/components/form-fields.js';
import { apiUrl } from '@/lib/api/client.api.js';
import { resizeLogo } from '@/lib/helpers/resizeLogo.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { type SignatoryRecord, saveSignatoryMutation, setSignatoryLogoMutation } from '@/query/signatory.js';

type SignatoryDialogProps = {
  signatory?: SignatoryRecord;
  onClose: () => void;
  onSaved?: (signatory: SignatoryRecord) => void;
};

// Technical responsible (NLA-02): personal data, logo, header and footer of their own. Empty header,
// footer or logo fall back to the office ones. Used on the office screen and in "Novo laudo".
export function SignatoryDialog({ signatory, onClose, onSaved }: SignatoryDialogProps) {
  const queryClient = useQueryClient();
  const save = useMutation(saveSignatoryMutation(queryClient));
  const setLogo = useMutation(setSignatoryLogoMutation(queryClient));
  // Logo picked here: a new image, `null` to remove, `undefined` to keep the current one.
  const [logo, setLogoFile] = useState<Blob | null | undefined>(undefined);
  const input = useRef<HTMLInputElement>(null);
  const form = useForm<SignatoryInput>({
    resolver: zodResolver(signatorySchema),
    defaultValues: {
      name: signatory?.name ?? '',
      cpf: signatory?.cpf ?? '',
      professionalRegistration: signatory?.professionalRegistration ?? '',
      education: signatory?.education ?? '',
      phone: signatory?.phone ?? '',
      header: signatory?.header ?? '',
      footer: signatory?.footer ?? '',
    },
  });
  const { control } = form;
  const preview = useMemo(
    () => (logo ? URL.createObjectURL(logo) : logo === null ? undefined : signatory?.logo && apiUrl(signatory.logo)),
    [logo, signatory?.logo],
  );
  const pending = save.isPending || setLogo.isPending;

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const png = await resizeLogo(file).catch(() => null);
    if (!png) return void toast.error(t('invalid_image'));
    setLogoFile(png);
  }

  async function onSubmit(data: SignatoryInput) {
    try {
      const saved = await save.mutateAsync({ id: signatory?.id, data });
      if (logo !== undefined) await setLogo.mutateAsync({ id: saved.id, png: logo });
      toast.success(t('changes_saved'));
      onSaved?.(saved);
      onClose();
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  return (
    <FormDialog
      title={t(signatory ? 'edit_technical_responsible' : 'new_technical_responsible')}
      size="lg"
      onClose={onClose}
    >
      <Form {...form}>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <DefaultFormLayout
            layout="vertical"
            sections={[
              {
                title: t('personal_data'),
                fields: [
                  <TextField key="name" control={control} name="name" label={t('name')} placeholder={t('full_name')} />,
                  <TextField key="cpf" control={control} name="cpf" label={t('cpf')} placeholder="000.000.000-00" />,
                  <TextField
                    key="registration"
                    control={control}
                    name="professionalRegistration"
                    label={t('professional_registration')}
                    placeholder={t('professional_registration_placeholder')}
                  />,
                  <TextField
                    key="education"
                    control={control}
                    name="education"
                    label={t('education')}
                    placeholder={t('education_placeholder')}
                  />,
                  <TextField
                    key="phone"
                    control={control}
                    name="phone"
                    label={t('phone')}
                    placeholder="(00) 00000-0000"
                  />,
                ],
              },
              {
                title: t('logo'),
                description: t('technical_responsible_identity_hint'),
                fields: [
                  <div key="logo" className="flex flex-col items-start gap-3">
                    {preview ? (
                      <img src={preview} alt={t('logo')} className="max-h-20 max-w-60 object-contain" />
                    ) : (
                      <ItemDescription>{t('no_logo_yet')}</ItemDescription>
                    )}
                    <input
                      ref={input}
                      type="file"
                      accept="image/png,image/jpeg"
                      className="hidden"
                      onChange={handleFile}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" onClick={() => input.current?.click()}>
                        {t(preview ? 'change_logo' : 'choose_logo')}
                      </Button>
                      {preview && (
                        <Button type="button" variant="ghost" onClick={() => setLogoFile(null)}>
                          {t('remove')}
                        </Button>
                      )}
                    </div>
                  </div>,
                  <TextareaField
                    key="header"
                    control={control}
                    name="header"
                    label={t('header')}
                    placeholder={t('header_placeholder')}
                  />,
                  <TextareaField
                    key="footer"
                    control={control}
                    name="footer"
                    label={t('footer')}
                    placeholder={t('footer_placeholder')}
                  />,
                  <ItemDescription key="markers" className="line-clamp-none">
                    {t('document_markers_hint')} {DOCUMENT_MARKERS.join(' · ')}
                  </ItemDescription>,
                ],
              },
            ]}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={pending}>
              {t('save')}
            </Button>
          </div>
        </form>
      </Form>
    </FormDialog>
  );
}
