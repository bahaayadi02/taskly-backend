import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Review, ReviewDocument } from '../schemas/review.schema';
import { User, UserDocument } from '../schemas/user.schema';
import axios from 'axios';

export interface ReviewSummary {
  workerId: string;
  workerName: string;
  workerJob: string;
  totalReviews: number;
  averageRating: number;
  summary: string;
  strengths: string[];
  areasToImprove: string[];
  keywords: string[];
  sentiment: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative';
  generatedAt: Date;
}

@Injectable()
export class AiService {
  private readonly openaiApiKey: string;
  private readonly useOpenAI: boolean;

  constructor(
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private configService: ConfigService,
  ) {
    this.openaiApiKey = this.configService.get<string>('OPENAI_API_KEY') || '';
    this.useOpenAI = !!this.openaiApiKey;
  }

  // Résumer les commentaires d'un réparateur
  async summarizeWorkerReviews(workerId: string): Promise<ReviewSummary> {
    // Récupérer le worker
    const worker = await this.userModel.findById(workerId).exec();
    if (!worker) {
      throw new NotFoundException('Worker not found');
    }

    // Récupérer tous les avis du worker
    const reviews = await this.reviewModel
      .find({ workerId: new Types.ObjectId(workerId) })
      .populate('customerId', 'fullName')
      .sort({ createdAt: -1 })
      .exec();

    if (reviews.length === 0) {
      return {
        workerId,
        workerName: worker.fullName,
        workerJob: worker.work || 'Unknown',
        totalReviews: 0,
        averageRating: 0,
        summary: 'Aucun avis disponible pour ce réparateur.',
        strengths: [],
        areasToImprove: [],
        keywords: [],
        sentiment: 'neutral',
        generatedAt: new Date(),
      };
    }

    // Calculer la moyenne
    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = Math.round((totalRating / reviews.length) * 10) / 10;

    // Extraire les commentaires
    const comments = reviews
      .filter(r => r.comment && r.comment.trim())
      .map(r => ({
        rating: r.rating,
        comment: r.comment,
      }));

    // Générer le résumé
    let summaryResult;
    if (this.useOpenAI) {
      summaryResult = await this.generateSummaryWithOpenAI(comments, worker.work || 'réparateur');
    } else {
      summaryResult = this.generateLocalSummary(comments, averageRating);
    }

    return {
      workerId,
      workerName: worker.fullName,
      workerJob: worker.work || 'Unknown',
      totalReviews: reviews.length,
      averageRating,
      ...summaryResult,
      generatedAt: new Date(),
    };
  }

