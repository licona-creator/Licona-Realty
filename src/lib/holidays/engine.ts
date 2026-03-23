/**
 * Holiday and Milestone Campaign Engine
 *
 * Auto-generates personalized messages for holidays, birthdays,
 * home purchase anniversaries, and business milestones.
 * All messages route through approval queue.
 */

import { BRAND } from '@/lib/brand';

export interface Holiday {
  name: string;
  nameEs: string;
  date: string; // MM-DD format
  category: 'major' | 'cultural' | 'real_estate' | 'fun';
  bilingual: boolean;
}

// DFW-relevant holidays and observances
export const HOLIDAYS: Holiday[] = [
  { name: "New Year's Day", nameEs: 'Año Nuevo', date: '01-01', category: 'major', bilingual: true },
  { name: "Valentine's Day", nameEs: 'Día de San Valentín', date: '02-14', category: 'fun', bilingual: true },
  { name: 'Cinco de Mayo', nameEs: 'Cinco de Mayo', date: '05-05', category: 'cultural', bilingual: true },
  { name: "Mother's Day", nameEs: 'Día de las Madres', date: '05-12', category: 'major', bilingual: true },
  { name: "Father's Day", nameEs: 'Día del Padre', date: '06-16', category: 'major', bilingual: true },
  { name: 'Independence Day', nameEs: 'Día de la Independencia', date: '07-04', category: 'major', bilingual: false },
  { name: 'Mexican Independence Day', nameEs: 'Día de la Independencia de México', date: '09-16', category: 'cultural', bilingual: true },
  { name: 'Halloween', nameEs: 'Halloween', date: '10-31', category: 'fun', bilingual: false },
  { name: 'Día de los Muertos', nameEs: 'Día de los Muertos', date: '11-02', category: 'cultural', bilingual: true },
  { name: 'Thanksgiving', nameEs: 'Día de Acción de Gracias', date: '11-28', category: 'major', bilingual: true },
  { name: 'Christmas', nameEs: 'Navidad', date: '12-25', category: 'major', bilingual: true },
  { name: 'National Homeownership Month', nameEs: 'Mes Nacional de la Propiedad', date: '06-01', category: 'real_estate', bilingual: true },
];

export type MilestoneType = 'birthday' | 'home_anniversary' | 'business_anniversary';

export interface MilestoneEvent {
  contactId: string;
  contactName: string;
  type: MilestoneType;
  date: string;
  yearCount?: number; // For anniversaries
  languagePreference: 'en' | 'es' | 'bilingual';
}

// Get upcoming holidays within N days
export function getUpcomingHolidays(daysAhead: number = 14): Holiday[] {
  const now = new Date();
  const upcoming: Holiday[] = [];

  for (const holiday of HOLIDAYS) {
    const [month, day] = holiday.date.split('-').map(Number);
    const holidayDate = new Date(now.getFullYear(), month - 1, day);

    // Check if already past this year, use next year
    if (holidayDate < now) {
      holidayDate.setFullYear(now.getFullYear() + 1);
    }

    const diffDays = Math.ceil((holidayDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= daysAhead && diffDays >= 0) {
      upcoming.push(holiday);
    }
  }

  return upcoming;
}

// Get the appropriate approval item type for a milestone
export function getMilestoneApprovalType(type: MilestoneType): string {
  switch (type) {
    case 'birthday': return 'birthday_message';
    case 'home_anniversary': return 'anniversary_message';
    case 'business_anniversary': return 'anniversary_message';
    default: return 'holiday_message';
  }
}

// Generate milestone message prompt context
export function getMilestoneContext(event: MilestoneEvent): string {
  const agentName = BRAND.agent.name;

  switch (event.type) {
    case 'birthday':
      return `Write a warm, personal birthday message from ${agentName} to ${event.contactName}. Keep it genuine and non-salesy. If bilingual, include a natural Spanish line.`;
    case 'home_anniversary':
      return `Write a home purchase anniversary message from ${agentName} to ${event.contactName} celebrating ${event.yearCount || 1} year(s) in their home. Include a subtle market value mention if appropriate.`;
    case 'business_anniversary':
      return `Write a business anniversary congratulation from ${agentName} to ${event.contactName}. Keep it professional but warm.`;
    default:
      return `Write a personal message from ${agentName} to ${event.contactName}.`;
  }
}
