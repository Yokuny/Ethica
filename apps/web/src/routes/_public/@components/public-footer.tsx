import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { Link } from '@tanstack/react-router';
import { t } from '@/lib/helpers/translate.helper.js';
import { FOOTER_SECTIONS } from '../@consts/footer.js';
import { Brand } from './brand.js';

export function PublicFooter() {
  return (
    <footer className="mx-auto mt-16 flex w-full max-w-6xl flex-col gap-10 border-t px-4 pt-10 lg:mt-24">
      <div className="grid grid-cols-2 gap-8 lg:grid-cols-5">
        <div className="col-span-2 flex flex-col gap-3">
          <Brand />
          <ItemDescription className="line-clamp-none">{t('product_promise')}</ItemDescription>
        </div>
        {FOOTER_SECTIONS.map((section) => (
          <nav key={section.title} aria-label={section.title} className="flex flex-col gap-3">
            <ItemTitle>{section.title}</ItemTitle>
            {section.links.map((link) => (
              <Link key={link.to} to={link.to} className="w-fit hover:underline">
                <ItemDescription>{link.label}</ItemDescription>
              </Link>
            ))}
          </nav>
        ))}
      </div>
      <ItemDescription>{`© ${new Date().getFullYear()} Ethica. ${t('all_rights_reserved')}`}</ItemDescription>
    </footer>
  );
}
