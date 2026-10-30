import { Link } from '@tanstack/react-router';
import { LinkList, LinkListItem } from '@/components/link-list.js';
import { Panel } from '@/components/panel.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { HomeSection } from '../@interface/home.interface.js';

export function HomeSections({ sections }: { sections: readonly HomeSection[] }) {
  return (
    <Panel size="sm" title={t('areas')}>
      <LinkList columns={3} className="max-sm:grid-cols-2">
        {sections.map(({ to, titleKey, descriptionKey, icon }) => (
          <LinkListItem
            key={to}
            render={<Link to={to} />}
            icon={icon}
            title={t(titleKey)}
            description={t(descriptionKey)}
            className="max-sm:gap-2 max-sm:px-3 max-sm:py-3 max-sm:[&>span:first-child]:size-8 max-sm:[&>span:last-child]:hidden max-sm:[&_[data-slot=item-description]]:sr-only"
          />
        ))}
      </LinkList>
    </Panel>
  );
}
