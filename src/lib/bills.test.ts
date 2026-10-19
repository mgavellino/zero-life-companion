import { expect, it } from "vitest";
import { automaticCategory, billDueDate, billSchema } from "./bills";
it.each([['Água','contas'],['Luz','contas'],['Internet','contas'],['Academia','saúde'],['Netflix streaming','assinaturas']])('categorizes %s as %s', (text, category) => expect(automaticCategory(text)).toBe(category));
it('preserves an explicitly chosen category', () => expect(automaticCategory('Internet','trabalho')).toBe('trabalho'));
it('clamps a monthly day to February without skipping the bill', () => expect(billDueDate('2027-02',31)).toBe('2027-02-28'));
it('supports leap years', () => expect(billDueDate('2028-02',31)).toBe('2028-02-29'));
it('rejects due days outside the month', () => expect(billSchema.safeParse({title:'Luz',amount:100,due_day:32,starts_on:'2026-10-19'}).success).toBe(false));