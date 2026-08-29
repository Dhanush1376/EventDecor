import Serviceability from '../models/Serviceability';
import logger from '../config/logger';

const INDIAN_LOCATIONS = [
  { locationCode: 'AP', locationName: 'Andhra Pradesh', type: 'state' },
  { locationCode: 'AR', locationName: 'Arunachal Pradesh', type: 'state' },
  { locationCode: 'AS', locationName: 'Assam', type: 'state' },
  { locationCode: 'BR', locationName: 'Bihar', type: 'state' },
  { locationCode: 'CG', locationName: 'Chhattisgarh', type: 'state' },
  { locationCode: 'GA', locationName: 'Goa', type: 'state' },
  { locationCode: 'GJ', locationName: 'Gujarat', type: 'state' },
  { locationCode: 'HR', locationName: 'Haryana', type: 'state' },
  { locationCode: 'HP', locationName: 'Himachal Pradesh', type: 'state' },
  { locationCode: 'JH', locationName: 'Jharkhand', type: 'state' },
  { locationCode: 'KA', locationName: 'Karnataka', type: 'state' },
  { locationCode: 'KL', locationName: 'Kerala', type: 'state' },
  { locationCode: 'MP', locationName: 'Madhya Pradesh', type: 'state' },
  { locationCode: 'MH', locationName: 'Maharashtra', type: 'state' },
  { locationCode: 'MN', locationName: 'Manipur', type: 'state' },
  { locationCode: 'ML', locationName: 'Meghalaya', type: 'state' },
  { locationCode: 'MZ', locationName: 'Mizoram', type: 'state' },
  { locationCode: 'NL', locationName: 'Nagaland', type: 'state' },
  { locationCode: 'OD', locationName: 'Odisha', type: 'state' },
  { locationCode: 'PB', locationName: 'Punjab', type: 'state' },
  { locationCode: 'RJ', locationName: 'Rajasthan', type: 'state' },
  { locationCode: 'SK', locationName: 'Sikkim', type: 'state' },
  { locationCode: 'TN', locationName: 'Tamil Nadu', type: 'state' },
  { locationCode: 'TS', locationName: 'Telangana', type: 'state' },
  { locationCode: 'TR', locationName: 'Tripura', type: 'state' },
  { locationCode: 'UP', locationName: 'Uttar Pradesh', type: 'state' },
  { locationCode: 'UK', locationName: 'Uttarakhand', type: 'state' },
  { locationCode: 'WB', locationName: 'West Bengal', type: 'state' },
  { locationCode: 'AN', locationName: 'Andaman and Nicobar Islands', type: 'union_territory' },
  { locationCode: 'CH', locationName: 'Chandigarh', type: 'union_territory' },
  {
    locationCode: 'DN',
    locationName: 'Dadra and Nagar Haveli and Daman and Diu',
    type: 'union_territory',
  },
  { locationCode: 'DL', locationName: 'Delhi', type: 'union_territory' },
  { locationCode: 'JK', locationName: 'Jammu and Kashmir', type: 'union_territory' },
  { locationCode: 'LA', locationName: 'Ladakh', type: 'union_territory' },
  { locationCode: 'LD', locationName: 'Lakshadweep', type: 'union_territory' },
  { locationCode: 'PY', locationName: 'Puducherry', type: 'union_territory' },
];

export async function seedServiceability() {
  try {
    for (const loc of INDIAN_LOCATIONS) {
      await Serviceability.updateOne(
        { locationCode: loc.locationCode },
        {
          $setOnInsert: {
            locationName: loc.locationName,
            type: loc.type,
            enabled: false,
            baseTravelFee: 0,
            freeTravelDistanceKm: 0,
            perKmRate: 0,
            stateSurcharge: 0,
          },
        },
        { upsert: true },
      );
    }
    logger.info('[SEED] Serviceability locations seeded successfully.');
  } catch (err) {
    logger.error('[SEED] Error seeding serviceability locations:', err);
  }
}
