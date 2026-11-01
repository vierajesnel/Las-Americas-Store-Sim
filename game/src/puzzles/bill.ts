import { type Rng, pick, shuffle } from '../logic/rng';

/** Bill check: the customer complains, you find the charge that doesn't belong. */

export interface BillLine {
  label: string;
  amount: number;
}

export interface BillPuzzle {
  quote: string;
  lines: BillLine[];
  /** Indexes of the line(s) that answer the complaint. */
  answers: number[];
}

const NORMAL: BillLine[] = [
  { label: 'Unlimited plan, Line 1', amount: 65 },
  { label: 'Line 2', amount: 45 },
  { label: 'Device payment 14 of 36', amount: 27.78 },
  { label: 'Taxes & fees', amount: 9.43 },
  { label: 'AutoPay discount', amount: -10 },
  { label: 'Device Protection', amount: 17 },
  { label: 'Tablet line', amount: 20 },
  { label: 'Smartwatch line', amount: 10 },
];

interface Complaint {
  quote: string;
  /** The charge that shouldn't be there. Omitted for "charged twice". */
  bogus?: BillLine;
  /** Normal lines that would make the answer ambiguous. */
  excludes?: string[];
}

const COMPLAINTS: Complaint[] = [
  { quote: "I don't even travel! Why is my bill so high?", bogus: { label: 'International Day Pass x3', amount: 36 } },
  { quote: 'I never signed up for insurance.', bogus: { label: 'Device Protection', amount: 17 }, excludes: ['Device Protection'] },
  { quote: 'I paid this phone off already!', bogus: { label: 'Device payment 37 of 36', amount: 27.78 }, excludes: ['Device payment 14 of 36'] },
  { quote: "I paid on time. I have the receipt!", bogus: { label: 'Late fee', amount: 10 } },
  { quote: "I don't even own a smartwatch.", bogus: { label: 'Smartwatch line', amount: 10 }, excludes: ['Smartwatch line'] },
  { quote: "What's this streaming thing? I don't watch TV.", bogus: { label: 'Streaming add-on', amount: 16.99 } },
  { quote: "I cancelled my son's line in August.", bogus: { label: 'Line 3 (cancelled Aug)', amount: 35 } },
  { quote: 'Pretty sure they charged me twice for something.' },
];

export function generateBill(rng: Rng): BillPuzzle {
  const complaint = pick(rng, COMPLAINTS);
  const pool = NORMAL.filter((l) => !complaint.excludes?.includes(l.label));
  const normals = shuffle(rng, pool).slice(0, 4);
  const extra = complaint.bogus ?? { ...pick(rng, normals.filter((l) => l.amount > 0)) };
  const lines = shuffle(rng, [...normals, extra]);
  const answers = complaint.bogus
    ? [lines.indexOf(extra)]
    : lines.flatMap((l, i) => (l.label === extra.label ? [i] : []));
  return { quote: complaint.quote, lines, answers };
}

export function money(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  return `${sign}$${Math.abs(amount).toFixed(2)}`;
}
