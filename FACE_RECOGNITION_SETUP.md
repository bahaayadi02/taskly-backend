# 🎭 Face Recognition Setup - Taskly Backend

## 📋 Installation

### 1. Installer les dépendances Python

```bash
cd "Backend NestJs/taskly-backend"

# Installer face_recognition
pip3 install face-recognition opencv-python
```

### 2. Tester le script Python

```bash
# Test avec deux images
python3 python-scripts/face_compare.py test1.jpg test2.jpg

# Test de détection
python3 python-scripts/face_compare.py --detect test.jpg
```

### 3. Créer les dossiers nécessaires

```bash
mkdir -p uploads/face-verification
mkdir -p uploads/face-detection
```

### 4. Redémarrer le backend

```bash
npm run start:dev
```

## 🧪 Test de l'API

### Test 1 : Vérification de visages

```bash
# Prépare deux images
cp ~/Photos/profile.jpg .
cp ~/Photos/selfie.jpg .

# Lance le test
node test-face-recognition.js profile.jpg selfie.jpg
```

### Test 2 : Via curl

```bash
curl -X POST http://localhost:3000/api/v1/face-recognition/verify \
  -F "images=@profile.jpg" \
  -F "images=@selfie.jpg"
```

## 📊 Résultat Attendu

### Si MATCH (même personne)

```json
{
  "success": true,
  "message": "Face verification successful",
  "data": {
    "match": true,
    "confidence": 95,
    "distance": 0.05
  }
}
```

### Si NO MATCH (personne différente)

```json
{
  "success": true,
  "message": "Face verification failed",
  "data": {
    "match": false,
    "confidence": 45,
    "distance": 0.55
  }
}
```

## 🔧 Configuration

### Ajuster la tolérance

Dans `face-recognition.service.ts` :

```typescript
// Plus strict (moins de faux positifs)
const tolerance = 0.5;

// Moins strict (moins de faux négatifs)
const tolerance = 0.7;

// Défaut (équilibré)
const tolerance = 0.6;
```

## 📱 Intégration iOS

### Endpoint pour Sign Up

```
POST /api/v1/face-recognition/verify
Content-Type: multipart/form-data

images: [profile_photo, selfie]
```

### Réponse

```typescript
{
  success: boolean;
  message: string;
  data: {
    match: boolean;
    confidence: number; // 0-100
    distance: number;   // 0-1
  }
}
```

## 🎯 Utilisation dans Sign Up

### Flow

```
1. User uploads profile photo
   ↓
2. User takes selfie
   ↓
3. App sends both to /face-recognition/verify
   ↓
4. Backend compares faces
   ↓
5. If MATCH → Allow sign up
   If NO MATCH → Reject sign up
```

## 🐛 Troubleshooting

### "No module named 'face_recognition'"

```bash
pip3 install face-recognition
```

### "Python script not found"

```bash
# Vérifie que le script existe
ls python-scripts/face_compare.py

# Rend-le exécutable
chmod +x python-scripts/face_compare.py
```

### "No face found in image"

- Utilise des photos de face
- Bonne luminosité
- Visage bien visible

## 📝 Logs

```
🔍 [Face Recognition] Comparing faces...
   Profile: uploads/face-verification/profile-123.jpg
   Selfie: uploads/face-verification/selfie-456.jpg
✅ [Face Recognition] Result: { match: true, confidence: 0.95 }
```

## ✅ Checklist

- [ ] Python 3.7+ installé
- [ ] face_recognition installé
- [ ] Dossiers uploads créés
- [ ] Backend redémarré
- [ ] Test API réussi
- [ ] Prêt pour intégration iOS

## 🚀 Prêt !

L'API de reconnaissance faciale est maintenant prête à être utilisée dans l'app iOS !
