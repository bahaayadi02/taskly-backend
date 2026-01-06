import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { AiService, AiCvService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('AI - Review Analysis & CV')
@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly aiCvService: AiCvService,
  ) {}

  @Get('reviews/summary/:workerId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get AI-generated summary of worker reviews',
    description: 'Analyzes all reviews for a worker and generates a comprehensive summary including strengths, areas to improve, and sentiment analysis.'
  })
  @ApiParam({ name: 'workerId', description: 'The ID of the worker' })
  @ApiResponse({ 
    status: 200, 
    description: 'Summary generated successfully',
    schema: {
      example: {
        success: true,
        message: 'Review summary generated successfully',
        data: {
          workerId: '507f1f77bcf86cd799439011',
          workerName: 'Ahmed Ben Salem',
          workerJob: 'Electrician',
          totalReviews: 5,
          averageRating: 4.6,
          summary: 'Ce réparateur bénéficie d\'excellentes évaluations...',
          strengths: ['Rapidité et efficacité', 'Professionnalisme'],
          areasToImprove: [],
          keywords: ['professionnel', 'rapide', 'efficace'],
          sentiment: 'very_positive',
          generatedAt: '2024-01-15T10:30:00.000Z'
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Worker not found' })
  async getReviewSummary(@Param('workerId') workerId: string) {
    try {
      const summary = await this.aiService.summarizeWorkerReviews(workerId);
      return {
        success: true,
        message: 'Review summary generated successfully',
        data: summary,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Get('reviews/quick/:workerId')
  @ApiOperation({ 
    summary: 'Get quick summary of worker reviews (public)',
    description: 'Returns a brief summary with rating and review count. No authentication required.'
  })
  @ApiParam({ name: 'workerId', description: 'The ID of the worker' })
  @ApiResponse({ 
    status: 200, 
    description: 'Quick summary retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'Quick summary retrieved successfully',
        data: {
          rating: 4.6,
          summary: 'Excellent - Très recommandé',
          reviewCount: 5
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Worker not found' })
  async getQuickSummary(@Param('workerId') workerId: string) {
    try {
      const summary = await this.aiService.getQuickSummary(workerId);
      return {
        success: true,
        message: 'Quick summary retrieved successfully',
        data: summary,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  // ============ CV Analysis Endpoints ============

  @Post('cv/analyze')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Analyze CV image and extract information',
    description: 'Uses AI to analyze a CV image and extract professional information like skills, experience, education, etc.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        cvImage: {
          type: 'string',
          description: 'Base64 encoded CV image or URL',
        },
        autoUpdate: {
          type: 'boolean',
          description: 'Automatically update worker profile with extracted data',
          default: false,
        },
      },
      required: ['cvImage'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'CV analyzed successfully',
    schema: {
      example: {
        success: true,
        message: 'CV analyzed successfully',
        data: {
          fullName: 'Ahmed Ben Salem',
          phone: '+216 98 123 456',
          work: 'Electrician',
          yearsOfExperience: 8,
          skills: ['Câblage électrique', 'Domotique', 'Panneaux solaires'],
          aboutMe: 'Électricien expérimenté avec 8 ans d\'expérience...',
          education: ['BTS Électrotechnique'],
          languages: ['Français', 'Arabe'],
        },
      },
    },
  })
  async analyzeCv(
    @GetUser() user: any,
    @Body() body: { cvImage: string; autoUpdate?: boolean },
  ) {
    try {
      const workerId = body.autoUpdate ? user.userId : undefined;
      const result = await this.aiCvService.analyzeCv(body.cvImage, workerId);
      return {
        success: true,
        message: 'CV analyzed successfully',
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Get('cv/skills/:work')
  @ApiOperation({
    summary: 'Get skill suggestions for a profession',
    description: 'Returns a list of common skills for a given profession/work type.',
  })
  @ApiParam({ name: 'work', description: 'The profession/work type (e.g., Electrician, Plumber)' })
  @ApiResponse({
    status: 200,
    description: 'Skills retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'Skills retrieved successfully',
        data: {
          work: 'Electrician',
          suggestedSkills: ['Câblage électrique', 'Installation tableau', 'Dépannage'],
        },
      },
    },
  })
  async getSkillSuggestions(@Param('work') work: string) {
    try {
      const skills = this.aiCvService.getSkillSuggestions(work);
      return {
        success: true,
        message: 'Skills retrieved successfully',
        data: {
          work,
          suggestedSkills: skills,
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

  @Post('cv/analyze-public')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Analyze CV image during registration (public)',
    description: 'Uses AI to analyze a CV image and extract professional information. No authentication required - for use during worker registration.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        cvImage: {
          type: 'string',
          description: 'Base64 encoded CV image or URL',
        },
        work: {
          type: 'string',
          description: 'The profession/work type for context',
        },
      },
      required: ['cvImage'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'CV analyzed successfully',
    schema: {
      example: {
        success: true,
        message: 'CV analyzed successfully',
        data: {
          yearsOfExperience: 8,
          skills: ['Câblage électrique', 'Domotique', 'Panneaux solaires'],
          aboutMe: 'Électricien expérimenté avec 8 ans d\'expérience...',
          education: ['BTS Électrotechnique'],
          languages: ['Français', 'Arabe'],
          certifications: ['Habilitation électrique'],
        },
      },
    },
  })
  async analyzeCvPublic(
    @Body() body: { cvImage: string; work?: string },
  ) {
    try {
      const result = await this.aiCvService.analyzeCv(body.cvImage);
      
      // If work is provided, add suggested skills
      let suggestedSkills: string[] = [];
      if (body.work) {
        suggestedSkills = this.aiCvService.getSkillSuggestions(body.work);
      }
      
      return {
        success: true,
        message: 'CV analyzed successfully',
        data: {
          ...result,
          suggestedSkills,
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
