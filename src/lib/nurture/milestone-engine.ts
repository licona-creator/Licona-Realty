/**
 * Milestone Detection Engine
 *
 * Detects upcoming birthdays, holidays, post-close check-ins,
 * and gone-quiet contacts for the Sphere Nurture system.
 */

interface NurtureContact {
  id: string;
  first_name: string;
  last_name: string;
  birthday_month: number | null;
  birthday_day: number | null;
  birthday_year: number | null;
  disc_type: 'D' | 'I' | 'S' | 'C' | null;
  language_preference: string;
  track_type: string;
  created_at: string;
  phone: string | null;
  email: string | null;
}

interface NurtureTransaction {
  id: string;
  contact_id: string;
  property_address: string;
  status: string;
  closing_date: string | null;
  track_type: string;
}

interface NurtureActivity {
  id: string;
  contact_id: string;
  activity_type: string;
  direction: string | null;
  description: string;
  activity_date: string;
}

export interface BirthdayMilestone {
  type: 'birthday';
  contact: NurtureContact;
  birthday_date: string;
  days_until: number;
  turning_age: number | null;
}

export interface HolidayMilestone {
  type: 'holiday';
  name: string;
  name_es: string;
  date: string;
  days_until: number;
}

export type PostCloseMilestoneType = '30day' | '90day' | '180day' | '1year' | 'quarterly';

export interface PostCloseMilestone {
  type: 'post_close';
  contact: NurtureContact;
  property_address: string;
  milestone_type: PostCloseMilestoneType;
  milestone_label: string;
  days_until: number;
  days_since_close: number;
}

export interface GoneQuietMilestone {
  type: 'gone_quiet';
  contact: NurtureContact;
  last_activity_date: string | null;
  days_silent: number;
  suggested_action: string;
}

export type Milestone = BirthdayMilestone | HolidayMilestone | PostCloseMilestone | GoneQuietMilestone;

function daysBetween(from: Date, to: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const fromUTC = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const toUTC = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((toUTC - fromUTC) / msPerDay);
}

function formatDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function getUpcomingBirthdays(
  contacts: NurtureContact[],
  daysAhead: number = 7,
  now: Date = new Date()
): BirthdayMilestone[] {
  const results: BirthdayMilestone[] = [];
  const todayYear = now.getFullYear();

  for (const contact of contacts) {
    if (!contact.birthday_month || !contact.birthday_day) continue;

    const m = contact.birthday_month;
    const d = contact.birthday_day;

    // Check this year and next year for wraparound (Dec -> Jan)
    for (const year of [todayYear, todayYear + 1]) {
      const bdayDate = new Date(Date.UTC(year, m - 1, d));
      const diff = daysBetween(now, bdayDate);

      if (diff >= 0 && diff <= daysAhead) {
        const turningAge = contact.birthday_year
          ? year - contact.birthday_year
          : null;

        results.push({
          type: 'birthday',
          contact,
          birthday_date: formatDateStr(year, m, d),
          days_until: diff,
          turning_age: turningAge,
        });
        break; // Only include the nearest occurrence
      }
    }
  }

  return results.sort((a, b) => a.days_until - b.days_until);
}

function getMothersDay(year: number): Date {
  // 2nd Sunday of May
  const may1 = new Date(Date.UTC(year, 4, 1));
  const dayOfWeek = may1.getUTCDay();
  const firstSunday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  return new Date(Date.UTC(year, 4, firstSunday + 7));
}

function getFathersDay(year: number): Date {
  // 3rd Sunday of June
  const jun1 = new Date(Date.UTC(year, 5, 1));
  const dayOfWeek = jun1.getUTCDay();
  const firstSunday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  return new Date(Date.UTC(year, 5, firstSunday + 14));
}

function getThanksgiving(year: number): Date {
  // 4th Thursday of November
  const nov1 = new Date(Date.UTC(year, 10, 1));
  const dayOfWeek = nov1.getUTCDay();
  const firstThursday = dayOfWeek <= 4 ? (4 - dayOfWeek + 1) : (11 - dayOfWeek + 4 + 1);
  return new Date(Date.UTC(year, 10, firstThursday + 21));
}

