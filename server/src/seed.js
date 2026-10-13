'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const { Driver, Vehicle } = require('./models');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fleetdrive';

async function main() {
  await mongoose.connect(MONGODB_URI);

  await Driver.updateOne(
    { driverId: 'D-001' },
    { $set: { driverId: 'D-001', name: 'John Mwangi', licence: 'DL-KE-44120', phone: '0712 000 111', status: 'Active' } },
    { upsert: true }
  );
  await Driver.updateOne(
    { driverId: 'D-002' },
    { $set: { driverId: 'D-002', name: 'Peter Odhiambo', licence: 'DL-KE-88231', phone: '0733 000 222', status: 'Active' } },
    { upsert: true }
  );

  await Vehicle.updateOne(
    { reg: 'KXX 123A' },
    {
      $set: {
        reg: 'KXX 123A', make: 'Toyota Hiace', year: 2019, fuel: 'Diesel',
        mileage: 45100, expectedKml: 10, status: 'Available',
        nextServiceKm: 50000, nextServiceDate: '2026-11-15', insuranceExpiry: '2027-02-01'
      }
    },
    { upsert: true }
  );
  await Vehicle.updateOne(
    { reg: 'KXX 456B' },
    {
      $set: {
        reg: 'KXX 456B', make: 'Isuzu D-Max', year: 2021, fuel: 'Diesel',
        mileage: 61200, expectedKml: 9, status: 'Available',
        nextServiceKm: 65000, nextServiceDate: '2026-12-01', insuranceExpiry: '2027-01-10'
      }
    },
    { upsert: true }
  );

  const dc = await Driver.countDocuments();
  const vc = await Vehicle.countDocuments();
  console.log(`seed ok: drivers=${dc} vehicles=${vc}`);
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