  // Génération locale (sans API externe)
  private generateLocalSummary(
    comments: { rating: number; comment: string | undefined }[],
    averageRating: number,
  ): Omit<ReviewSummary, 'workerId' | 'workerName' | 'workerJob' | 'totalReviews' | 'averageRating' | 'generatedAt'> {
    
    // Analyse des mots-clés positifs et négatifs
    const positiveKeywords = [
      'excellent', 'parfait', 'professionnel', 'rapide', 'efficace', 'propre',
      'recommande', 'satisfait', 'qualité', 'ponctuel', 'compétent', 'soigné',
      'super', 'magnifique', 'impeccable', 'merci', 'bravo', 'top', 'génial',
    ];
    
    const negativeKeywords = [
      'lent', 'cher', 'retard', 'sale', 'mauvais', 'déçu', 'problème',
      'incompétent', 'arnaque', 'nul', 'horrible', 'jamais',
    ];

    const allText = comments.map(c => c.comment?.toLowerCase() || '').join(' ');
    
    // Trouver les mots-clés présents
    const foundPositive = positiveKeywords.filter(k => allText.includes(k));
    const foundNegative = negativeKeywords.filter(k => allText.includes(k));

    // Déterminer le sentiment
    let sentiment: ReviewSummary['sentiment'];
    if (averageRating >= 4.5) sentiment = 'very_positive';
    else if (averageRating >= 3.5) sentiment = 'positive';
    else if (averageRating >= 2.5) sentiment = 'neutral';
    else if (averageRating >= 1.5) sentiment = 'negative';
    else sentiment = 'very_negative';

    // Générer les points forts basés sur les commentaires
    const strengths: string[] = [];
    const areasToImprove: string[] = [];

    if (allText.includes('rapide') || allText.includes('efficace')) {
      strengths.push('Rapidité et efficacité');
    }
    if (allText.includes('professionnel') || allText.includes('compétent')) {
      strengths.push('Professionnalisme');
    }
    if (allText.includes('propre') || allText.includes('soigné')) {
      strengths.push('Travail propre et soigné');
    }
    if (allText.includes('ponctuel')) {
      strengths.push('Ponctualité');
    }
    if (allText.includes('prix') && (allText.includes('correct') || allText.includes('raisonnable'))) {
      strengths.push('Prix compétitifs');
    }
    if (allText.includes('conseil')) {
      strengths.push('Bons conseils');
    }
    if (allText.includes('qualité')) {
      strengths.push('Qualité du travail');
    }

    if (foundNegative.includes('lent') || foundNegative.includes('retard')) {
      areasToImprove.push('Améliorer la ponctualité');
    }
    if (foundNegative.includes('cher')) {
      areasToImprove.push('Revoir la tarification');
    }

    // Si pas assez de points forts trouvés, en ajouter des génériques
    if (strengths.length === 0 && averageRating >= 3) {
      strengths.push('Service apprécié par les clients');
    }

    // Générer le résumé textuel
    const positiveCount = comments.filter(c => c.rating >= 4).length;
    const negativeCount = comments.filter(c => c.rating <= 2).length;
    const totalComments = comments.length;

    let summary = '';
    
    if (averageRating >= 4.5) {
      summary = `Ce réparateur bénéficie d'excellentes évaluations avec une moyenne de ${averageRating}/5. `;
      summary += `Sur ${totalComments} avis, ${positiveCount} sont très positifs. `;
      summary += `Les clients apprécient particulièrement ${strengths.slice(0, 2).join(' et ').toLowerCase() || 'la qualité du service'}. `;
      summary += `Un professionnel hautement recommandé.`;
    } else if (averageRating >= 3.5) {
      summary = `Ce réparateur a de bonnes évaluations avec une moyenne de ${averageRating}/5. `;
      summary += `La majorité des ${totalComments} clients sont satisfaits. `;
      if (strengths.length > 0) {
        summary += `Points forts : ${strengths.slice(0, 2).join(', ').toLowerCase()}. `;
      }
      summary += `Un bon choix pour vos travaux.`;
    } else if (averageRating >= 2.5) {
      summary = `Ce réparateur a des avis mitigés avec une moyenne de ${averageRating}/5. `;
      summary += `Sur ${totalComments} avis, les retours sont partagés. `;
      if (areasToImprove.length > 0) {
        summary += `Des améliorations sont possibles concernant : ${areasToImprove.join(', ').toLowerCase()}.`;
      }
    } else {
      summary = `Ce réparateur a des évaluations à améliorer avec une moyenne de ${averageRating}/5. `;
      summary += `${negativeCount} avis sur ${totalComments} expriment des insatisfactions. `;
      summary += `Il est conseillé de consulter les avis détaillés avant de faire appel à ses services.`;
    }

    return {
      summary,
      strengths: strengths.slice(0, 5),
      areasToImprove: areasToImprove.slice(0, 3),
      keywords: [...new Set([...foundPositive, ...foundNegative])].slice(0, 10),
      sentiment,
    };
  }

