/**
 * Test du Live Tracking en temps réel
 * 
 * Ce script simule un worker qui se déplace vers le client
 * Usage: node test-tracking-live.js [bookingId]
 */

const BASE_URL = 'http://localhost:3000/api/v1';

// Coordonnées de test (Tunis, Algérie)
const WORKER_START = { lat: 36.83, lng: 10.19 };  // 2km au nord
const DESTINATION = { lat: 36.8065, lng: 10.1815 }; // Centre ville

let bookingId = process.argv[2];
let intervalId = null;
let currentPosition = { ...WORKER_START };
let step = 0;

// Calculer les étapes de déplacement
const TOTAL_STEPS = 40; // 40 updates sur 2 minutes = 1 update toutes les 3 secondes
const latStep = (DESTINATION.lat - WORKER_START.lat) / TOTAL_STEPS;
const lngStep = (DESTINATION.lng - WORKER_START.lng) / TOTAL_STEPS;

async function startTracking() {
  console.log('🚀 Démarrage du tracking...');
  console.log(`📍 Booking ID: ${bookingId}`);
  
  try {
    const response = await fetch(`${BASE_URL}/tracking/start/${bookingId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Tracking démarré');
      return true;
    } else {
      console.log('❌ Erreur:', data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Erreur de connexion:', error.message);
    return false;
  }
}

async function updateLocation() {
  step++;
  
  // Déplacer le worker vers la destination
  currentPosition.lat += latStep;
  currentPosition.lng += lngStep;
  
  // Ajouter un peu de variation aléatoire pour simuler un trajet réel
  const randomLat = (Math.random() - 0.5) * 0.0005;
  const randomLng = (Math.random() - 0.5) * 0.0005;
  
  const lat = currentPosition.lat + randomLat;
  const lng = currentPosition.lng + randomLng;
  
  try {
    const response = await fetch(`${BASE_URL}/tracking/update/${bookingId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        latitude: lat,
        longitude: lng,
        heading: calculateHeading(currentPosition, DESTINATION),
        speed: 30 + Math.random() * 20 // 30-50 km/h
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      const progress = Math.round((step / TOTAL_STEPS) * 100);
      const distance = calculateDistance(currentPosition, DESTINATION);
      console.log(`📍 [${progress}%] Position: ${lat.toFixed(5)}, ${lng.toFixed(5)} - Distance: ${distance.toFixed(2)}km`);
    }
    
    // Arrêter quand on arrive
    if (step >= TOTAL_STEPS) {
      console.log('\n🎯 Destination atteinte!');
      await stopTracking();
      process.exit(0);
    }
  } catch (error) {
    console.log('❌ Erreur update:', error.message);
  }
}

async function stopTracking() {
  console.log('\n🛑 Arrêt du tracking...');
  
  if (intervalId) {
    clearInterval(intervalId);
  }
  
  try {
    const response = await fetch(`${BASE_URL}/tracking/stop/${bookingId}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    console.log('✅ Tracking arrêté');
  } catch (error) {
    console.log('❌ Erreur:', error.message);
  }
}

function calculateHeading(from, to) {
  const dLng = to.lng - from.lng;
  const dLat = to.lat - from.lat;
  return (Math.atan2(dLng, dLat) * 180 / Math.PI + 360) % 360;
}

function calculateDistance(from, to) {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (to.lat - from.lat) * Math.PI / 180;
  const dLng = (to.lng - from.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Main
async function main() {
  if (!bookingId) {
    console.log('❌ Usage: node test-tracking-live.js <bookingId>');
    console.log('');
    console.log('Exemple: node test-tracking-live.js 674e8f9a1234567890abcdef');
    process.exit(1);
  }
  
  console.log('🗺️  Live Tracking Test');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🚗 Départ: ${WORKER_START.lat}, ${WORKER_START.lng}`);
  console.log(`🏠 Arrivée: ${DESTINATION.lat}, ${DESTINATION.lng}`);
  console.log(`⏱️  Durée: ~2 minutes (${TOTAL_STEPS} updates)`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const started = await startTracking();
  
  if (started) {
    console.log('📱 Ouvre l\'app iOS et va sur le tracking!\n');
    
    // Envoyer une position toutes les 3 secondes
    intervalId = setInterval(updateLocation, 3000);
    
    // Première position immédiatement
    updateLocation();
  }
}

// Gérer Ctrl+C
process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Interruption détectée...');
  await stopTracking();
  process.exit(0);
});

main();
