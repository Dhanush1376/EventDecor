import './setup';
import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';

import ReturnRequest from '../../src/models/ReturnRequest';
import ExchangeRequest from '../../src/models/ExchangeRequest';
import { getMyExchanges } from '../../src/controllers/returns/exchangeController';

/**
 * Legacy (pre-WhatsApp) exchange history is read-only. Documents are inserted raw because the
 * automated flow that created and validated them no longer exists.
 */
const callGetMyExchanges = (userId: string) =>
  new Promise<any>((resolve, reject) => {
    const res: any = {
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(body: any) {
        resolve({ statusCode: this.statusCode, body });
      },
    };
    getMyExchanges({ user: { id: userId } } as any, res, reject);
  });

describe('GET /exchanges/my-exchanges (legacy history)', () => {
  it("returns only the customer's own exchanges, with their return request attached", async () => {
    const owner = new mongoose.Types.ObjectId();
    const stranger = new mongoose.Types.ObjectId();
    const ownReturn = new mongoose.Types.ObjectId();
    const strangerReturn = new mongoose.Types.ObjectId();

    await ReturnRequest.collection.insertMany([
      {
        _id: ownReturn,
        returnId: `RET-own-${Date.now()}`,
        userId: owner,
        status: 'approved',
        returnType: 'exchange',
        items: [],
      },
      {
        _id: strangerReturn,
        returnId: `RET-other-${Date.now()}`,
        userId: stranger,
        status: 'approved',
        returnType: 'exchange',
        items: [],
      },
    ]);
    await ExchangeRequest.collection.insertMany([
      { exchangeId: `EX-own-${Date.now()}`, returnRequestId: ownReturn, createdAt: new Date() },
      {
        exchangeId: `EX-other-${Date.now()}`,
        returnRequestId: strangerReturn,
        createdAt: new Date(),
      },
    ]);

    const { statusCode, body } = await callGetMyExchanges(String(owner));
    expect(statusCode).toBe(200);
    expect(body.count).toBe(1);
    expect(String(body.data[0].returnRequestId)).toBe(String(ownReturn));
    expect(String(body.data[0].returnRequest._id)).toBe(String(ownReturn));
  });

  it('returns an empty list for a customer without legacy returns', async () => {
    const { statusCode, body } = await callGetMyExchanges(String(new mongoose.Types.ObjectId()));
    expect(statusCode).toBe(200);
    expect(body).toEqual({ success: true, data: [], count: 0 });
  });
});
