/**
 * The rows every grid in the benchmark is given. Generated from a seed rather than shipped as JSON, so
 * the page downloads nothing for a hundred thousand rows and every implementation — and every rerun, on
 * any machine — measures the identical table.
 */

/** One row: twenty columns, the mix a real admin table has (ids, names, enums, money, dates, a flag). */
export interface BenchRow {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  city: string;
  department: string;
  jobTitle: string;
  status: string;
  priority: string;
  salary: number;
  bonus: number;
  score: number;
  progress: number;
  tickets: number;
  rating: number;
  startDate: string;
  lastLogin: string;
  active: boolean;
  notes: string;
}

/** How many columns a `BenchRow` has. Asserted in the test, so the headline figure cannot drift. */
export const BENCH_COLUMN_COUNT = 20;

/** The value the `country` filter scenario looks for, and roughly a twentieth of the rows. */
export const FILTER_COUNTRY = 'Japan';

/** The column the grouping scenario groups by, and how many groups that makes. */
export const GROUP_COLUMN = 'department';

const firstNames = [
  'Alice',
  'Bo',
  'Chidi',
  'Dana',
  'Eitan',
  'Farida',
  'Gustav',
  'Hana',
  'Ivan',
  'Júlia',
  'Kwame',
  'Lena',
  'Mateo',
  'Nadia',
  'Omar',
  'Priya',
  'Quentin',
  'Rosa',
  'Sanjay',
  'Tove',
];

const lastNames = [
  'Almeida',
  'Bauer',
  'Chen',
  'Dubois',
  'Eriksen',
  'Ferrari',
  'Gruber',
  'Haddad',
  'Ionescu',
  'Jansen',
  'Kowalski',
  'Lindqvist',
  'Mwangi',
  'Novak',
  'Okafor',
  'Petrov',
  'Quiroga',
  'Rossi',
  'Sato',
  'Tanaka',
];

const countries = [
  'Argentina',
  'Australia',
  'Brazil',
  'Canada',
  'Denmark',
  'Egypt',
  'France',
  'Germany',
  'India',
  'Japan',
  'Kenya',
  'Mexico',
  'Netherlands',
  'Norway',
  'Poland',
  'Portugal',
  'Romania',
  'Spain',
  'Sweden',
  'Vietnam',
];

const cities = [
  'Rosario',
  'Perth',
  'Recife',
  'Halifax',
  'Aarhus',
  'Giza',
  'Lyon',
  'Leipzig',
  'Pune',
  'Osaka',
  'Mombasa',
  'Puebla',
  'Utrecht',
  'Bergen',
  'Gdansk',
  'Porto',
  'Cluj',
  'Valencia',
  'Malmö',
  'Da Nang',
];

const departments = [
  'Accounts',
  'Customer Success',
  'Data',
  'Design',
  'Engineering',
  'Finance',
  'Legal',
  'Marketing',
  'Operations',
  'People',
  'Sales',
  'Support',
];

const jobTitles = ['Analyst', 'Associate', 'Consultant', 'Coordinator', 'Director', 'Engineer', 'Lead', 'Manager', 'Partner', 'Specialist'];

const statuses = ['Active', 'Pending', 'Suspended', 'Closed'];
const priorities = ['Low', 'Medium', 'High', 'Critical'];
const notes = [
  'Renewal due this quarter',
  'Escalated twice last month',
  'Migrated from the legacy plan',
  'Awaiting a signed order form',
  'Handed over to the regional team',
  'No open tickets',
  'Invoice paid late',
  'Expansion opportunity flagged',
];

/** Mulberry32: thirty-two bits of state, one multiply and three shifts — the cheapest seeded PRNG worth having. */
function random(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A date `days` after 2020-01-01, as the `YYYY-MM-DD` a grid sorts as text. */
function dateAt(days: number): string {
  return new Date(Date.UTC(2020, 0, 1 + days)).toISOString().slice(0, 10);
}

/**
 * `count` rows, the same ones every time for a given seed. Kept to array indexing and arithmetic — a row
 * built with template literals and `toFixed` costs more to generate than the grid costs to render it, and
 * the generation is not what this page is measuring.
 */
export function generateRows(count: number, seed = 20260917): BenchRow[] {
  const next = random(seed);
  const rows: BenchRow[] = new Array(count);

  for (let i = 0; i < count; i++) {
    const first = firstNames[(next() * firstNames.length) | 0];
    const last = lastNames[(next() * lastNames.length) | 0];
    const countryIndex = (next() * countries.length) | 0;

    rows[i] = {
      id: i + 1,
      firstName: first,
      lastName: last,
      email: first.toLowerCase() + '.' + last.toLowerCase() + i + '@example.com',
      country: countries[countryIndex],
      city: cities[countryIndex],
      department: departments[(next() * departments.length) | 0],
      jobTitle: jobTitles[(next() * jobTitles.length) | 0],
      status: statuses[(next() * statuses.length) | 0],
      priority: priorities[(next() * priorities.length) | 0],
      salary: 38000 + ((next() * 122000) | 0),
      bonus: (next() * 24000) | 0,
      score: Math.round(next() * 1000) / 10,
      progress: (next() * 101) | 0,
      tickets: (next() * 240) | 0,
      rating: Math.round(next() * 50) / 10,
      startDate: dateAt((next() * 2100) | 0),
      lastLogin: dateAt(2100 + ((next() * 300) | 0)),
      active: next() < 0.72,
      notes: notes[(next() * notes.length) | 0],
    };
  }

  return rows;
}
