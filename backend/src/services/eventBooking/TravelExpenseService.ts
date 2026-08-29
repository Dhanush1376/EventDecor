export interface TravelExpenseCalculationResult {
  baseTravelFee: number;
  freeTravelDistanceKm: number;
  actualDistanceKm: number;
  chargeableDistanceKm: number;
  perKmRate: number;
  distanceCharge: number;
  stateSurcharge: number;
  totalTravelExpense: number;
}

export class TravelExpenseService {
  /**
   * Calculates the exact travel expense based on the location's serviceability configuration
   * and the calculated distance.
   */
  static calculate(
    distanceKm: number,
    baseTravelFee: number,
    freeTravelDistanceKm: number,
    perKmRate: number,
    stateSurcharge: number,
  ): TravelExpenseCalculationResult {
    // Ensure inputs are not negative, fallback to 0
    const safeDistanceKm = Math.max(0, distanceKm);
    const safeBaseFee = Math.max(0, baseTravelFee || 0);
    const safeFreeDistance = Math.max(0, freeTravelDistanceKm || 0);
    const safePerKmRate = Math.max(0, perKmRate || 0);
    const safeSurcharge = Math.max(0, stateSurcharge || 0);

    const chargeableDistanceKm = Math.max(0, safeDistanceKm - safeFreeDistance);

    // Distance charge -> rounded INR
    const distanceCharge = Math.round(chargeableDistanceKm * safePerKmRate);

    // Final travel expense -> rounded INR
    const totalTravelExpense = Math.round(safeBaseFee + distanceCharge + safeSurcharge);

    return {
      baseTravelFee: safeBaseFee,
      freeTravelDistanceKm: safeFreeDistance,
      actualDistanceKm: safeDistanceKm,
      chargeableDistanceKm,
      perKmRate: safePerKmRate,
      distanceCharge,
      stateSurcharge: safeSurcharge,
      totalTravelExpense,
    };
  }
}
