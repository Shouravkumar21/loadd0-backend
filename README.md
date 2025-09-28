Backend (Express + Socket.IO)
-----------------------------
Commands:
  cd backend
  npm install
  npm start
API:
  POST /api/loads           -> create load { pickup, dropoff, driverPhone }
  GET  /api/loads           -> list loads
  POST /api/loads/:id/event -> add event { type }
  POST /api/location        -> accept location { loadId, lat, lng, timestamp }
WebSockets:
  - emits 'loadsUpdated' (array of loads)
  - emits 'locationBroadcast' ({ loadId, loc })
  - listens 'driverLocation' (emit from driver simulator)
