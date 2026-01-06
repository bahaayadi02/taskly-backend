import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model, Types } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { User } from '../schemas/user.schema';
import { Review } from '../schemas/review.schema';
import * as bcrypt from 'bcryptjs';

// Clients de test pour laisser des avis
const testCustomers = [
  { fullName: 'Sami Bouslama', email: 'sami.customer@taskly.com', phone: '+216 98 100 001' },
  { fullName: 'Hela Mrad', email: 'hela.customer@taskly.com', phone: '+216 97 100 002' },
  { fullName: 'Amine Jaziri', email: 'amine.customer@taskly.com', phone: '+216 99 100 003' },
  { fullName: 'Rania Sfar', email: 'rania.customer@taskly.com', phone: '+216 98 100 004' },
  { fullName: 'Yassine Karray', email: 'yassine.customer@taskly.com', phone: '+216 97 100 005' },
  { fullName: 'Nesrine Haddad', email: 'nesrine.customer@taskly.com', phone: '+216 99 100 006' },
  { fullName: 'Oussama Feki', email: 'oussama.customer@taskly.com', phone: '+216 98 100 007' },
  { fullName: 'Amani Triki', email: 'amani.customer@taskly.com', phone: '+216 97 100 008' },
];

// Commentaires positifs variés par métier
const reviewTemplates: { [key: string]: { comments: string[], responses: string[] } } = {
  'Electrician': {
    comments: [
      'Excellent travail ! Installation électrique parfaite et très propre.',
      'Très professionnel, a résolu mon problème de court-circuit rapidement.',
      'Je recommande vivement ! Travail soigné et prix raisonnable.',
      'Ponctuel et efficace. Mon tableau électrique fonctionne parfaitement.',
      'Super service, il a même donné des conseils pour économiser l\'énergie.',
    ],
    responses: [
      'Merci beaucoup pour votre confiance ! À votre service.',
      'Ravi d\'avoir pu vous aider. N\'hésitez pas à me recontacter.',
      'Merci pour cet avis positif ! La satisfaction client est ma priorité.',
    ]
  },
  'Plumber': {
    comments: [
      'Fuite réparée en moins d\'une heure. Très compétent !',
      'Installation de ma nouvelle salle de bain impeccable.',
      'Intervention rapide pour une urgence. Merci !',
      'Travail de qualité, je recommande sans hésitation.',
      'Très bon plombier, propre et efficace.',
    ],
    responses: [
      'Merci ! Je suis disponible 24/7 pour les urgences.',
      'Content que le travail vous plaise. À bientôt !',
      'Merci pour votre confiance !',
    ]
  },
  'Carpenter': {
    comments: [
      'Magnifique travail sur mes placards sur mesure !',
      'Artisan talentueux, ma cuisine est transformée.',
      'Qualité exceptionnelle du bois et des finitions.',
      'Très créatif et à l\'écoute de mes besoins.',
      'Je suis ravi de mon nouveau dressing. Parfait !',
    ],
    responses: [
      'Merci ! C\'est un plaisir de créer des meubles uniques.',
      'Ravi que le résultat vous plaise !',
      'Merci pour votre confiance. Le bois est ma passion.',
    ]
  },
  'Painter': {
    comments: [
      'Peinture parfaite, couleurs exactement comme je voulais.',
      'Travail propre et soigné. Aucune tache !',
      'Très bon conseil sur les couleurs. Résultat magnifique.',
      'Rapide et efficace. Mon salon est transformé.',
      'Excellent rapport qualité-prix. Je recommande.',
    ],
    responses: [
      'Merci ! Les couleurs font toute la différence.',
      'Ravi d\'avoir transformé votre espace !',
      'Merci pour cet avis. À votre service !',
    ]
  },
  'Mechanic': {
    comments: [
      'Diagnostic précis et réparation rapide. Ma voiture roule comme neuve.',
      'Honnête et compétent. Prix très correct.',
      'Excellent mécanicien, je lui fais confiance pour ma voiture.',
      'Service rapide et professionnel. Merci !',
      'Très bon travail sur ma vidange et mes freins.',
    ],
    responses: [
      'Merci ! La sécurité de votre véhicule est ma priorité.',
      'Content que vous soyez satisfait. À bientôt pour l\'entretien !',
      'Merci pour votre confiance !',
    ]
  },
  'Cleaner': {
    comments: [
      'Appartement impeccable après son passage !',
      'Très minutieuse, même les coins difficiles sont propres.',
      'Service régulier de qualité. Je recommande.',
      'Ponctuelle et efficace. Maison brillante !',
      'Excellent travail de nettoyage après travaux.',
    ],
    responses: [
      'Merci ! Un espace propre, c\'est un espace sain.',
      'Ravie que vous soyez satisfait(e) !',
      'Merci pour votre confiance continue.',
    ]
  },
  'Gardener': {
    comments: [
      'Mon jardin n\'a jamais été aussi beau !',
      'Excellent travail de taille et d\'entretien.',
      'Très bon conseil sur les plantes adaptées au climat.',
      'Pelouse parfaite et haies bien taillées.',
      'Créatif et professionnel. Jardin transformé !',
    ],
    responses: [
      'Merci ! J\'aime voir les jardins s\'épanouir.',
      'Ravi que votre jardin vous plaise !',
      'Merci ! La nature est ma passion.',
    ]
  },
  'HVAC Technician': {
    comments: [
      'Climatisation installée rapidement. Fonctionne parfaitement.',
      'Réparation efficace, il fait enfin frais chez moi !',
      'Très compétent, a optimisé mon système de chauffage.',
      'Service professionnel et prix correct.',
      'Entretien annuel bien fait. Je recommande.',
    ],
    responses: [
      'Merci ! Votre confort est ma priorité.',
      'Ravi d\'avoir résolu votre problème de climatisation.',
      'Merci pour votre confiance !',
    ]
  },
  'Mason': {
    comments: [
      'Mur construit solidement et avec précision.',
      'Excellent travail de rénovation. Très satisfait.',
      'Professionnel et expérimenté. Travail impeccable.',
      'Carrelage posé parfaitement. Merci !',
      'Travaux de maçonnerie de grande qualité.',
    ],
    responses: [
      'Merci ! La solidité est la base de tout.',
      'Ravi que le travail vous satisfasse.',
      'Merci pour votre confiance !',
    ]
  },
  'Welder': {
    comments: [
      'Portail magnifique et très solide.',
      'Soudure parfaite, travail de pro.',
      'Grille de sécurité bien faite. Merci !',
      'Très bon travail sur ma rampe d\'escalier.',
      'Créatif et précis. Je recommande.',
    ],
    responses: [
      'Merci ! Le métal, c\'est mon domaine.',
      'Ravi que le portail vous plaise !',
      'Merci pour votre confiance !',
    ]
  },
  'Locksmith': {
    comments: [
      'Intervention rapide quand j\'étais bloqué dehors. Merci !',
      'Serrure changée rapidement et efficacement.',
      'Très professionnel, bon conseil sur la sécurité.',
      'Service 24h très appréciable. Recommandé !',
      'Installation de serrure haute sécurité parfaite.',
    ],
    responses: [
      'Merci ! Disponible 24/7 pour vos urgences.',
      'Ravi d\'avoir pu vous aider rapidement.',
      'Votre sécurité est ma priorité !',
    ]
  },
  'Tiler': {
    comments: [
      'Carrelage posé avec une précision incroyable.',
      'Salle de bain magnifique. Travail d\'artiste !',
      'Joints parfaits, très satisfait du résultat.',
      'Professionnel et soigné. Je recommande.',
      'Excellent travail sur ma terrasse.',
    ],
    responses: [
      'Merci ! La précision fait la différence.',
      'Ravi que votre salle de bain vous plaise !',
      'Merci pour votre confiance !',
    ]
  },
  'Roofer': {
    comments: [
      'Toiture réparée, plus aucune fuite !',
      'Travail rapide malgré la météo difficile.',
      'Très professionnel, isolation parfaite.',
      'Gouttières installées proprement. Merci !',
      'Excellent travail d\'étanchéité.',
    ],
    responses: [
      'Merci ! Un toit solide, c\'est essentiel.',
      'Ravi d\'avoir résolu vos problèmes de fuite.',
      'Merci pour votre confiance !',
    ]
  },
  'Glazier': {
    comments: [
      'Vitres remplacées rapidement après le cambriolage.',
      'Douche en verre magnifique. Très satisfait.',
      'Miroir sur mesure parfait. Merci !',
      'Travail propre et précis.',
      'Fenêtres double vitrage bien installées.',
    ],
    responses: [
      'Merci ! Le verre apporte lumière et élégance.',
      'Ravi que la douche vous plaise !',
      'Merci pour votre confiance !',
    ]
  },
  'Appliance Repair': {
    comments: [
      'Machine à laver réparée en une heure. Super !',
      'Frigo fonctionne à nouveau. Merci !',
      'Diagnostic rapide et réparation efficace.',
      'Très compétent sur tous les appareils.',
      'Prix honnête et travail de qualité.',
    ],
    responses: [
      'Merci ! Je répare toutes les marques.',
      'Ravi d\'avoir sauvé votre frigo !',
      'Merci pour votre confiance !',
    ]
  },
  'Upholsterer': {
    comments: [
      'Mon vieux canapé est comme neuf !',
      'Travail artisanal de grande qualité.',
      'Tissus magnifiques et finitions parfaites.',
      'Chaises de salle à manger transformées. Merci !',
      'Très bon conseil sur les matériaux.',
    ],
    responses: [
      'Merci ! Donner une seconde vie aux meubles, c\'est ma passion.',
      'Ravi que votre canapé vous plaise à nouveau !',
      'Merci pour votre confiance !',
    ]
  },
  'Flooring Specialist': {
    comments: [
      'Parquet posé magnifiquement. Très satisfait.',
      'Travail propre et rapide.',
      'Sol stratifié parfait. Merci !',
      'Excellent conseil sur le type de sol.',
      'Finitions impeccables.',
    ],
    responses: [
      'Merci ! Un beau sol change tout.',
      'Ravi que le parquet vous plaise !',
      'Merci pour votre confiance !',
    ]
  },
  'Interior Decorator': {
    comments: [
      'Appartement complètement transformé. Magnifique !',
      'Excellent goût et très à l\'écoute.',
      'Conseils précieux sur l\'aménagement.',
      'Résultat au-delà de mes attentes.',
      'Créative et professionnelle. Je recommande.',
    ],
    responses: [
      'Merci ! Créer des espaces de vie, c\'est ma passion.',
      'Ravie que votre intérieur vous plaise !',
      'Merci pour votre confiance !',
    ]
  },
  'Pest Control': {
    comments: [
      'Plus de cafards ! Traitement très efficace.',
      'Intervention discrète et professionnelle.',
      'Problème de souris résolu définitivement.',
      'Très bon suivi après traitement.',
      'Service rapide et efficace. Merci !',
    ],
    responses: [
      'Merci ! Votre tranquillité est ma priorité.',
      'Ravi d\'avoir résolu votre problème.',
      'Merci pour votre confiance !',
    ]
  },
  'Moving Services': {
    comments: [
      'Déménagement parfait, rien de cassé !',
      'Équipe efficace et respectueuse.',
      'Très bien organisé. Merci !',
      'Meubles bien protégés pendant le transport.',
      'Service professionnel à prix correct.',
    ],
    responses: [
      'Merci ! Vos biens sont précieux pour nous.',
      'Ravi que le déménagement se soit bien passé !',
      'Merci pour votre confiance !',
    ]
  }
};

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomDate(daysAgo: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - getRandomInt(1, daysAgo));
  return date;
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userModel = app.get<Model<User>>(getModelToken(User.name));
  const reviewModel = app.get<Model<Review>>(getModelToken(Review.name));

  try {
    console.log('🚀 Starting reviews seeding...\n');

    // 1. Créer les clients de test
    console.log('👥 Creating test customers...');
    const hashedPassword = await bcrypt.hash('Test@1234', 10);
    const customerIds: Types.ObjectId[] = [];

    for (const customer of testCustomers) {
      let existingCustomer = await userModel.findOne({ email: customer.email });
      
      if (!existingCustomer) {
        existingCustomer = await userModel.create({
          ...customer,
          password: hashedPassword,
          role: 'customer',
          isActive: true,
          isEmailVerified: true,
          address: 'Tunis, Tunisia',
          latitude: 36.8065,
          longitude: 10.1815,
        });
        console.log(`   ✅ Created customer: ${customer.fullName}`);
      } else {
        console.log(`   ⏭️  Customer exists: ${customer.fullName}`);
      }
      customerIds.push(existingCustomer._id as Types.ObjectId);
    }

    // 2. Récupérer tous les workers
    console.log('\n👷 Fetching workers...');
    const workers = await userModel.find({ role: 'worker' });
    console.log(`   Found ${workers.length} workers`);

    // 3. Créer des avis pour chaque worker
    console.log('\n⭐ Creating reviews...\n');
    let totalReviews = 0;

    for (const worker of workers) {
      const workType = worker.work || 'Electrician';
      const templates = reviewTemplates[workType] || reviewTemplates['Electrician'];
      
      // Nombre d'avis aléatoire entre 2 et 5 par worker
      const numReviews = getRandomInt(2, 5);
      
      // Sélectionner des clients aléatoires pour les avis
      const shuffledCustomers = [...customerIds].sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < numReviews && i < shuffledCustomers.length; i++) {
        const customerId = shuffledCustomers[i];
        
        // Vérifier si cet avis existe déjà
        const existingReview = await reviewModel.findOne({
          customerId,
          workerId: worker._id,
        });

        if (existingReview) {
          continue;
        }

        // Rating entre 3 et 5 (majoritairement positif)
        const rating = getRandomInt(3, 5);
        const comment = getRandomElement(templates.comments);
        
        // 60% de chance d'avoir une réponse du worker
        const hasResponse = Math.random() < 0.6;
        const reviewDate = getRandomDate(90);

        const reviewData: any = {
          customerId,
          workerId: worker._id,
          rating,
          comment,
          photos: [],
          isEdited: false,
          createdAt: reviewDate,
          updatedAt: reviewDate,
        };

        if (hasResponse) {
          reviewData.workerResponse = getRandomElement(templates.responses);
          reviewData.workerRespondedAt = new Date(reviewDate.getTime() + getRandomInt(1, 48) * 60 * 60 * 1000);
        }

        await reviewModel.create(reviewData);
        totalReviews++;
      }
      
      console.log(`   ✅ ${worker.fullName} (${workType}): reviews added`);
    }

    console.log('\n' + '='.repeat(50));
    console.log(`\n🎉 Seeding completed!`);
    console.log(`   👥 Customers: ${testCustomers.length}`);
    console.log(`   👷 Workers: ${workers.length}`);
    console.log(`   ⭐ Reviews created: ${totalReviews}`);
    console.log('\n📧 All test users can login with password: Test@1234\n');

  } catch (error) {
    console.error('❌ Error seeding reviews:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
