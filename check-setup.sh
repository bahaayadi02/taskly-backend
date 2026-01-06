#!/bin/bash

echo "🔍 Vérification de l'environnement Live Tracking"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Compteur
ERRORS=0

# 1. Vérifier Node.js
echo -n "📦 Node.js... "
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓${NC} $NODE_VERSION"
else
    echo -e "${RED}✗ Non installé${NC}"
    ERRORS=$((ERRORS + 1))
fi

# 2. Vérifier npm
echo -n "📦 npm... "
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}✓${NC} v$NPM_VERSION"
else
    echo -e "${RED}✗ Non installé${NC}"
    ERRORS=$((ERRORS + 1))
fi

# 3. Vérifier MongoDB
echo -n "🗄️  MongoDB... "
if command -v mongosh &> /dev/null || command -v mongo &> /dev/null; then
    if pgrep -x "mongod" > /dev/null; then
        echo -e "${GREEN}✓ En cours d'exécution${NC}"
    else
        echo -e "${YELLOW}⚠ Installé mais non démarré${NC}"
        echo "   Lance: brew services start mongodb-community"
    fi
else
    echo -e "${RED}✗ Non installé${NC}"
    ERRORS=$((ERRORS + 1))
fi

# 4. Vérifier les dépendances npm
echo -n "📚 node_modules... "
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓ Installés${NC}"
else
    echo -e "${RED}✗ Manquants${NC}"
    echo "   Lance: npm install"
    ERRORS=$((ERRORS + 1))
fi

# 5. Vérifier le fichier .env
echo -n "⚙️  .env... "
if [ -f ".env" ]; then
    echo -e "${GREEN}✓ Présent${NC}"
else
    echo -e "${YELLOW}⚠ Manquant${NC}"
    echo "   Crée un fichier .env avec MONGODB_URI"
fi

# 6. Vérifier les scripts de test
echo -n "🧪 Scripts de test... "
if [ -f "test-tracking-live.js" ] && [ -f "quick-test.sh" ]; then
    echo -e "${GREEN}✓ Présents${NC}"
else
    echo -e "${RED}✗ Manquants${NC}"
    ERRORS=$((ERRORS + 1))
fi

# 7. Vérifier si le backend est démarré
echo -n "🚀 Backend... "
if curl -s http://localhost:3000/api/v1/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ En cours d'exécution${NC}"
else
    echo -e "${YELLOW}⚠ Non démarré${NC}"
    echo "   Lance: npm run start:dev"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ Tout est prêt !${NC}"
    echo ""
    echo "Pour tester le tracking :"
    echo "  1. Lance le backend: npm run start:dev"
    echo "  2. Lance la simulation: ./quick-test.sh"
    echo "  3. Ouvre l'app iOS et va sur le tracking"
else
    echo -e "${RED}❌ $ERRORS erreur(s) détectée(s)${NC}"
    echo ""
    echo "Corrige les erreurs ci-dessus avant de continuer."
fi

echo ""
