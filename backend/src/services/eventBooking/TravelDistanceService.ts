import logger from '../../config/logger';

export interface IDistanceProvider {
  calculateDistance(origin: string, destination: string): Promise<number>;
}

/**
 * Deterministic Mock Distance Provider for Development / Testing
 * Do NOT use in production for actual routing unless configured to do so.
 */
export class DeterministicMockDistanceProvider implements IDistanceProvider {
  async calculateDistance(origin: string, destination: string): Promise<number> {
    // Generate a deterministic fake distance between 5 and 500 based on strings
    const str = `${origin.toLowerCase()}|${destination.toLowerCase()}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    const distance = 5 + (Math.abs(hash) % 495);
    logger.info(
      `[TravelDistanceService] (MOCK) Calculated distance from '${origin}' to '${destination}' as ${distance} km`,
    );
    return distance;
  }
}

/**
 * Placeholder for a real distance provider (e.g. Google Maps, Mapbox, OSRM)
 * To be implemented when a real provider API key is provided.
 */
export class GoogleMapsDistanceProvider implements IDistanceProvider {
  async calculateDistance(_origin: string, _destination: string): Promise<number> {
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      throw new Error('Google Maps API key is missing. Cannot calculate real distance.');
    }
    logger.warn(
      `[TravelDistanceService] GoogleMapsDistanceProvider is unimplemented. Falling back to mock or throwing.`,
    );
    throw new Error('GoogleMapsDistanceProvider not fully implemented.');
  }
}

export class TravelDistanceService {
  private static provider: IDistanceProvider;

  static getProvider(): IDistanceProvider {
    if (!this.provider) {
      // By default, if we are not forcing a real provider, we use the deterministic mock for safety
      if (process.env.USE_REAL_DISTANCE_PROVIDER === 'true') {
        this.provider = new GoogleMapsDistanceProvider();
      } else {
        this.provider = new DeterministicMockDistanceProvider();
      }
    }
    return this.provider;
  }

  static async calculateDistance(destination: string): Promise<number> {
    // Determine the origin from environment configuration, default to a safe value
    const origin = process.env.EVENT_TRAVEL_ORIGIN || 'EventDecor HQ, Hyderabad, Telangana';
    const provider = this.getProvider();

    try {
      const distance = await provider.calculateDistance(origin, destination);
      // Ensure distance is returned as a rounded whole number of kilometers
      return Math.round(distance);
    } catch (err: any) {
      logger.error(`[TravelDistanceService] Failed to calculate distance: ${err.message}`);
      throw new Error('Unable to calculate travel distance for the specified location.', {
        cause: err,
      });
    }
  }
}
