'use strict';
const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  driverId: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  licence: { type: String },
  phone: { type: String },
  status: { type: String, default: 'Active' }
}, { timestamps: true });

const vehicleSchema = new mongoose.Schema({
  reg: { type: String, unique: true, required: true },
  make: { type: String },
  year: { type: Number },
  fuel: { type: String },
  mileage: { type: Number, default: 0 },
  expectedKml: { type: Number },
  status: { type: String, default: 'Available' },
  nextServiceKm: { type: Number },
  nextServiceDate: { type: String },
  insuranceExpiry: { type: String }
}, { timestamps: true });

const checkSchema = new mongoose.Schema({
  item: { type: String },
  st: { type: String },
  note: { type: String }
}, { _id: false });

const signinSchema = new mongoose.Schema({
  date: { type: String, required: true },
  driverId: { type: String },
  driverName: { type: String },
  vehicle: { type: String },
  startTime: { type: String },
  openKm: { type: Number },
  fuelStart: { type: String },
  condition: { type: String },
  sig: { type: String },
  checks: { type: [checkSchema], default: [] },
  returnTime: { type: String },
  closeKm: { type: Number },
  fuelEnd: { type: String },
  newDefects: { type: String },
  supervisor: { type: String }
}, { timestamps: true });

const tripSchema = new mongoose.Schema({
  date: { type: String, required: true },
  vehicle: { type: String },
  driver: { type: String },
  timeOut: { type: String },
  from: { type: String },
  to: { type: String },
  purpose: { type: String },
  kmOut: { type: Number },
  timeIn: { type: String },
  kmIn: { type: Number }
}, { timestamps: true });

const timelogSchema = new mongoose.Schema({
  date: { type: String, required: true },
  driver: { type: String },
  event: { type: String },
  time: { type: String },
  note: { type: String }
}, { timestamps: true });

const fuelSchema = new mongoose.Schema({
  date: { type: String, required: true },
  time: { type: String },
  vehicle: { type: String },
  driver: { type: String },
  odoBefore: { type: Number },
  odoAfter: { type: Number },
  station: { type: String },
  litres: { type: Number },
  price: { type: Number },
  total: { type: Number },
  fuelType: { type: String },
  receipt: { type: String }
}, { timestamps: true });

const maintenanceSchema = new mongoose.Schema({
  date: { type: String, required: true },
  vehicle: { type: String },
  odo: { type: Number },
  issue: { type: String },
  action: { type: String },
  cost: { type: Number },
  nextSvc: { type: Number },
  status: { type: String }
}, { timestamps: true });

const incidentSchema = new mongoose.Schema({
  date: { type: String, required: true },
  type: { type: String },
  vehicle: { type: String },
  driver: { type: String },
  severity: { type: String },
  detail: { type: String },
  status: { type: String, default: 'Open' }
}, { timestamps: true });

module.exports = {
  Driver: mongoose.model('Driver', driverSchema),
  Vehicle: mongoose.model('Vehicle', vehicleSchema),
  Signin: mongoose.model('Signin', signinSchema),
  Trip: mongoose.model('Trip', tripSchema),
  Timelog: mongoose.model('Timelog', timelogSchema),
  Fuel: mongoose.model('Fuel', fuelSchema),
  Maintenance: mongoose.model('Maintenance', maintenanceSchema),
  Incident: mongoose.model('Incident', incidentSchema)
};
