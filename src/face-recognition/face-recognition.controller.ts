import {
  Controller,
  Post,
  Patch,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { FaceRecognitionService } from './face-recognition.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('face-recognition')
export class FaceRecognitionController {
  constructor(
    private readonly faceRecognitionService: FaceRecognitionService,
  ) {}

  @Post('verify')
  @UseInterceptors(
    FilesInterceptor('images', 2, {
      storage: diskStorage({
        destination: './uploads/face-verification',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(
            null,
            file.fieldname + '-' + uniqueSuffix + extname(file.originalname),
          );
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
          return cb(
            new BadRequestException('Only image files are allowed!'),
            false,
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
      },
    }),
  )
  async verifyFaces(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length !== 2) {
      throw new BadRequestException('Please upload exactly 2 images');
    }

    const [profileImage, selfieImage] = files;

    console.log('📸 [Face Verification] Received images:');
    console.log(`   Profile: ${profileImage.filename}`);
    console.log(`   Selfie: ${selfieImage.filename}`);

    try {
      // Comparer les visages
      const result = await this.faceRecognitionService.compareFaces(
        profileImage.path,
        selfieImage.path,
      );

      // Nettoyer les fichiers temporaires
      // await fs.unlink(profileImage.path);
      // await fs.unlink(selfieImage.path);

      return {
        success: true,
        message: result.match
          ? 'Face verification successful'
          : 'Face verification failed',
        data: {
          match: result.match,
          confidence: Math.round(result.confidence * 100),
          distance: result.distance,
        },
      };
    } catch (error) {
      console.error('❌ [Face Verification] Error:', error);
      throw new BadRequestException(error.message);
    }
  }

  @Post('detect')
  @UseInterceptors(
    FilesInterceptor('image', 1, {
      storage: diskStorage({
        destination: './uploads/face-detection',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(
            null,
            file.fieldname + '-' + uniqueSuffix + extname(file.originalname),
          );
        },
      }),
    }),
  )
  async detectFace(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Please upload an image');
    }

    const image = files[0];

    try {
      const faceDetected = await this.faceRecognitionService.detectFace(
        image.path,
      );

      return {
        success: true,
        data: {
          faceDetected,
          message: faceDetected
            ? 'Face detected in image'
            : 'No face detected in image',
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // Update face verification status for authenticated user
  @Patch('verify-status')
  @UseGuards(JwtAuthGuard)
  async updateFaceVerificationStatus(@GetUser() user: any) {
    try {
      const updatedUser = await this.faceRecognitionService.markUserAsFaceVerified(user.userId);
      return {
        success: true,
        message: 'Face verification status updated',
        data: {
          isFaceVerified: updatedUser.isFaceVerified,
          faceVerifiedAt: updatedUser.faceVerifiedAt,
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
