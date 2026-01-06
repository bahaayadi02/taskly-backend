import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('Favorites')
@Controller('favorites')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all favorite workers' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of favorite workers retrieved successfully',
  })
  async getFavorites(@GetUser() user: any) {
    try {
      const favorites = await this.favoritesService.getFavorites(user.userId);
      return {
        success: true,
        message: 'Favorites retrieved successfully',
        data: favorites.map(worker => ({
          id: (worker as any)._id,
          fullName: worker.fullName,
          email: worker.email,
          phone: worker.phone,
          work: worker.work,
          address: worker.address,
          latitude: worker.latitude,
          longitude: worker.longitude,
          profilePicture: worker.profilePicture,
          yearsOfExperience: worker.yearsOfExperience,
          skills: worker.skills,
          aboutMe: worker.aboutMe,
          profileCompletionPercentage: worker.profileCompletionPercentage,
        })),
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Post(':workerId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add a worker to favorites' })
  @ApiParam({ name: 'workerId', description: 'The ID of the worker to add' })
  @ApiResponse({ status: 200, description: 'Worker added to favorites' })
  @ApiResponse({ status: 404, description: 'Worker not found' })
  async addFavorite(
    @GetUser() user: any,
    @Param('workerId') workerId: string,
  ) {
    try {
      const result = await this.favoritesService.addFavorite(user.userId, workerId);
      return {
        success: true,
        message: result.message,
        data: { favorites: result.favorites },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Delete(':workerId')
  @ApiOperation({ summary: 'Remove a worker from favorites' })
  @ApiParam({ name: 'workerId', description: 'The ID of the worker to remove' })
  @ApiResponse({ status: 200, description: 'Worker removed from favorites' })
  async removeFavorite(
    @GetUser() user: any,
    @Param('workerId') workerId: string,
  ) {
    try {
      const result = await this.favoritesService.removeFavorite(user.userId, workerId);
      return {
        success: true,
        message: result.message,
        data: { favorites: result.favorites },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Get('check/:workerId')
  @ApiOperation({ summary: 'Check if a worker is in favorites' })
  @ApiParam({ name: 'workerId', description: 'The ID of the worker to check' })
  @ApiResponse({ status: 200, description: 'Favorite status retrieved' })
  async checkFavorite(
    @GetUser() user: any,
    @Param('workerId') workerId: string,
  ) {
    try {
      const isFavorite = await this.favoritesService.isFavorite(user.userId, workerId);
      return {
        success: true,
        message: 'Favorite status retrieved',
        data: { isFavorite },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Post('toggle/:workerId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle favorite status for a worker' })
  @ApiParam({ name: 'workerId', description: 'The ID of the worker to toggle' })
  @ApiResponse({ status: 200, description: 'Favorite status toggled' })
  async toggleFavorite(
    @GetUser() user: any,
    @Param('workerId') workerId: string,
  ) {
    try {
      const result = await this.favoritesService.toggleFavorite(user.userId, workerId);
      return {
        success: true,
        message: result.message,
        data: { isFavorite: result.isFavorite },
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
