// AD-036: project time convention — instants always in UTC, conversion
// to local time only at the presentation edge (screen and text the AI sends).
// Lives in packages/contracts, not in packages/db (fix from the Tasks phase):
// apps/web depends on contracts but never on db, and the front needs the same
// constant to format the same time the back-end saves, whatever
// the browser time zone.
export const DISPLAY_TIMEZONE = 'America/Sao_Paulo';
