/**
 * Script pour tester le Live Tracking
 * 
 * COMMENT UTILISER:
 * 1. Assure-toi que le backend est démarré (npm run start:dev)
 * 2. Modifie le BOOKING_ID ci-dessous avec un vrai ID de réservation
 * 3. Exécute: node test-tracking-simulation.js
 * 4. Ouvre l'app iOS et va sur la réservation -> "Track Worker Live"
 */

const BOOKING_ID = 'REMPLACE_PAR_TON_BOOKING_ID'; // <-- CHANGE CECI!

// Position de départ du worker (exemple: 2km au nord de Tunis)
const WORKER_START = {
  lat: 36.83,
  lng: 10.19
};

// Position de destination (client) - exemple: centre de Tunis
const DESTINATION = {
  lat: 36.8065,
  lng: 10.1815
};

const BASE_URL = 'http://localhost:3000/api/v1';

async function startSimulation() {
  console.log('🚀 Démarrage de la simulation de tracking...\n');
  console.log(`📍 Booking ID: ${BOOKING_ID}`);
  console.log(`🚗 Position worker: ${WORKER_START.lat}, ${WORKER_START.lng}`);
  console.log(`🏠 Position client: ${DESTINATION.lat}, ${DESTINATION.lng}\n`);

  const url = `${BASE_URL}/tracking/simulate/start/${BOOKING_ID}?workerLat=${WORKER_START.lat}&workerLng=${WORKER_START.lng}&destLat=${DESTINATION.lat}&destLng=${DESTINATION.lng}`;

  try {
    const response = await fetch(url, { method: 'POST' });
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Simulation démarrée avec succès!');
      console.log('');
      console.log('📱 Maintenant:');
      console.log('   1. Ouvre l\'app iOS');
      console.log('   2. Va dans "Mes Réservations"');
      console.log('   3. Ouvre une réservation avec statut "On The Way"');
      console.log('   4. Clique sur "Track Worker Live"');
      console.log('');
      console.log('🗺️  Tu verras le worker (bleu) se déplacer vers toi (rouge)!');
      console.log('');
      console.log('⏱️  La simulation dure ~2 minutes');
      console.log('');
      console.log('Pour arrêter: node test-tracking-simulation.js stop');
    } else {
      console.log('❌ Erreur:', data.message);
    }
  } catch (error) {
    console.log('❌ Erreur de connexion:', error.message);
    console.log('   Assure-toi que le backend est démarré (npm run start:dev)');
  }
}

async function stopSimulation() {
  console.log('🛑 Arrêt de la simulation...\n');

  const url = `${BASE_URL}/tracking/simulate/stop/${BOOKING_ID}`;

  try {
    const response = await fetch(url, { method: 'DELETE' });
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Simulation arrêtée');
    } else {
      console.log('❌ Erreur:', data.message);
    }
  } catch (error) {
    console.log('❌ Erreur:', error.message);
  }
}

// Vérifier les arguments
const args = process.argv.slice(2);

if (BOOKING_ID === 'REMPLACE_PAR_TON_BOOKING_ID') {
  console.log('⚠️  ATTENTION: Tu dois modifier le BOOKING_ID dans ce fichier!');
  console.log('');
  console.log('1. Ouvre test-tracking-simulation.js');
  console.log('2. Remplace "REMPLACE_PAR_TON_BOOKING_ID" par un vrai ID de réservation');
  console.log('3. Tu peux trouver l\'ID dans MongoDB ou dans les logs du backend');
  console.log('');
  process.exit(1);
}

if (args[0] === 'stop') {
  stopSimulation();
} else {
  startSimulation();
}
