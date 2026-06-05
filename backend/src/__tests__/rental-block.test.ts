import mongoose from 'mongoose';
import RentalDayBlock from '../models/RentalDayBlock';

describe('RentalDayBlock Model', () => {
  it('creates a rental day block correctly', async () => {
    const block = new RentalDayBlock({
      product: new mongoose.Types.ObjectId(),
      rentalOrder: new mongoose.Types.ObjectId(),
      date: '2026-10-15',
      unitNumber: 1,
    });

    expect(block.date).toBe('2026-10-15');
    expect(block.unitNumber).toBe(1);
  });

  it('validates required fields', async () => {
    const block = new RentalDayBlock({});

    let error;
    try {
      await block.validate();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect((error as any).errors.product).toBeDefined();
    expect((error as any).errors.date).toBeDefined();
    expect((error as any).errors.unitNumber).toBeDefined();
    expect((error as any).errors.rentalOrder).toBeDefined();
  });
});
