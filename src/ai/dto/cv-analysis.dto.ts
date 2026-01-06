import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AnalyzeCvDto {
  @ApiProperty({ description: 'Base64 encoded CV image or URL' })
  @IsString()
  cvImage: string;

  @ApiProperty({ description: 'Worker ID to update', required: false })
  @IsOptional()
  @IsString()
  workerId?: string;
}

export class CvAnalysisResult {
  @ApiProperty()
  fullName?: string;

  @ApiProperty()
  phone?: string;

  @ApiProperty()
  email?: string;

  @ApiProperty()
  address?: string;

  @ApiProperty()
  work?: string;

  @ApiProperty()
  yearsOfExperience?: number;

  @ApiProperty()
  skills?: string[];

  @ApiProperty()
  aboutMe?: string;

  @ApiProperty()
  education?: string[];

  @ApiProperty()
  languages?: string[];

  @ApiProperty()
  certifications?: string[];
}