export function getUpcomingHolidays(
  daysAhead: number = 30,
  now: Date = new Date()
): HolidayMilestone[] {
  const results: HolidayMilestone[] = [];
  const year = now.getFullYear();

  const holidays: Array<{ name: string; name_es: string; date: Date }> = [];

  for (const y of [year, year + 1]) {
    holidays.push(
      { name: "New Year's Day", name_es: 'Dia de Ano Nuevo', date: new Date(Date.UTC(y, 0, 1)) },
      { name: "Mother's Day", name_es: 'Dia de las Madres', date: getMothersDay(y) },
      { name: "Father's Day", name_es: 'Dia del Padre', date: getFathersDay(y) },
      { name: 'Thanksgiving', name_es: 'Dia de Accion de Gracias', date: getThanksgiving(y) },
      { name: 'Christmas', name_es: 'Navidad', date: new Date(Date.UTC(y, 11, 25)) },
    );
  }

  for (const holiday of holidays) {
    const diff = daysBetween(now, holiday.date);
    if (diff >= 0 && diff <= daysAhead) {
      // Avoid duplicates (same holiday from two years)
      if (!results.some(r => r.name === holiday.name)) {
        results.push({
          type: 'holiday',
          name: holiday.name,
          name_es: holiday.name_es,
          date: formatDateStr(
            holiday.date.getUTCFullYear(),
            holiday.date.getUTCMonth() + 1,
            holiday.date.getUTCDate()
          ),
          days_until: diff,
        });
      }
    }
  }

  return results.sort((a, b) => a.days_until - b.days_until);
}

const POST_CLOSE_MILESTONES: Array<{
  daysAfterClose: number;
  type: PostCloseMilestoneType;
  label: string;
}> = [
  { daysAfterClose: 30, type: '30day', label: '30-day check-in' },
  { daysAfterClose: 90, type: '90day', label: '90-day check-in' },
  { daysAfterClose: 180, type: '180day', label: '6-month check-in' },
  { daysAfterClose: 365, type: '1year', label: '1-year anniversary' },
];

function isMilestoneCompleted(
  contactId: string,
  milestoneDate: Date,
  activities: NurtureActivity[]
): boolean {
  const contactActivities = activities.filter(
    a => a.contact_id === contactId && a.direction === 'outbound'
  );

  for (const act of contactActivities) {
    const actDate = new Date(act.activity_date);
    const diffDays = Math.abs(daysBetween(actDate, milestoneDate));
    if (diffDays <= 7) return true;
  }

  // Also check skip notes
  for (const act of activities) {
    if (act.contact_id !== contactId) continue;
    if (act.activity_type === 'note' && act.description.startsWith('Skipped ')) {
      const actDate = new Date(act.activity_date);
      const diffDays = Math.abs(daysBetween(actDate, milestoneDate));
      if (diffDays <= 7) return true;
    }
  }

  return false;
}

export function getPostCloseCheckIns(
  contacts: NurtureContact[],
  transactions: NurtureTransaction[],
  activities: NurtureActivity[],
  now: Date = new Date()
): PostCloseMilestone[] {
  const results: PostCloseMilestone[] = [];
  const contactMap = new Map(contacts.map(c => [c.id, c]));

  const closedTransactions = transactions.filter(
    t => t.status === 'closed' && t.closing_date
  );

  for (const tx of closedTransactions) {
    const contact = contactMap.get(tx.contact_id);
    if (!contact) continue;

    const closeDate = new Date(tx.closing_date + 'T00:00:00');
    const daysSinceClose = daysBetween(closeDate, now);

    if (daysSinceClose < 0) continue; // Future closing, skip

    // Find the next milestone
    let foundMilestone = false;

    for (const ms of POST_CLOSE_MILESTONES) {
      const milestoneDate = new Date(closeDate);
      milestoneDate.setDate(milestoneDate.getDate() + ms.daysAfterClose);
      const daysUntil = daysBetween(now, milestoneDate);

      if (isMilestoneCompleted(contact.id, milestoneDate, activities)) {
        continue;
      }

      // Show if upcoming (within 14 days) or overdue (up to 14 days past)
      if (daysUntil >= -14) {
        results.push({
          type: 'post_close',
          contact,
          property_address: tx.property_address,
          milestone_type: ms.type,
          milestone_label: ms.label,
          days_until: daysUntil,
          days_since_close: daysSinceClose,
        });
        foundMilestone = true;
        break;
      }
    }

    // After 1 year: quarterly check-ins
    if (!foundMilestone && daysSinceClose > 365) {
      const daysPast365 = daysSinceClose - 365;
      const quartersPast = Math.floor(daysPast365 / 90);
      const nextQuarterDay = 365 + (quartersPast + 1) * 90;
      const nextQuarterDate = new Date(closeDate);
      nextQuarterDate.setDate(nextQuarterDate.getDate() + nextQuarterDay);

      // Also check the current quarter milestone
      const currentQuarterDay = 365 + quartersPast * 90;
      const currentQuarterDate = new Date(closeDate);
      currentQuarterDate.setDate(currentQuarterDate.getDate() + currentQuarterDay);
      const currentDaysUntil = daysBetween(now, currentQuarterDate);

      if (
        currentDaysUntil >= -14 &&
        !isMilestoneCompleted(contact.id, currentQuarterDate, activities)
      ) {
        results.push({
          type: 'post_close',
          contact,
          property_address: tx.property_address,
          milestone_type: 'quarterly',
          milestone_label: 'Quarterly check-in',
          days_until: currentDaysUntil,
          days_since_close: daysSinceClose,
        });
      } else {
        const nextDaysUntil = daysBetween(now, nextQuarterDate);
        if (
          nextDaysUntil >= -14 && nextDaysUntil <= 14 &&
          !isMilestoneCompleted(contact.id, nextQuarterDate, activities)
        ) {
          results.push({
            type: 'post_close',
            contact,
            property_address: tx.property_address,
            milestone_type: 'quarterly',
            milestone_label: 'Quarterly check-in',
            days_until: nextDaysUntil,
            days_since_close: daysSinceClose,
          });
        }
      }
    }
  }

  return results.sort((a, b) => a.days_until - b.days_until);
}

