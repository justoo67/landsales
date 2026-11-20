import { serializeMoney, type MoneyInput } from './money.server';

type MoneyFields = {
  sizeAcres: MoneyInput;
  priceKes: MoneyInput;
  pricePerAcre: MoneyInput;
};

export type SerializedComp<T> = Omit<T, keyof MoneyFields> & {
  sizeAcres: number | null;
  priceKes: number | null;
  pricePerAcre: number | null;
};

/** Decimal-safe JSON for comparables, preserving every other field. */
export function compJson<T extends MoneyFields>(comp: T): SerializedComp<T> {
  return {
    ...comp,
    sizeAcres: serializeMoney(comp.sizeAcres),
    priceKes: serializeMoney(comp.priceKes),
    pricePerAcre: serializeMoney(comp.pricePerAcre),
  } as SerializedComp<T>;
}
