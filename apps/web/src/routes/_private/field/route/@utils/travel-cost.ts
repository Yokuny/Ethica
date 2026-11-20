// Travel cost of the route (CDE-02): fuel by the vehicle's average plus tolls, in cents.
export type TravelInput = { km: number; kmPerLiter: number; fuelPriceCents: number; tollsCents: number };

export const travelCost = ({ km, kmPerLiter, fuelPriceCents, tollsCents }: TravelInput) => {
  const liters = kmPerLiter > 0 ? km / kmPerLiter : 0;
  const fuelCents = Math.round(liters * fuelPriceCents);
  const totalCents = fuelCents + tollsCents;
  return { liters, fuelCents, totalCents, perKmCents: km > 0 ? Math.round(totalCents / km) : 0 };
};

// Equal parts per service order (CDE-03); the cent left over goes to the first.
export const splitCents = (totalCents: number, parts: number): number[] => {
  if (parts < 1) return [];
  const base = Math.floor(totalCents / parts);
  return Array.from({ length: parts }, (_, index) => base + (index === 0 ? totalCents - base * parts : 0));
};