function getSuggestedAction(disc: string | null): string {
  switch (disc) {
    case 'D': return 'Quick text. Something specific, not just checking in.';
    case 'I': return 'Personal text or call. Ask about them.';
    case 'S': return 'Send value. Market report for their area. No ask.';
    case 'C': return 'Share data. New listings or price trends in their zip.';
    default: return 'Quick check-in. See where they are at.';
  }
}

export function getGoneQuietContacts(
  contacts: NurtureContact[],
  activities: NurtureActivity[],
  daysThreshold: number = 60,
  now: Date = new Date()
): GoneQuietMilestone[] {
  const results: GoneQuietMilestone[] = [];

  // Build map of most recent activity per contact
  const lastActivityMap = new Map<string, NurtureActivity>();
  for (const act of activities) {
    const existing = lastActivityMap.get(act.contact_id);
    if (!existing || new Date(act.activity_date) > new Date(existing.activity_date)) {
      lastActivityMap.set(act.contact_id, act);
    }
  }

  for (const contact of contacts) {
    const lastActivity = lastActivityMap.get(contact.id);

    if (lastActivity) {
      const lastDate = new Date(lastActivity.activity_date);
      const daysSilent = daysBetween(lastDate, now);

      if (daysSilent >= daysThreshold) {
        results.push({
          type: 'gone_quiet',
          contact,
          last_activity_date: lastActivity.activity_date,
          days_silent: daysSilent,
          suggested_action: getSuggestedAction(contact.disc_type),
        });
      }
    } else {
      // No activity at all - check if contact is old enough
      const createdDate = new Date(contact.created_at);
      const daysSinceCreated = daysBetween(createdDate, now);

      if (daysSinceCreated > daysThreshold) {
        results.push({
          type: 'gone_quiet',
          contact,
          last_activity_date: null,
          days_silent: daysSinceCreated,
          suggested_action: getSuggestedAction(contact.disc_type),
        });
      }
    }
  }

  // Sort by days_silent descending, limit to top 5
  return results
    .sort((a, b) => b.days_silent - a.days_silent)
    .slice(0, 5);
}

export function getAllMilestones(
  contacts: NurtureContact[],
  transactions: NurtureTransaction[],
  activities: NurtureActivity[],
  now: Date = new Date()
): Milestone[] {
  const birthdays = getUpcomingBirthdays(contacts, 7, now);
  const holidays = getUpcomingHolidays(30, now);
  const postClose = getPostCloseCheckIns(contacts, transactions, activities, now);
  const goneQuiet = getGoneQuietContacts(contacts, activities, 60, now);

  const all: Milestone[] = [];

  // Sort order:
  // 1. Overdue post-close (red, most urgent)
  const overduePostClose = postClose.filter(m => m.days_until < 0);
  all.push(...overduePostClose);

  // 2. Birthdays today/tomorrow
  const birthdaysSoon = birthdays.filter(m => m.days_until <= 1);
  all.push(...birthdaysSoon);

  // 3. Upcoming birthdays (2-7 days)
  const birthdaysUpcoming = birthdays.filter(m => m.days_until > 1);
  all.push(...birthdaysUpcoming);

  // 4. Post-close due soon
  const postCloseSoon = postClose.filter(m => m.days_until >= 0);
  all.push(...postCloseSoon);

  // 5. Holidays
  all.push(...holidays);

  // 6. Gone quiet
  all.push(...goneQuiet);

  return all;
}
