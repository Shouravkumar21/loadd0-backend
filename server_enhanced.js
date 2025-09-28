const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');

let fetchFn;
try {
  fetchFn = fetch;
} catch (e) {
  fetchFn = require('node-fetch');
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(bodyParser.json());

const GOOGLE_API_KEY = 'AIzaSyCnMo9hEXw5QQTNAkXCxEan0QUT1oXNL00'; // Replace with your Google Maps API key

let loads = [];
let nextId = 1;

// Get base URL dynamically
function getBaseUrl(req) {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${protocol}://${host}`;
}

// Geocode address
async function geocodeAddress(address) {
  if (!address) return { lat: 0, lng: 0 };
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      address
    )}&key=${GOOGLE_API_KEY}`;
    const res = await fetchFn(url);
    const data = await res.json();
    if (data.status !== 'OK' || !data.results[0]) return { lat: 0, lng: 0 };
    return data.results[0].geometry.location;
  } catch (e) {
    return { lat: 0, lng: 0 };
  }
}

// Reverse geocode
async function reverseGeocode(lat, lng) {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`;
    const res = await fetchFn(url);
    const data = await res.json();
    if (data.status !== 'OK' || !data.results[0]) return `${lat}, ${lng}`;
    return data.results[0].formatted_address;
  } catch (e) {
    return `${lat}, ${lng}`;
  }
}

// Create load
app.post('/api/loads', async (req, res) => {
  try {
    const { stops = [], driverPhone, geofence } = req.body;
    if (!stops.length) return res.status(400).json({ error: 'At least one stop is required' });
    if (!driverPhone) return res.status(400).json({ error: 'Driver phone is required' });
    if (!geofence || geofence < 0) return res.status(400).json({ error: 'Valid geofence is required' });

    const stopsWithLatLng = [];
    for (let s of stops) {
      if (!s.address) return res.status(400).json({ error: 'All stops must have an address' });
      const loc = await geocodeAddress(s.address);
      if (loc.lat === 0 && loc.lng === 0) return res.status(400).json({ error: `Invalid address: ${s.address}` });
      stopsWithLatLng.push({ type: s.type, address: s.address, lat: loc.lat, lng: loc.lng });
    }

    // Generate dynamic tracking URL based on current request
    const baseUrl = getBaseUrl(req);
    const load = {
      id: nextId++,
      stops: stopsWithLatLng,
      driverPhone,
      geofence,
      status: 'Created',
      events: [{ type: 'Created', ts: Date.now() }],
      locations: [],
      trackingUrl: `${baseUrl}/track/${nextId - 1}`,
      driverLocation: null,
    };

    loads.push(load);
    io.emit('loadsUpdated', loads);
    res.json(load);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create load' });
  }
});

// Get load by ID
app.get('/api/loads/:id', (req, res) => {
  const id = Number(req.params.id);
  const load = loads.find(l => l.id === id);
  if (!load) return res.status(404).json({ error: 'Load not found' });
  res.json(load);
});

// Confirm load
app.post('/api/loads/:id/confirm', (req, res) => {
  const id = Number(req.params.id);
  const load = loads.find(l => l.id === id);
  if (!load) return res.status(404).json({ error: 'Load not found' });
  if (load.status !== 'Created') return res.status(400).json({ error: 'Load already confirmed or canceled' });

  load.status = 'Confirmed';
  load.events.push({ type: 'Confirmed', ts: Date.now() });
  io.emit('loadsUpdated', loads);
  res.json({ trackingUrl: load.trackingUrl });
});

// Cancel load
app.post('/api/loads/:id/cancel', (req, res) => {
  const id = Number(req.params.id);
  const load = loads.find(l => l.id === id);
  if (!load) return res.status(404).json({ error: 'Load not found' });
  if (load.status !== 'Created') return res.status(400).json({ error: 'Load already confirmed or canceled' });

  load.status = 'Canceled';
  load.events.push({ type: 'Canceled', ts: Date.now() });
  io.emit('loadsUpdated', loads);
  res.json({ message: 'Load canceled' });
});

// Get driver location
app.get('/api/loads/:id/driver-location', (req, res) => {
  const id = Number(req.params.id);
  const load = loads.find(l => l.id === id);
  if (!load) return res.status(404).json({ error: 'Load not found' });
  res.json(load.driverLocation || { lat: null, lng: null, city: null });
});

// Update driver location
app.post('/api/loads/:id/location', async (req, res) => {
  const id = Number(req.params.id);
  const { lat, lng } = req.body;
  const load = loads.find(l => l.id === id);
  if (!load) return res.status(404).json({ error: 'Load not found' });
  if (load.status !== 'Confirmed') return res.status(400).json({ error: 'Load not confirmed' });
  if (!lat || !lng) return res.status(400).json({ error: 'Valid coordinates required' });

  const city = await reverseGeocode(lat, lng);
  const loc = { lat, lng, city, timestamp: Date.now() };
  load.driverLocation = loc;
  load.locations.push(loc);
  load.events.push({ type: 'LocationUpdate', ts: Date.now(), meta: loc });

  io.to(id.toString()).emit('location_update', loc);
  io.emit('loadsUpdated', loads);
  res.json({ message: 'Driver location updated' });
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('join_load', (loadId) => {
    socket.join(loadId);
    const load = loads.find(l => l.id === Number(loadId));
    if (load) {
      socket.emit('load_details', load);
      if (load.driverLocation) socket.emit('location_update', load.driverLocation);
    }
  });

  // Handle driver location updates from mobile/web clients
  socket.on('driver_location_update', async (data) => {
    const { loadId, location } = data;
    const load = loads.find(l => l.id === Number(loadId));

    if (!load) {
      socket.emit('error', 'Load not found');
      return;
    }

    if (load.status !== 'Confirmed') {
      socket.emit('error', 'Load not confirmed');
      return;
    }

    try {
      // Get city name from coordinates
      const city = await reverseGeocode(location.lat, location.lng);

      // Update load with new location
      const loc = {
        lat: location.lat,
        lng: location.lng,
        city,
        timestamp: Date.now()
      };

      load.driverLocation = loc;
      load.locations.push(loc);
      load.events.push({ type: 'LocationUpdate', ts: Date.now(), meta: loc });

      // Broadcast to all clients tracking this load
      io.to(loadId.toString()).emit('location_update', loc);
      io.emit('loadsUpdated', loads);

      console.log(`📍 Driver location updated for load ${loadId}:`, loc);
    } catch (error) {
      console.error('Error updating driver location:', error);
      socket.emit('error', 'Failed to update location');
    }
  });

  socket.on('disconnect', () => console.log('Socket disconnected:', socket.id));
});

server.listen(4000, () => console.log('Backend running on  http://localhost:3000'));
