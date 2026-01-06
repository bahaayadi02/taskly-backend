# 🗺️ Live Tracking - Documentation Complète

## 🎯 Solution Implémentée

**MapKit natif iOS + OpenStreetMap tiles + Apple Directions API**

### Pourquoi cette solution ?

✅ **Performance native iOS** - MapKit est optimisé pour iOS  
✅ **OpenStreetMap gratuit** - Pas de limite, pas de coût  
✅ **Apple Directions gratuit** - Inclus dans iOS  
✅ **Pas de WebSocket** - Polling simple et fiable  
✅ **Batterie optimisée** - Updates throttlés à 3 secondes  

## 📁 Fichiers Créés

### iOS (Swift)
```
taskly/taskly/Views/Tracking/
├── OSMMapView.swift          ← MapKit + OpenStreetMap tiles
├── LiveTrackingView.swift    ← UI principale du tracking
└── LeafletMapView.swift      ← Alternative WebView (non utilisée)
```

### Backend (NestJS)
```
Backend NestJs/taskly-backend/
├── test-tracking-live.js     ← Script de simulation
├── quick-test.sh             ← Test automatique
├── TRACKING_TEST_GUIDE.md    ← Guide complet
└── LIVE_TRACKING_README.md   ← Ce fichier
```

## 🚀 Test en 3 Étapes

### 1. Démarrer le Backend
```bash
cd "Backend NestJs/taskly-backend"
npm run start:dev
```

### 2. Lancer la Simulation
```bash
# Option A: Test automatique
./quick-test.sh

# Option B: Test manuel avec un booking ID
node test-tracking-live.js 674e8f9a1234567890abcdef
```

### 3. Ouvrir l'App iOS
1. Va dans "Mes Réservations"
2. Sélectionne une réservation
3. Clique sur "Track Worker Live"
4. 🎉 Regarde le worker se déplacer en temps réel !

## 🗺️ Architecture Technique

### Frontend iOS
```swift
LiveTrackingView
    ↓
OSMMapView (UIViewRepresentable)
    ↓
MKMapView (MapKit natif)
    ├── OpenStreetMap Tiles (MKTileOverlay)
    ├── Worker Marker (MKMarkerAnnotationView)
    ├── Destination Marker (MKMarkerAnnotationView)
    ├── Route (MKPolyline)
    └── Info Bubble (Custom MKAnnotationView)
```

### Backend NestJS
```typescript
TrackingController
    ↓
TrackingService
    ↓
MongoDB (tracking collection)
    {
      bookingId: string,
      workerId: string,
      latitude: number,
      longitude: number,
      heading: number,
      speed: number,
      timestamp: Date
    }
```

### Flow de Données
```
1. Worker démarre le tracking
   POST /tracking/start/:bookingId

2. Worker envoie sa position toutes les 3s
   POST /tracking/update/:bookingId
   Body: { latitude, longitude, heading, speed }

3. Client récupère la position toutes les 3s
   GET /tracking/location/:bookingId
   Response: { latitude, longitude, ... }

4. iOS calcule la route avec Apple Directions
   MKDirections.calculate()

5. iOS affiche tout sur la carte
   - Worker marker (bleu)
   - Destination marker (rouge)
   - Route (ligne bleue)
   - Info bubble (temps + distance)
```

## 🎨 Features UI

### Carte
- ✅ Tiles OpenStreetMap (gratuit)
- ✅ Zoom/Pan natif iOS
- ✅ Compass et scale
- ✅ Auto-fit pour voir les deux markers

### Markers
- ✅ Worker: voiture bleue animée
- ✅ Destination: drapeau rouge
- ✅ Animation d'apparition (spring)
- ✅ Callouts avec noms

### Route
- ✅ Ligne bleue épaisse
- ✅ Calcul automatique avec Apple Directions
- ✅ Recalcul toutes les 10 secondes max
- ✅ Info bubble au milieu (temps + distance)

### Info Card (Bottom)
- ✅ Photo du worker
- ✅ Nom du worker
- ✅ Status "En route vers vous"
- ✅ Temps estimé d'arrivée
- ✅ Distance restante
- ✅ Adresse de destination
- ✅ Bouton d'appel

