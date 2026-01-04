import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/** プロジェクト新規作成リクエスト DTO。 */
export class CreateProjectDto {
  /** プロジェクト名。ユーザーが識別しやすい文字列。 */
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  @IsNotEmpty()
  name!: string;
}

/** プロジェクト更新リクエスト DTO。 */
export class UpdateProjectDto {
  /** 更新後のプロジェクト名。 */
  @ApiPropertyOptional()
  @IsString()
  @MaxLength(255)
  @IsOptional()
  name?: string;
}

/** プロジェクトレスポンス DTO。 */
export class ProjectResponseDto {
  /** プロジェクト ID。 */
  @ApiProperty()
  id!: string;

  /** 所有ユーザー ID。 */
  @ApiProperty()
  userId!: string;

  /** プロジェクト名。 */
  @ApiProperty()
  name!: string;

  /** 作成日時 ISO 文字列。 */
  @ApiProperty()
  createdAt!: string;

  /** 更新日時 ISO 文字列。 */
  @ApiProperty()
  updatedAt!: string;
}

/** プロジェクト一覧レスポンス DTO。 */
export class ProjectListResponseDto {
  /** プロジェクト DTO の配列。 */
  @ApiProperty({ type: [ProjectResponseDto] })
  items!: ProjectResponseDto[];
}
