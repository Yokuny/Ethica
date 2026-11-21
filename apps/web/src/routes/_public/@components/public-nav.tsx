import { Button } from '@ethica/ui/components/button';
import { Link } from '@tanstack/react-router';
import { t } from '@/lib/helpers/translate.helper.js';
import { Brand } from './brand.js';

// Bar of the public text pages: the brand and Entrar.
export function PublicNav() {
  return (
    <nav className="flex items-center justify-between">
      <Brand />
      <Button variant="outline" render={<Link to="/" />}>
        {t('sign_in')}
      </Button>
    </nav>
  );
}