### Top Bar
- ✅ Bouton fermer
- ✅ Badge "LIVE" (vert/orange)
- ✅ Bouton centrer sur destination

## 📊 Performance

### Polling Interval
- **Client → Backend**: 3 secondes
- **Worker → Backend**: 3 secondes
- **Route recalcul**: 10 secondes max

### Optimisations
- Throttling des updates
- Calcul de route conditionnel
- Réutilisation des annotations
- Pas de WebSocket (moins de batterie)

## 🌍 OpenStreetMap

### Tiles URL
```
https://tile.openstreetmap.org/{z}/{x}/{y}.png
```

### Avantages
- 100% gratuit
- Pas de limite de requêtes
- Données communautaires
- Couverture mondiale
- Mise à jour régulière

### Usage Policy
- Ajouter attribution (déjà fait)
- Pas de téléchargement massif
- Respecter les serveurs

## 🔧 Configuration

### Info.plist (iOS)
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Nous avons besoin de votre localisation pour le tracking en temps réel</string>

<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
```

### Backend (.env)
```env
MONGODB_URI=mongodb://localhost:27017/taskly
PORT=3000
```

## 🐛 Troubleshooting

### Problème: Carte blanche
**Solution**: Vérifie ta connexion internet (tiles OSM)

### Problème: Pas de route
**Solution**: Vérifie que les coordonnées sont valides

### Problème: Worker ne bouge pas
**Solution**: Vérifie les logs backend pour les updates

### Problème: "Booking not found"
**Solution**: Crée une réservation via l'app d'abord

### Problème: Erreur de compilation iOS
**Solution**: Clean build folder (Cmd+Shift+K)

## 📱 Test sur Simulateur vs Device

### Simulateur iOS
- ✅ Fonctionne parfaitement
- ✅ Pas besoin de GPS réel
- ✅ Coordonnées simulées

### Device Réel
- ✅ Meilleure performance
- ✅ GPS réel pour le worker
- ✅ Test en conditions réelles

## 🎯 Prochaines Améliorations

### Court Terme
- [ ] Rotation du marker selon le heading
- [ ] Trail (historique du trajet)
- [ ] Notifications push quand proche
- [ ] Mode offline avec cache des tiles

### Long Terme
- [ ] WebSocket pour moins de latence
- [ ] Prédiction de trajet avec ML
- [ ] Traffic en temps réel
- [ ] Alternative routes

## 📚 Ressources

### OpenStreetMap
- [OSM Wiki](https://wiki.openstreetmap.org/)
- [Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/)
- [Alternative Tile Servers](https://wiki.openstreetmap.org/wiki/Tile_servers)

### Apple MapKit
- [MapKit Documentation](https://developer.apple.com/documentation/mapkit)
- [MKDirections](https://developer.apple.com/documentation/mapkit/mkdirections)
- [Custom Annotations](https://developer.apple.com/documentation/mapkit/mkannotationview)

### Alternatives
- [Mapbox](https://www.mapbox.com/) - Payant mais puissant
- [Google Maps](https://developers.google.com/maps) - Payant
- [HERE Maps](https://www.here.com/) - Freemium

## ✅ Checklist de Déploiement

### Backend
- [ ] MongoDB en production
- [ ] Variables d'environnement configurées
- [ ] CORS configuré pour l'app
- [ ] Rate limiting activé
- [ ] Logs configurés

### iOS
- [ ] Permissions de localisation
- [ ] Info.plist configuré
- [ ] Attribution OSM visible
- [ ] Gestion des erreurs réseau
- [ ] Tests sur device réel

## 🎉 Résultat Final

Tu as maintenant un système de **live tracking professionnel** avec :

✅ Carte native iOS performante  
✅ Tiles OpenStreetMap gratuites  
✅ Routing Apple gratuit  
✅ Updates en temps réel  
✅ UI moderne et fluide  
✅ Backend scalable  
✅ Tests automatisés  

**Coût total: 0€** 🎊

## 📞 Support

Si tu as des questions ou des problèmes :
1. Vérifie les logs backend et iOS
2. Consulte le TRACKING_TEST_GUIDE.md
3. Teste avec le script quick-test.sh
4. Vérifie que MongoDB est connecté

Bon tracking ! 🚗💨
