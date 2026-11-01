import {
  Building2,
  CalendarDays,
  Contact,
  FileSignature,
  FileText,
  Gavel,
  MapPinned,
  Radar,
  Users,
  Wallet,
} from 'lucide-react';
import type { HomeSection } from '../@interface/home.interface.js';

export const HOME_SECTIONS = [
  {
    to: '/pericias',
    titleKey: 'expert_cases',
    descriptionKey: 'track_each_pericia_from_appointment_to_report',
    icon: Gavel,
    access: 'everyone',
  },
  {
    to: '/laudos',
    titleKey: 'reports_and_opinions',
    descriptionKey: 'reports_page_hub_description',
    icon: FileSignature,
    access: 'everyone',
  },
  {
    to: '/campo',
    titleKey: 'field',
    descriptionKey: 'field_page_description',
    icon: MapPinned,
    access: 'everyone',
  },
  {
    to: '/partes',
    titleKey: 'parties',
    descriptionKey: 'parties_page_description',
    icon: Contact,
    access: 'everyone',
  },
  {
    to: '/agenda',
    titleKey: 'agenda',
    descriptionKey: 'inspections_hearings_and_deadlines_in_one_calendar',
    icon: CalendarDays,
    access: 'everyone',
  },
  {
    to: '/financeiro',
    titleKey: 'finance',
    descriptionKey: 'fees_receivable_and_operating_expenses',
    icon: Wallet,
    access: 'finance',
  },
  {
    to: '/prospeccao',
    titleKey: 'prospecting',
    descriptionKey: 'find_possible_appointments_in_datajud',
    icon: Radar,
    access: 'everyone',
  },
  {
    to: '/relatorios',
    titleKey: 'reports',
    descriptionKey: 'reports_page_description',
    icon: FileText,
    access: 'everyone',
  },
  { to: '/users', titleKey: 'users', descriptionKey: 'review_people_and_invite_to_team', icon: Users, access: 'admin' },
  { to: '/office', titleKey: 'office', descriptionKey: 'office_page_description', icon: Building2, access: 'admin' },
] as const satisfies readonly HomeSection[];
