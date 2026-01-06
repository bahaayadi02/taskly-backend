import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { User, UserDocument } from '../schemas/user.schema';

const execAsync = promisify(exec);

@Injectable()
export class FaceRecognitionService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  private readonly pythonScriptPath = path.join(
    __dirname,
    '..',
    '..',
    'python-scripts',
    'face_compare.py',
  );

  /**
   * Compare deux images de visages
   * @param profileImagePath Chemin de l'image de profil
   * @param selfieImagePath Chemin du selfie
   * @returns Résultat de la comparaison
   */
  async compareFaces(
    profileImagePath: string,
    selfieImagePath: string,
  ): Promise<{
    match: boolean;
    confidence: number;
    distance: number;
  }> {
    try {
      // Vérifier que les fichiers existent
      await this.checkFileExists(profileImagePath);
      await this.checkFileExists(selfieImagePath);

      // Appeler le script Python avec le venv qui a face_recognition installé
      const venvPython = path.join(
        __dirname,
        '..',
        '..',
        '..',
        '..',
        'face-recognition-project',
        'venv',
        'bin',
        'python3',
      );
      const command = `"${venvPython}" "${this.pythonScriptPath}" "${profileImagePath}" "${selfieImagePath}"`;

      console.log('🔍 [Face Recognition] Comparing faces...');
      console.log(`   Profile: ${profileImagePath}`);
      console.log(`   Selfie: ${selfieImagePath}`);

      const { stdout, stderr } = await execAsync(command, { timeout: 120000 }); // 2 minute timeout

      if (stderr) {
        console.warn('⚠️ [Face Recognition] Python stderr:', stderr);
      }

      // Parser le résultat JSON
      const result = JSON.parse(stdout.trim());

      console.log('✅ [Face Recognition] Result:', result);

      return {
        match: result.match,
        confidence: result.confidence,
        distance: result.distance,
      };
    } catch (error) {
      console.error('❌ [Face Recognition] Error:', error);
      throw new BadRequestException(
        'Face recognition failed: ' + error.message,
      );
    }
  }

  /**
   * Vérifier qu'un fichier existe
   */
  private async checkFileExists(filePath: string): Promise<void> {
    try {
      await fs.access(filePath);
    } catch {
      throw new BadRequestException(`File not found: ${filePath}`);
    }
  }

  /**
   * Détecter si une image contient un visage
   */
  async detectFace(imagePath: string): Promise<boolean> {
    try {
      await this.checkFileExists(imagePath);

      const venvPython = path.join(
        __dirname,
        '..',
        '..',
        '..',
        '..',
        'face-recognition-project',
        'venv',
        'bin',
        'python3',
      );
      const command = `"${venvPython}" "${this.pythonScriptPath}" --detect "${imagePath}"`;

      const { stdout } = await execAsync(command, { timeout: 60000 }); // 1 minute timeout
      const result = JSON.parse(stdout.trim());

      return result.face_detected;
    } catch (error) {
      console.error('❌ [Face Detection] Error:', error);
      return false;
    }
  }

  /**
   * Mark user as face verified
   */
  async markUserAsFaceVerified(userId: string): Promise<UserDocument> {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      {
        isFaceVerified: true,
        faceVerifiedAt: new Date(),
      },
      { new: true },
    );

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user;
  }
}
