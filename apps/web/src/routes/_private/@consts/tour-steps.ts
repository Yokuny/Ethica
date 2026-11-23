import type { HomeSection } from '../@interface/home.interface.js';

// Guided tour (AD-233): `target` is the `data-tour` of the element the step points to (side menu, or the phone dock,
// falling back to its "Menu"); without it the step shows centered.
export type TourStep = { target?: string; titleKey: string; descriptionKey: string };

// Menu sections the tour presents, in menu order; each one only shows when the person sees it in the menu.
export const TOUR_SECTIONS: HomeSection['to'][] = [
  '/expert-cases',
  '/notifications',
  '/agenda',
  '/field',
  '/expert-reports',
  '/finance',
  '/automation',
];

export const TOUR_WELCOME: TourStep = {
  titleKey: 'welcome_to_ethica',
  descriptionKey: 'see_where_each_part_of_your_work_is',
};

// Only for the admin: the settings group of the menu (office and team).
export const TOUR_OFFICE: TourStep = {
  target: 'admin',
  titleKey: 'your_office',
  descriptionKey: 'set_up_office_documents_and_invite_team',
};

export const TOUR_ACCOUNT: TourStep = {
  target: 'account',
  titleKey: 'your_account',
  descriptionKey: 'account_devices_tour_and_go_to_shortcut',
};