  // Génération avec OpenAI (si clé API disponible)
  private async generateSummaryWithOpenAI(
    comments: { rating: number; comment: string | undefined }[],
    jobType: string,
  ): Promise<Omit<ReviewSummary, 'workerId' | 'workerName' | 'workerJob' | 'totalReviews' | 'averageRating' | 'generatedAt'>> {
    
    const commentsText = comments
      .map(c => `[${c.rating}/5] ${c.comment}`)
      .join('\n');

    const prompt = `Tu es un assistant qui analyse les avis clients pour un ${jobType}.

Voici les avis clients :
${commentsText}

Génère une analyse JSON avec :
- "summary": Un résumé de 2-3 phrases en français des avis
- "strengths": Liste de 3-5 points forts mentionnés
- "areasToImprove": Liste de 0-3 points à améliorer (si applicable)
- "keywords": Liste de 5-10 mots-clés importants
- "sentiment": "very_positive", "positive", "neutral", "negative", ou "very_negative"

Réponds uniquement avec le JSON, sans markdown.`;

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'Tu es un assistant d\'analyse de commentaires. Réponds uniquement en JSON valide.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 500,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const content = response.data.choices[0].message.content;
      const parsed = JSON.parse(content);

      return {
        summary: parsed.summary || 'Résumé non disponible',
        strengths: parsed.strengths || [],
        areasToImprove: parsed.areasToImprove || [],
        keywords: parsed.keywords || [],
        sentiment: parsed.sentiment || 'neutral',
      };
    } catch (error) {
      console.error('OpenAI API error:', error);
      // Fallback to local summary
      const avgRating = comments.reduce((sum, c) => sum + c.rating, 0) / comments.length;
      return this.generateLocalSummary(comments, avgRating);
    }
  }

  // Obtenir un résumé rapide (version courte)
  async getQuickSummary(workerId: string): Promise<{ rating: number; summary: string; reviewCount: number }> {
    const worker = await this.userModel.findById(workerId).exec();
    if (!worker) {
      throw new NotFoundException('Worker not found');
    }

    const reviews = await this.reviewModel
      .find({ workerId: new Types.ObjectId(workerId) })
      .exec();

    if (reviews.length === 0) {
      return {
        rating: 0,
        summary: 'Nouveau sur la plateforme - Aucun avis',
        reviewCount: 0,
      };
    }

    const avgRating = Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10;
    
    let summary = '';
    if (avgRating >= 4.5) summary = 'Excellent - Très recommandé';
    else if (avgRating >= 4) summary = 'Très bien - Clients satisfaits';
    else if (avgRating >= 3.5) summary = 'Bien - Bon service';
    else if (avgRating >= 3) summary = 'Correct - Avis mitigés';
    else summary = 'À améliorer';

    return {
      rating: avgRating,
      summary,
      reviewCount: reviews.length,
    };
  }
}


// Interface pour le résultat d'analyse de CV
export interface CvAnalysisResult {
  fullName?: string;
  phone?: string;
  email?: string;
  address?: string;
  work?: string;
  yearsOfExperience?: number;
  skills?: string[];
  aboutMe?: string;
  education?: string[];
  languages?: string[];
  certifications?: string[];
  extractedText?: string;
}

