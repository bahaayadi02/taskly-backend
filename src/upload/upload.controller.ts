import {
  Controller,
  Post,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  Body,
} from '@nestjs/common';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UploadService } from './upload.service';

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('profile-picture')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload profile picture',
    description: 'Upload a new profile picture for the authenticated user. Accepts JPG, PNG, GIF, WEBP, HEIC formats. Max size: 10MB.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Profile picture file (JPG, PNG, GIF, WEBP, HEIC)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Profile picture uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Profile picture uploaded successfully' },
        data: {
          type: 'object',
          properties: {
            profilePicture: { type: 'string', example: '/uploads/profiles/profile-123456789.jpg' },
          },
        },
      },
    },
  })
  async uploadProfilePicture(
    @GetUser('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      const user = await this.uploadService.updateProfilePicture(userId, file.filename);
      return {
        success: true,
        message: 'Profile picture uploaded successfully',
        data: user,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Delete('profile-picture')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete profile picture',
    description: 'Delete the profile picture of the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile picture deleted successfully',
  })
  async deleteProfilePicture(@GetUser('userId') userId: string) {
    try {
      const user = await this.uploadService.deleteProfilePicture(userId);
      return {
        success: true,
        message: 'Profile picture deleted successfully',
        data: user,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Post('chat-image')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload chat image',
    description: 'Upload an image for chat messages. Accepts JPG, PNG, GIF, WEBP formats. Max size: 10MB.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (JPG, PNG, GIF, WEBP)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Chat image uploaded successfully',
  })
  async uploadChatImage(
    @GetUser('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      const url = `/uploads/chat/${file.filename}`;
      return {
        success: true,
        message: 'Chat image uploaded successfully',
        data: { url, filename: file.filename },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Post('chat-file')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload chat file',
    description: 'Upload a file for chat messages. Max size: 20MB.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Chat file uploaded successfully',
  })
  async uploadChatFile(
    @GetUser('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      const url = `/uploads/chat/${file.filename}`;
      return {
        success: true,
        message: 'Chat file uploaded successfully',
        data: { url, filename: file.filename, originalName: file.originalname },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Post('kyc')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'selfie', maxCount: 1 },
    { name: 'idFront', maxCount: 1 },
    { name: 'idBack', maxCount: 1 },
  ]))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload KYC documents',
    description: 'Upload selfie, ID front, and ID back images for KYC verification. Max size: 10MB per file.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'User email or ID',
        },
        selfie: {
          type: 'string',
          format: 'binary',
          description: 'Selfie image (JPG, PNG)',
        },
        idFront: {
          type: 'string',
          format: 'binary',
          description: 'ID card front image (JPG, PNG)',
        },
        idBack: {
          type: 'string',
          format: 'binary',
          description: 'ID card back image (JPG, PNG)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'KYC documents uploaded successfully',
  })
  async uploadKycDocuments(
    @Body('userId') userId: string,
    @UploadedFiles() files: { selfie?: Express.Multer.File[], idFront?: Express.Multer.File[], idBack?: Express.Multer.File[] },
  ) {
    if (!files.selfie?.[0] || !files.idFront?.[0] || !files.idBack?.[0]) {
      throw new BadRequestException('All three images (selfie, idFront, idBack) are required');
    }

    try {
      const selfieUrl = `/uploads/kyc/${files.selfie[0].filename}`;
      const idFrontUrl = `/uploads/kyc/${files.idFront[0].filename}`;
      const idBackUrl = `/uploads/kyc/${files.idBack[0].filename}`;

      // Update user's KYC documents
      const result = await this.uploadService.updateKycDocuments(userId, selfieUrl, idFrontUrl, idBackUrl);

      return {
        success: true,
        message: 'KYC documents uploaded successfully',
        data: {
          selfieUrl,
          idFrontUrl,
          idBackUrl,
          ...result,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }
}
