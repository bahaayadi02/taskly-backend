#!/bin/bash

# Script de test rapide du Live Tracking
# Usage: ./quick-test.sh

echo "🗺️  Live Tracking - Quick Test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Vérifier si le backend est démarré
echo "🔍 Vérification du backend..."
if curl -s http://localhost:3000/api/v1/health > /dev/null 2>&1; then
    echo "✅ Backend OK"
else
    echo "❌ Backend non démarré!"
    echo "   Lance: npm run start:dev"
    exit 1
fi

echo ""
echo "📋 Récupération d'un booking..."

# Récupérer le premier booking
BOOKING_ID=$(curl -s http://localhost:3000/api/v1/bookings | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$BOOKING_ID" ]; then
    echo "❌ Aucun booking trouvé!"
    echo "   Crée une réservation via l'app iOS d'abord"
    exit 1
fi

echo "✅ Booking trouvé: $BOOKING_ID"
echo ""
echo "🚀 Lancement de la simulation..."
echo ""

# Lancer la simulation
node test-tracking-live.js "$BOOKING_ID"
