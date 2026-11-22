import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent } from '@/components/page-card.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { PublicNav } from '../@components/public-nav.js';

// About page in the shadcnblocks model of the expert: hero, two facts beside the story and who the
// Ethica serves. The hero photo, the founders and the partner logos of the model wait for the expert.
export function AboutPage() {
  const facts = [
    { label: t('about_areas_label'), value: t('about_areas_value') },
    { label: t('about_scope_label'), value: t('about_scope_value') },
  ];
  const story = [t('about_story_problem'), t('about_story_solution'), t('about_story_field'), t('about_mission')];
  const audience = [
    { title: t('court_expert'), text: t('about_expert_text') },
    { title: t('technical_assistant'), text: t('about_assistant_text') },
    { title: t('about_team_title'), text: t('about_team_text') },
  ];
  return (
    <Card>
      <CardContent className="mx-auto flex w-full max-w-6xl flex-col gap-24">
        <PublicNav />
        <div className="flex min-h-80 items-center justify-center rounded-xl border bg-linear-to-t from-primary/15 via-muted/40 to-transparent px-8 py-24 md:min-h-112">
          <ItemTitle // biome-ignore lint/a11y/useHeadingContent: the title arrives as the ItemTitle children
            render={<h1 />}
            className="text-center text-4xl font-semibold tracking-tight md:text-5xl lg:text-6xl xl:text-7xl"
          >
            {t('about_title')}
          </ItemTitle>
        </div>
        <div className="flex flex-col items-start justify-between gap-8 lg:flex-row">
          <div className="flex w-full flex-1 flex-col gap-8 lg:gap-12">
            {facts.map((fact) => (
              <div key={fact.label} className="flex w-full max-w-xl flex-col gap-5 border-t pt-4">
                <ItemDescription className="text-xs font-medium uppercase sm:text-sm">{fact.label}</ItemDescription>
                <ItemTitle className="text-4xl font-medium">{fact.value}</ItemTitle>
              </div>
            ))}
          </div>
          <div className="flex flex-1 flex-col gap-8">
            {story.map((paragraph) => (
              <ItemDescription key={paragraph} className="line-clamp-none text-base font-medium">
                {paragraph}
              </ItemDescription>
            ))}
          </div>
        </div>
        <section className="flex flex-col gap-6">
          <ItemTitle // biome-ignore lint/a11y/useHeadingContent: the title arrives as the ItemTitle children
            render={<h2 />}
            className="text-xl font-medium sm:text-2xl md:text-4xl"
          >
            {t('about_audience_title')}
          </ItemTitle>
          <ItemDescription className="line-clamp-none max-w-2xl text-sm font-medium sm:text-base">
            {t('about_audience_text')}
          </ItemDescription>
          <div className="mt-10 grid w-full grid-cols-1 border-[0.5px] border-border/70 sm:grid-cols-2 lg:grid-cols-3 dark:border-border">
            {audience.map((profile) => (
              <div
                key={profile.title}
                className="flex flex-col gap-2 border-[0.5px] border-border/70 p-10 lg:p-16 dark:border-border"
              >
                <ItemTitle // biome-ignore lint/a11y/useHeadingContent: the title arrives as the ItemTitle children
                  render={<h3 />}
                  className="text-lg font-medium sm:text-xl md:text-3xl"
                >
                  {profile.title}
                </ItemTitle>
                <ItemDescription className="line-clamp-none text-base font-medium sm:text-lg">
                  {profile.text}
                </ItemDescription>
              </div>
            ))}
          </div>
        </section>
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute('/_public/about/')({
  component: AboutPage,
  staticData: { title: t('about') },
});
