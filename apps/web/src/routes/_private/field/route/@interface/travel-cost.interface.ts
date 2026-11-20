import { z } from 'zod';

// Travel cost form (CDE-01): kilometers of the route, the vehicle's average, fuel price and tolls (cents).
export const travelCostSchema = z.object({
  km: z.number().min(0, 'km inválido'),
  kmPerLiter: z.number().positive('informe a média do veículo'),
  fuelPriceCents: z.number().int().min(0),
  tollsCents: z.number().int().min(0),
});
export type TravelCostForm = z.infer<typeof travelCostSchema>;

// Where the expense goes (CDE-03): one service order or split among the chosen ones.
export const TRAVEL_TARGETS = ['one', 'split'] as const;
export type TravelTarget = (typeof TRAVEL_TARGETS)[number];
