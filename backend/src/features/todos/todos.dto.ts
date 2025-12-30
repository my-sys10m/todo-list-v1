import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export enum TodoStatus {
  NotStarted = 0,
  InProgress = 1,
  Done = 2,
}

export class CreateTodoDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  projectId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ enum: TodoStatus, default: TodoStatus.NotStarted })
  @IsEnum(TodoStatus)
  @IsOptional()
  status?: TodoStatus;
}

export class UpdateTodoDto {
  @ApiPropertyOptional()
  @IsString()
  @MaxLength(255)
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ enum: TodoStatus })
  @IsEnum(TodoStatus)
  @IsOptional()
  status?: TodoStatus;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isDeleted?: boolean;
}

export class TodoResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  projectId!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ enum: TodoStatus })
  status!: TodoStatus;

  @ApiProperty()
  isDeleted!: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class TodoListResponseDto {
  @ApiProperty({ type: [TodoResponseDto] })
  items!: TodoResponseDto[];
}