// Extension du service AI pour l'analyse de CV
@Injectable()
export class AiCvService {
  private readonly geminiApiKey: string;
  private readonly openaiApiKey: string;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private configService: ConfigService,
  ) {
    this.geminiApiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    this.openaiApiKey = this.configService.get<string>('OPENAI_API_KEY') || '';
    
    console.log('🔑 Gemini API Key configured:', this.geminiApiKey ? 'YES' : 'NO');
    console.log('🔑 OpenAI API Key configured:', this.openaiApiKey ? 'YES' : 'NO');
  }

  // Analyser un CV et extraire les informations
  async analyzeCv(cvImage: string, workerId?: string): Promise<CvAnalysisResult> {
    let result: CvAnalysisResult;

    // Check for API keys at runtime
    const geminiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    const openaiKey = this.configService.get<string>('OPENAI_API_KEY') || '';
    
    console.log('🔍 analyzeCv called');
    console.log('🔍 cvImage length:', cvImage?.length || 0);

    // Prefer Gemini (free) over OpenAI
    if (geminiKey && geminiKey !== 'your-gemini-api-key-here') {
      console.log('🚀 Using Google Gemini (FREE) for CV analysis...');
      result = await this.analyzeCvWithGemini(cvImage, geminiKey);
    } else if (openaiKey && openaiKey.startsWith('sk-')) {
      console.log('🚀 Using OpenAI Vision API for CV analysis...');
      result = await this.analyzeCvWithOpenAI(cvImage, openaiKey);
    } else {
      console.log('⚠️ No AI API configured, using local fallback...');
      result = this.analyzeCvLocally(cvImage);
    }

    // Si workerId fourni, mettre à jour le profil du worker
    if (workerId && Object.keys(result).length > 0) {
      await this.updateWorkerProfile(workerId, result);
    }

    return result;
  }

  // Analyse locale (fallback sans API)
  private analyzeCvLocally(cvImage: string): CvAnalysisResult {
    console.log('⚠️ No AI API configured - CV analysis requires Gemini or OpenAI API key');
    
    return {
      skills: [],
      aboutMe: 'Veuillez configurer une clé API (Gemini gratuit ou OpenAI) pour l\'analyse de CV.',
      education: [],
      languages: [],
      certifications: [],
      yearsOfExperience: 0,
    };
  }

  // Analyse avec Google Gemini (GRATUIT!)
  private async analyzeCvWithGemini(cvImage: string, apiKey: string): Promise<CvAnalysisResult> {
    const prompt = `Tu es un expert en analyse de CV. Analyse attentivement cette image de CV et extrait TOUTES les informations visibles.

INSTRUCTIONS IMPORTANTES:
1. Lis TOUT le texte visible sur l'image du CV
2. Extrait les compétences EXACTEMENT comme elles sont écrites
3. Pour les années d'expérience: calcule à partir des dates. Si tu vois "2018-2024", c'est 6 ans.
4. Liste TOUTES les compétences techniques mentionnées

Retourne UNIQUEMENT un JSON valide avec ces champs:
{
  "fullName": "Nom complet",
  "phone": "Numéro de téléphone",
  "email": "Email",
  "address": "Adresse",
  "work": "Métier principal",
  "yearsOfExperience": nombre_entier,
  "skills": ["compétence 1", "compétence 2", ...],
  "aboutMe": "Résumé professionnel en 2-3 phrases",
  "education": ["diplôme 1", "diplôme 2", ...],
  "languages": ["Français", "Arabe", ...],
  "certifications": ["certification 1", ...]
}

IMPORTANT: Réponds UNIQUEMENT avec le JSON, sans texte avant ou après.`;

    try {
      // Préparer l'image base64
      let base64Data = cvImage;
      if (cvImage.includes('base64,')) {
        base64Data = cvImage.split('base64,')[1];
      }

      console.log('🔑 Using Gemini API key:', apiKey.substring(0, 10) + '...');

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: base64Data,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2000,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      const content = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
      console.log('📄 Gemini CV Analysis raw response:', content);

      if (!content) {
        throw new Error('No content in Gemini response');
      }

      // Nettoyer et parser le JSON
      let cleanedContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      // Trouver le JSON dans la réponse
      const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedContent = jsonMatch[0];
      }

      const result = JSON.parse(cleanedContent);
      console.log('✅ Parsed Gemini CV Analysis result:', result);

      return {
        fullName: result.fullName || undefined,
        phone: result.phone || undefined,
        email: result.email || undefined,
        address: result.address || undefined,
        work: result.work || undefined,
        yearsOfExperience: typeof result.yearsOfExperience === 'number' ? result.yearsOfExperience : parseInt(result.yearsOfExperience) || undefined,
        skills: Array.isArray(result.skills) ? result.skills.filter((s: any) => typeof s === 'string' && s.trim()) : [],
        aboutMe: result.aboutMe || undefined,
        education: Array.isArray(result.education) ? result.education.filter((e: any) => typeof e === 'string' && e.trim()) : [],
        languages: Array.isArray(result.languages) ? result.languages.filter((l: any) => typeof l === 'string' && l.trim()) : [],
        certifications: Array.isArray(result.certifications) ? result.certifications.filter((c: any) => typeof c === 'string' && c.trim()) : [],
      };
    } catch (error) {
      console.error('❌ Gemini API error:', error.response?.data || error.message || error);
      return this.analyzeCvLocally(cvImage);
    }
  }

  // Analyse avec OpenAI Vision API
  private async analyzeCvWithOpenAI(cvImage: string, apiKeyOverride?: string): Promise<CvAnalysisResult> {
    const apiKey = apiKeyOverride || this.openaiApiKey;
    const prompt = `Tu es un expert en analyse de CV. Analyse attentivement cette image de CV et extrait TOUTES les informations visibles.

INSTRUCTIONS IMPORTANTES:
1. Lis TOUT le texte visible sur l'image du CV
2. Extrait les compétences EXACTEMENT comme elles sont écrites (ex: "Installation de systèmes connectés", "Câblage électrique", etc.)
3. Pour les années d'expérience: calcule à partir des dates de début et fin des expériences professionnelles. Si tu vois "2018-2024", c'est 6 ans d'expérience.
4. Liste TOUTES les compétences techniques mentionnées, pas juste les titres de section

Retourne un JSON avec ces champs:
{
  "fullName": "Nom complet de la personne",
  "phone": "Numéro de téléphone",
  "email": "Adresse email",
  "address": "Adresse complète",
  "work": "Métier/Profession principale (ex: Électricien, Plombier, etc.)",
  "yearsOfExperience": nombre_entier_calculé_depuis_les_dates,
  "skills": ["compétence exacte 1", "compétence exacte 2", "compétence exacte 3", ...],
  "aboutMe": "Résumé professionnel en 2-3 phrases basé sur le profil",
  "education": ["diplôme 1 - établissement - année", "diplôme 2", ...],
  "languages": ["Français", "Arabe", "Anglais", ...],
  "certifications": ["certification 1", "certification 2", ...]
}

RÈGLES:
- Extrait les compétences TEXTUELLEMENT comme écrites sur le CV
- Calcule yearsOfExperience en soustrayant l'année de début de la première expérience de l'année actuelle (2024)
- Si plusieurs expériences, additionne les durées ou prends la plus ancienne date de début
- Ne traduis pas les compétences, garde-les dans la langue du CV
- Réponds UNIQUEMENT avec le JSON, sans markdown ni explication`;

    try {
      // Préparer l'image (base64 ou URL)
      let imageContent: any;
      if (cvImage.startsWith('http')) {
        imageContent = { type: 'image_url', image_url: { url: cvImage } };
      } else {
        // Nettoyer le base64 si nécessaire
        const base64Data = cvImage.replace(/^data:image\/\w+;base64,/, '');
        imageContent = { 
          type: 'image_url', 
          image_url: { url: `data:image/jpeg;base64,${base64Data}` } 
        };
      }

      console.log('🔑 Using API key:', apiKey.substring(0, 15) + '...');
      
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o',  // Using gpt-4o for better vision capabilities
          messages: [
            {
              role: 'system',
              content: 'Tu es un expert en analyse de CV. Tu extrais les informations avec précision et exactitude. Tu réponds uniquement en JSON valide.',
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                imageContent,
              ],
            },
          ],
          max_tokens: 2000,
          temperature: 0.1,  // Low temperature for more accurate extraction
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const content = response.data.choices[0].message.content;
      console.log('📄 OpenAI CV Analysis raw response:', content);
      
      // Nettoyer et parser le JSON
      let cleanedContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      // Essayer de trouver le JSON dans la réponse si ce n'est pas du JSON pur
      const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedContent = jsonMatch[0];
      }
      
      const result = JSON.parse(cleanedContent);
      console.log('✅ Parsed CV Analysis result:', result);
      
      // Valider et nettoyer le résultat
      return {
        fullName: result.fullName || undefined,
        phone: result.phone || undefined,
        email: result.email || undefined,
        address: result.address || undefined,
        work: result.work || undefined,
        yearsOfExperience: typeof result.yearsOfExperience === 'number' ? result.yearsOfExperience : parseInt(result.yearsOfExperience) || undefined,
        skills: Array.isArray(result.skills) ? result.skills.filter((s: any) => typeof s === 'string' && s.trim()) : [],
        aboutMe: result.aboutMe || undefined,
        education: Array.isArray(result.education) ? result.education.filter((e: any) => typeof e === 'string' && e.trim()) : [],
        languages: Array.isArray(result.languages) ? result.languages.filter((l: any) => typeof l === 'string' && l.trim()) : [],
        certifications: Array.isArray(result.certifications) ? result.certifications.filter((c: any) => typeof c === 'string' && c.trim()) : [],
      };
    } catch (error) {
      const errorData = error.response?.data;
      console.error('❌ OpenAI Vision API error:', errorData || error.message || error);
      
      // Check for specific error types
      if (errorData?.error?.code === 'insufficient_quota') {
        console.error('💳 OpenAI API quota exceeded - please add credits to your account');
        return {
          skills: [],
          aboutMe: 'Erreur: Quota API OpenAI dépassé. Veuillez contacter l\'administrateur.',
          education: [],
          languages: [],
          certifications: [],
          yearsOfExperience: 0,
        };
      }
      
      return this.analyzeCvLocally(cvImage);
    }
  }

  // Mettre à jour le profil du worker avec les données extraites
  private async updateWorkerProfile(workerId: string, data: CvAnalysisResult): Promise<void> {
    const updateData: any = {};

    if (data.skills && data.skills.length > 0) {
      updateData.skills = data.skills;
    }
    if (data.yearsOfExperience) {
      updateData.yearsOfExperience = data.yearsOfExperience;
    }
    if (data.aboutMe) {
      updateData.aboutMe = data.aboutMe;
    }
    if (data.work) {
      updateData.work = data.work;
    }
    if (data.address) {
      updateData.address = data.address;
    }

    // Calculer le pourcentage de complétion
    const worker = await this.userModel.findById(workerId).exec();
    if (worker) {
      let completionScore = 50; // Base score
      if (updateData.skills?.length > 0) completionScore += 15;
      if (updateData.yearsOfExperience) completionScore += 10;
      if (updateData.aboutMe) completionScore += 15;
      if (worker.cvUrl) completionScore += 10;
      updateData.profileCompletionPercentage = Math.min(completionScore, 100);
    }

    if (Object.keys(updateData).length > 0) {
      await this.userModel.findByIdAndUpdate(workerId, updateData).exec();
    }
  }

  // Obtenir les suggestions de compétences basées sur le métier
  getSkillSuggestions(work: string): string[] {
    const skillsMap: { [key: string]: string[] } = {
      'Electrician': ['Câblage électrique', 'Installation tableau', 'Dépannage', 'Domotique', 'Panneaux solaires'],
      'Plumber': ['Plomberie sanitaire', 'Chauffage', 'Débouchage', 'Installation chauffe-eau', 'Réparation fuites'],
      'Carpenter': ['Menuiserie', 'Ébénisterie', 'Pose parquet', 'Fabrication meubles', 'Restauration'],
      'Painter': ['Peinture intérieure', 'Peinture extérieure', 'Décoration', 'Enduits', 'Papier peint'],
      'Mechanic': ['Mécanique auto', 'Diagnostic', 'Vidange', 'Freins', 'Climatisation auto'],
      'Cleaner': ['Nettoyage profond', 'Vitres', 'Désinfection', 'Repassage', 'Organisation'],
      'Gardener': ['Taille', 'Tonte', 'Plantation', 'Arrosage automatique', 'Aménagement paysager'],
      'HVAC Technician': ['Climatisation', 'Chauffage', 'Ventilation', 'Pompe à chaleur', 'Maintenance'],
      'Mason': ['Maçonnerie', 'Béton', 'Carrelage', 'Rénovation', 'Construction'],
      'Welder': ['Soudure MIG', 'Soudure TIG', 'Soudure arc', 'Métallerie', 'Ferronnerie'],
    };

    return skillsMap[work] || ['Compétence 1', 'Compétence 2', 'Compétence 3'];
  }
}
