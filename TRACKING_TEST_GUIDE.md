# 🗺️ Guide de Test du Live Tracking

## Architecture

**iOS App (MapKit natif)** ← → **Backend NestJS** ← → **MongoDB**
- Carte: MapKit avec tiles OpenStreetMap (gratuit)
- Routing: Apple Maps Directions API
- Updates: Polling toutes les 3 secondes

## 🚀 Démarrage Rapide

### 1. Démarrer le Backend
```bash
cd "Backend NestJs/taskly-backend"
npm run start:dev
```

### 2. Obtenir un Booking ID

**Option A: Créer une réservation via l'app iOS**
1. Ouvre l'app iOS
2. Réserve un worker
3. Note le booking ID dans les logs backend

**Option B: Utiliser MongoDB Compass**
```javascript
// Dans la collection 'bookings'
db.bookings.findOne({ status: 'confirmed' })
// Copie le _id
```

**Option C: Via l'API**
```bash
curl http://localhost:3000/api/v1/bookings | jq '.data[0]._id'
```

### 3. Lancer la Simulation

```bash
# Remplace BOOKING_ID par ton vrai ID
node test-tracking-live.js 674e8f9a1234567890abcdef
```

Tu verras :
```
🗺️  Live Tracking Test
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚗 Départ: 36.83, 10.19
🏠 Arrivée: 36.8065, 10.1815
⏱️  Durée: ~2 minutes (40 updates)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Tracking démarré
📱 Ouvre l'app iOS et va sur le tracking!

📍 [2%] Position: 36.83050, 10.19025 - Distance: 2.45km
📍 [5%] Position: 36.83125, 10.19063 - Distance: 2.38km
📍 [7%] Position: 36.83200, 10.19100 - Distance: 2.31km
...
```

### 4. Voir le Tracking dans l'App iOS

1. Ouvre l'app iOS
2. Va dans **"Mes Réservations"**
3. Sélectionne la réservation
4. Clique sur **"Track Worker Live"**

Tu verras :
- 🗺️ Carte OpenStreetMap
- 🚗 Marker bleu (worker) qui se déplace en temps réel
- 🏠 Marker rouge (destination)
- 📍 Route bleue entre les deux
- ⏱️ Temps estimé d'arrivée
- 📏 Distance restante

## 🔧 Endpoints API

### Démarrer le tracking (Worker)
```bash
POST /api/v1/tracking/start/:bookingId
```

### Mettre à jour la position (Worker)
```bash
POST /api/v1/tracking/update/:bookingId
Body: {
  "latitude": 36.83,
  "longitude": 10.19,
  "heading": 180,
  "speed": 45
}
```

### Obtenir la position (Client)
```bash
GET /api/v1/tracking/location/:bookingId
Response: {
  "success": true,
  "data": {
    "latitude": 36.83,
    "longitude": 10.19,
    "heading": 180,
    "speed": 45,
    "timestamp": "2024-12-03T10:30:00Z"
  }
}
```

### Arrêter le tracking
```bash
DELETE /api/v1/tracking/stop/:bookingId
```

## 📱 Fonctionnalités iOS

### Carte Native avec OpenStreetMap
- **MapKit** pour la performance native
- **Tiles OpenStreetMap** (gratuit, pas de limite)
- **Apple Directions API** pour le routing
- **Polling** toutes les 3 secondes

### UI Features
- ✅ Marker animé du worker (voiture bleue)
- ✅ Marker de destination (drapeau rouge)
- ✅ Route bleue avec calcul automatique
- ✅ Bulle d'info sur la route (temps + distance)
- ✅ Bouton pour centrer sur la destination
- ✅ Badge "LIVE" quand le tracking est actif
- ✅ Auto-fit pour voir les deux markers
- ✅ Updates en temps réel (3 secondes)

## 🐛 Troubleshooting

### Le worker ne bouge pas
```bash
# Vérifie que le backend reçoit les updates
# Dans les logs backend, tu devrais voir:
📍 [Tracking] Location updated for booking: 674e8f9a...
```

### Erreur "Booking not found"
```bash
# Vérifie que le booking existe
curl http://localhost:3000/api/v1/bookings/:bookingId
```

### La carte ne charge pas
- Vérifie ta connexion internet (OpenStreetMap tiles)
- Vérifie les permissions de localisation dans iOS
- Regarde les logs Xcode pour les erreurs

### Pas de route affichée
- Le routing utilise Apple Maps Directions
- Vérifie que les coordonnées sont valides
- Regarde les logs: `🛣️ [Route] ...`

## 🎯 Test Complet

### Scénario 1: Tracking Simple
```bash
# Terminal 1: Backend
npm run start:dev

# Terminal 2: Simulation
node test-tracking-live.js <BOOKING_ID>

# iOS App: Ouvre le tracking
```

### Scénario 2: Tracking Manuel
```bash
# Démarrer
curl -X POST http://localhost:3000/api/v1/tracking/start/<BOOKING_ID>

# Envoyer des positions manuellement
curl -X POST http://localhost:3000/api/v1/tracking/update/<BOOKING_ID> \
  -H "Content-Type: application/json" \
  -d '{"latitude": 36.83, "longitude": 10.19}'

# Arrêter
curl -X DELETE http://localhost:3000/api/v1/tracking/stop/<BOOKING_ID>
```

## 📊 Monitoring

### Logs Backend
```
📍 [Tracking] Started tracking for booking: 674e8f9a...
📍 [Tracking] Location updated: 36.83, 10.19
📍 [Tracking] Client fetched location
🛑 [Tracking] Stopped tracking
```

### Logs iOS
```
🗺️ [OSM Map] Created with destination: 36.8065, 10.1815
🗺️ [OSM Map] Update - Worker: YES
✅ [OSM Map] Route added successfully
📍 [Tracking] Location update received
```

## 🌍 Coordonnées de Test

### Tunis, Tunisie
```javascript
WORKER: { lat: 36.83, lng: 10.19 }
CLIENT: { lat: 36.8065, lng: 10.1815 }
```

### Alger, Algérie
```javascript
WORKER: { lat: 36.77, lng: 3.06 }
CLIENT: { lat: 36.7538, lng: 3.0588 }
```

### Paris, France
```javascript
WORKER: { lat: 48.86, lng: 2.35 }
CLIENT: { lat: 48.8566, lng: 2.3522 }
```

## ✅ Checklist

- [ ] Backend démarré
- [ ] MongoDB connecté
- [ ] Booking ID valide
- [ ] Simulation lancée
- [ ] App iOS ouverte
- [ ] Tracking view affichée
- [ ] Worker se déplace
- [ ] Route calculée
- [ ] Temps/distance mis à jour

## 🎉 Résultat Attendu

Tu devrais voir dans l'app iOS :
1. Une carte OpenStreetMap
2. Un marker bleu (worker) qui se déplace progressivement
3. Un marker rouge (destination) fixe
4. Une ligne bleue (route) qui se recalcule
5. Une bulle avec "🚗 X min" et "Y km"
6. Le badge "LIVE" en vert
7. Les infos du worker en bas

Le worker met ~2 minutes pour arriver à destination.

## 📝 Notes

- **OpenStreetMap** est gratuit et sans limite
- **Apple Directions** est gratuit pour les apps iOS
- Le **polling** est simple mais efficace (pas besoin de WebSocket)
- Les **updates** sont throttlés à 3 secondes pour économiser la batterie
- Le **routing** est recalculé toutes les 10 secondes max
