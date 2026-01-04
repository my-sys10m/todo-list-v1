import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, IsDateString } from 'class-validator';

/** TODO の進捗ステータスを示す列挙。 */
export enum TodoStatus {
  NotStarted = 0,
  InProgress = 1,
  Done = 2,
}

/** TODO 作成リクエスト DTO。 */
export class CreateTodoDto {
  /** TODO を紐づけるプロジェクト ID。 */
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  projectId!: string;

  /** TODO のタイトル。 */
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  @IsNotEmpty()
  title!: string;

  /** 初期ステータス。省略時は未着手。 */
  @ApiPropertyOptional({ enum: TodoStatus, default: TodoStatus.NotStarted })
  @IsEnum(TodoStatus)
  @IsOptional()
  status?: TodoStatus;
}

/** TODO 更新リクエスト DTO。 */
export class UpdateTodoDto {
  /** 更新後のタイトル。 */
  @ApiPropertyOptional()
  @IsString()
  @MaxLength(255)
  @IsOptional()
  title?: string;

  /** 更新後のステータス。 */
  @ApiPropertyOptional({ enum: TodoStatus })
  @IsEnum(TodoStatus)
  @IsOptional()
  status?: TodoStatus;

  /** 論理削除フラグ。 */
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isDeleted?: boolean;
}

/** TODO レスポンス DTO。 */
export class TodoResponseDto {
  /** TODO ID。 */
  @ApiProperty()
  id!: string;

  /** 紐づくプロジェクト ID。 */
  @ApiProperty()
  projectId!: string;

  /** 所有ユーザー ID。 */
  @ApiProperty()
  userId!: string;

  /** TODO タイトル。 */
  @ApiProperty()
  title!: string;

  /** TODO ステータス。 */
  @ApiProperty({ enum: TodoStatus })
  status!: TodoStatus;

  /** 論理削除フラグ。 */
  @ApiProperty()
  isDeleted!: boolean;

  /** 作成日時 ISO 文字列。 */
  @ApiProperty()
  createdAt!: string;

  /** 更新日時 ISO 文字列。 */
  @ApiProperty()
  updatedAt!: string;
}

/** TODO 一覧レスポンス DTO。 */
export class TodoListResponseDto {
  /** TODO DTO の配列。 */
  @ApiProperty({ type: [TodoResponseDto] })
  items!: TodoResponseDto[];
}

/** TODO 検索クエリ DTO。 */
export class SearchTodoQueryDto {
  /** タイトルの部分一致。 */
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title?: string;

  /** TODO ステータス。 */
  @ApiPropertyOptional({ enum: TodoStatus })
  @IsEnum(TodoStatus)
  @IsOptional()
  status?: TodoStatus;

  /** 作成日時の始点 (ISO)。 */
  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  createdFrom?: string;

  /** 作成日時の終点 (ISO)。 */
  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  createdTo?: string;

  /** 更新日時の始点 (ISO)。 */
  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  updatedFrom?: string;

  /** 更新日時の終点 (ISO)。 */
  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  updatedTo?: string;
}
