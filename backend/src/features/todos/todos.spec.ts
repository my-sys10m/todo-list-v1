import 'reflect-metadata';
import Database from 'better-sqlite3';
import { BadRequestException, ForbiddenException, NotFoundException, ValidationPipe } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { Request } from 'express';
import { ProjectsRepository } from '../projects/projects.repository';
import { CreateTodoDto, SearchTodoQueryDto, TodoStatus } from './todos.dto';
import { TodosController } from './todos.controller';
import { TodoEntity, TodosRepository } from './todos.repository';
import { TodosService } from './todos.service';

const authedReq = (sub: string) => ({ user: { sub } } as unknown as Request & { user?: { sub: string } });

describe('create todo', () => {
  describe('TodosController.create', () => {
    it('returns created todo for authenticated user', async () => {
      const create = vi.fn().mockResolvedValue({ id: '1' });
      const mockService = {
        create,
      } as unknown as TodosService;
      const controller = new TodosController(mockService);
      const result = await controller.create(authedReq('user-1'), { projectId: '1', title: 'Task' } as CreateTodoDto);
      expect(create).toHaveBeenCalledWith('user-1', { projectId: '1', title: 'Task' });
      expect(result).toEqual({ id: '1' });
    });

    it('throws Forbidden when user is missing', () => {
      const controller = new TodosController({} as TodosService);
      expect(() => controller.create({} as unknown as Request, { projectId: '1', title: 'Task' } as CreateTodoDto)).toThrow(ForbiddenException);
    });

    it('validates request body', async () => {
      const pipe = new ValidationPipe({ whitelist: true, transform: true });
      await expect(
        pipe.transform(
          { projectId: '1' },
          {
            type: 'body',
            metatype: CreateTodoDto,
          },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects too long title', async () => {
      const pipe = new ValidationPipe({ whitelist: true, transform: true });
      const longTitle = 'a'.repeat(256);
      await expect(
        pipe.transform(
          { projectId: '1', title: longTitle },
          {
            type: 'body',
            metatype: CreateTodoDto,
          },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects too long projectId', async () => {
      const pipe = new ValidationPipe({ whitelist: true, transform: true });
      const longProjectId = '1'.repeat(21);
      await expect(
        pipe.transform(
          { projectId: longProjectId, title: 'Task' },
          {
            type: 'body',
            metatype: CreateTodoDto,
          },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('TodosService.create', () => {
    const findProjectById = vi.fn();
    const insertTodo = vi.fn();
    const projectRepo = {
      findById: findProjectById,
    } as unknown as ProjectsRepository;
    const todosRepo = {
      insertTodo,
    } as unknown as TodosRepository;
    const service = new TodosService(todosRepo, projectRepo);

    it('creates todo when project exists', async () => {
      findProjectById.mockResolvedValue({ id: '1' });
      const todoEntity: TodoEntity = {
        id: '1',
        projectId: '1',
        userId: 'user-1',
        title: 'Task',
        status: TodoStatus.InProgress,
        isDeleted: false,
        createdAt: 'now',
        updatedAt: 'now',
      };
      insertTodo.mockResolvedValue(todoEntity);

      const result = await service.create('user-1', { projectId: '1', title: 'Task', status: TodoStatus.InProgress });

      expect(findProjectById).toHaveBeenCalledWith('1', 'user-1');
      expect(insertTodo).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: '1',
          title: 'Task',
          status: TodoStatus.InProgress,
          userId: 'user-1',
        }),
      );
      expect(result).toEqual({
        id: '1',
        projectId: '1',
        userId: 'user-1',
        title: 'Task',
        status: TodoStatus.InProgress,
        isDeleted: false,
        createdAt: 'now',
        updatedAt: 'now',
      });
    });

    it('throws when project is missing', async () => {
      findProjectById.mockResolvedValue(null);
      await expect(service.create('user-1', { projectId: '2', title: 'Task' })).rejects.toThrow('project not found');
    });
  });

  describe('TodosRepository.create', () => {
    let repo: TodosRepository;

    beforeAll(() => {
      const sqlite = new Database(':memory:');
      sqlite.exec(`
        CREATE TABLE t_project (
          id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
          user_id text NOT NULL,
          name text NOT NULL,
          created_at text NOT NULL,
          updated_at text NOT NULL
        );
        CREATE TABLE t_todo (
          id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
          project_id integer NOT NULL,
          user_id text NOT NULL,
          title text NOT NULL,
          status integer NOT NULL,
          is_deleted integer DEFAULT true NOT NULL,
          created_at text NOT NULL,
          updated_at text NOT NULL,
          FOREIGN KEY (project_id) REFERENCES t_project(id) ON DELETE CASCADE ON UPDATE CASCADE
        );
      `);
      sqlite.prepare('INSERT INTO t_project (user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?)').run(
        'user-1',
        'project',
        new Date().toISOString(),
        new Date().toISOString(),
      );
      const db = drizzle(sqlite) as BetterSQLite3Database;
      repo = new TodosRepository(db);
    });

    it('inserts todo with explicit status', async () => {
      const result = await repo.insertTodo({ projectId: '1', userId: 'user-1', title: 'Task', status: TodoStatus.Done });
      expect(result).toMatchObject({
        id: '1',
        projectId: '1',
        userId: 'user-1',
        title: 'Task',
        status: TodoStatus.Done,
        isDeleted: false,
      });
      expect(result.createdAt).toBeTruthy();
      expect(result.updatedAt).toBeTruthy();
    });

    it('defaults status to NotStarted when omitted', async () => {
      const result = await repo.insertTodo({ projectId: '1', userId: 'user-1', title: 'Another Task' });
      expect(result.status).toBe(TodoStatus.NotStarted);
    });

    it('uses provided timestamps when given', async () => {
      const createdAt = new Date('2024-02-01T00:00:00.000Z').toISOString();
      const updatedAt = new Date('2024-02-02T00:00:00.000Z').toISOString();
      const result = await repo.insertTodo({
        projectId: '1',
        userId: 'user-1',
        title: 'Stamped Task',
        createdAt,
        updatedAt,
      });
      expect(result.createdAt).toBe(createdAt);
      expect(result.updatedAt).toBe(updatedAt);
    });
  });
});

describe('find one todo', () => {
  describe('TodosController.findOne', () => {
    it('returns todo for authenticated user', async () => {
      const findOne = vi.fn().mockResolvedValue({ id: '1' });
      const mockService = {
        findOne,
      } as unknown as TodosService;
      const controller = new TodosController(mockService);
      const result = await controller.findOne(authedReq('user-1'), '1');
      expect(findOne).toHaveBeenCalledWith('user-1', '1');
      expect(result).toEqual({ id: '1' });
    });

    it('throws Forbidden when user is missing', () => {
      const controller = new TodosController({} as TodosService);
      expect(() => controller.findOne({} as unknown as Request, '1')).toThrow(ForbiddenException);
    });
  });

  describe('TodosService.findOne', () => {
    const projectRepo = {} as ProjectsRepository;
    const findById = vi.fn();
    const todosRepo = {
      findById,
    } as unknown as TodosRepository;
    const service = new TodosService(todosRepo, projectRepo);

    it('returns todo when found', async () => {
      const todoEntity: TodoEntity = {
        id: '1',
        projectId: '1',
        userId: 'user-1',
        title: 'Task',
        status: TodoStatus.Done,
        isDeleted: false,
        createdAt: 'now',
        updatedAt: 'now',
      };
      findById.mockResolvedValue(todoEntity);

      const result = await service.findOne('user-1', '1');

      expect(findById).toHaveBeenCalledWith('1', 'user-1');
      expect(result).toEqual(todoEntity);
    });

    it('throws NotFound when missing', async () => {
      findById.mockResolvedValue(null);
      await expect(service.findOne('user-1', '999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('TodosRepository.findById', () => {
    let repo: TodosRepository;

    beforeAll(() => {
      const sqlite = new Database(':memory:');
      sqlite.exec(`
        CREATE TABLE t_project (
          id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
          user_id text NOT NULL,
          name text NOT NULL,
          created_at text NOT NULL,
          updated_at text NOT NULL
        );
        CREATE TABLE t_todo (
          id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
          project_id integer NOT NULL,
          user_id text NOT NULL,
          title text NOT NULL,
          status integer NOT NULL,
          is_deleted integer DEFAULT true NOT NULL,
          created_at text NOT NULL,
          updated_at text NOT NULL,
          FOREIGN KEY (project_id) REFERENCES t_project(id) ON DELETE CASCADE ON UPDATE CASCADE
        );
      `);
      const now = new Date().toISOString();
      sqlite.prepare('INSERT INTO t_project (user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?)').run('user-1', 'project', now, now);
      sqlite
        .prepare('INSERT INTO t_todo (project_id, user_id, title, status, is_deleted, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(1, 'user-1', 'Task', TodoStatus.InProgress, 0, now, now);
      sqlite
        .prepare('INSERT INTO t_todo (project_id, user_id, title, status, is_deleted, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(1, 'other-user', 'Other Task', TodoStatus.InProgress, 0, now, now);
      sqlite
        .prepare('INSERT INTO t_todo (project_id, user_id, title, status, is_deleted, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(1, 'user-1', 'Deleted Task', TodoStatus.InProgress, 1, now, now);
      const db = drizzle(sqlite) as BetterSQLite3Database;
      repo = new TodosRepository(db);
    });

    it('returns todo for matching user and id', async () => {
      const result = await repo.findById('1', 'user-1');
      expect(result).toMatchObject({
        id: '1',
        projectId: '1',
        userId: 'user-1',
        title: 'Task',
        status: TodoStatus.InProgress,
        isDeleted: false,
      });
    });

    it('returns null when user does not own todo', async () => {
      const result = await repo.findById('2', 'user-1');
      expect(result).toBeNull();
    });

    it('returns null when todo is deleted', async () => {
      const result = await repo.findById('3', 'user-1');
      expect(result).toBeNull();
    });
  });
});

describe('find all todo', () => {
  describe('TodosController.findAll', () => {
    it('returns 0 items for authenticated user', async () => {
      const findAll = vi.fn().mockResolvedValue({ items: [] });
      const mockService = {
        findAll,
      } as unknown as TodosService;
      const controller = new TodosController(mockService);
      const result = await controller.findAll(authedReq('user-1'), undefined);
      expect(findAll).toHaveBeenCalledWith('user-1', undefined);
      expect(result).toEqual({ items: [] });
    });

    it('returns 1 item for authenticated user', async () => {
      const findAll = vi.fn().mockResolvedValue({ items: [{ id: '1' }] });
      const mockService = {
        findAll,
      } as unknown as TodosService;
      const controller = new TodosController(mockService);
      const result = await controller.findAll(authedReq('user-1'), '2024-01-01');
      expect(findAll).toHaveBeenCalledWith('user-1', '2024-01-01');
      expect(result).toEqual({ items: [{ id: '1' }] });
    });

    it('returns 2 items for authenticated user', async () => {
      const findAll = vi.fn().mockResolvedValue({ items: [{ id: '1' }, { id: '2' }] });
      const mockService = {
        findAll,
      } as unknown as TodosService;
      const controller = new TodosController(mockService);
      const result = await controller.findAll(authedReq('user-1'), undefined);
      expect(findAll).toHaveBeenCalledWith('user-1', undefined);
      expect(result).toEqual({ items: [{ id: '1' }, { id: '2' }] });
    });

    it('throws Forbidden when user is missing', () => {
      const controller = new TodosController({} as TodosService);
      expect(() => controller.findAll({} as unknown as Request, '2024-01-01')).toThrow(ForbiddenException);
    });
  });

  describe('TodosService.findAll', () => {
    const projectRepo = {} as ProjectsRepository;
    const queryByUser = vi.fn();
    const todosRepo = {
      queryByUser,
    } as unknown as TodosRepository;
    const service = new TodosService(todosRepo, projectRepo);

    it('returns 0 items', async () => {
      queryByUser.mockResolvedValue([]);

      const result = await service.findAll('user-1', undefined);

      expect(queryByUser).toHaveBeenCalledWith('user-1', undefined);
      expect(result).toEqual({ items: [] });
    });

    it('returns 1 item', async () => {
      const entities: TodoEntity[] = [
        {
          id: '1',
          projectId: '1',
          userId: 'user-1',
          title: 'Task',
          status: TodoStatus.InProgress,
          isDeleted: false,
          createdAt: 'now',
          updatedAt: 'now',
        },
      ];
      queryByUser.mockResolvedValue(entities);

      const result = await service.findAll('user-1', undefined);

      expect(queryByUser).toHaveBeenCalledWith('user-1', undefined);
      expect(result).toEqual({ items: entities });
    });

    it('returns 2 items', async () => {
      const entities: TodoEntity[] = [
        {
          id: '1',
          projectId: '1',
          userId: 'user-1',
          title: 'Task 1',
          status: TodoStatus.InProgress,
          isDeleted: false,
          createdAt: 'now',
          updatedAt: 'now',
        },
        {
          id: '2',
          projectId: '1',
          userId: 'user-1',
          title: 'Task 2',
          status: TodoStatus.Done,
          isDeleted: false,
          createdAt: 'later',
          updatedAt: 'later',
        },
      ];
      queryByUser.mockResolvedValue(entities);

      const result = await service.findAll('user-1', '2024-05-01');

      expect(queryByUser).toHaveBeenCalledWith('user-1', '2024-05-01');
      expect(result).toEqual({ items: entities });
    });
  });

  describe('TodosRepository.findAll', () => {
    let repo: TodosRepository;

    beforeAll(() => {
      const sqlite = new Database(':memory:');
      sqlite.exec(`
        CREATE TABLE t_project (
          id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
          user_id text NOT NULL,
          name text NOT NULL,
          created_at text NOT NULL,
          updated_at text NOT NULL
        );
        CREATE TABLE t_todo (
          id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
          project_id integer NOT NULL,
          user_id text NOT NULL,
          title text NOT NULL,
          status integer NOT NULL,
          is_deleted integer DEFAULT true NOT NULL,
          created_at text NOT NULL,
          updated_at text NOT NULL,
          FOREIGN KEY (project_id) REFERENCES t_project(id) ON DELETE CASCADE ON UPDATE CASCADE
        );
      `);
      const now = '2024-05-01T10:00:00.000Z';
      const otherDay = '2024-04-30T10:00:00.000Z';
      const beforeOtherDay = '2024-04-29T10:00:00.000Z';
      sqlite.prepare('INSERT INTO t_project (user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?)').run('user-1', 'project', now, now);
      const insertTodo = sqlite.prepare(
        'INSERT INTO t_todo (project_id, user_id, title, status, is_deleted, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      );
      insertTodo.run(1, 'user-1', 'Task 1', TodoStatus.NotStarted, 0, now, now);
      insertTodo.run(1, 'user-1', 'Task 2', TodoStatus.NotStarted, 1, now, now);
      insertTodo.run(1, 'other-user', 'Task 3', TodoStatus.NotStarted, 0, now, now);
      insertTodo.run(1, 'user-1', 'Task 4', TodoStatus.NotStarted, 0, otherDay, otherDay);
      insertTodo.run(1, 'user-1', 'Task 5', TodoStatus.NotStarted, 0, beforeOtherDay, beforeOtherDay);
      const db = drizzle(sqlite) as BetterSQLite3Database;
      repo = new TodosRepository(db);
    });

    it('returns 3 active todos for user', async () => {
      const result = await repo.queryByUser('user-1');
      expect(result.map((t) => t.title)).toEqual(['Task 1', 'Task 4', 'Task 5']);
    });

    it('returns 1 todo when date filter matches one', async () => {
      const result = await repo.queryByUser('user-1', '2024-05-01');
      expect(result.map((t) => t.title)).toEqual(['Task 1']);
    });

    it('returns 2 todos when date filter matches April', async () => {
      const result = await repo.queryByUser('user-1', '2024-04');
      expect(result.map((t) => t.title)).toEqual(['Task 4', 'Task 5']);
    });

    it('returns 0 todo when no record matches date filter', async () => {
      const result = await repo.queryByUser('user-1', '2024-06-01');
      expect(result).toEqual([]);
    });
  });
});

describe('search todo', () => {
  describe('TodosController.search', () => {
    it('returns empty list for authenticated user', async () => {
      const search = vi.fn().mockResolvedValue({ items: [] });
      const mockService = {
        search,
      } as unknown as TodosService;
      const controller = new TodosController(mockService);
      const result = await controller.search(authedReq('user-1'), {} as SearchTodoQueryDto);
      expect(search).toHaveBeenCalledWith('user-1', {});
      expect(result).toEqual({ items: [] });
    });

    it('returns single item list for authenticated user', async () => {
      const search = vi.fn().mockResolvedValue({ items: [{ id: '1' }] });
      const mockService = {
        search,
      } as unknown as TodosService;
      const controller = new TodosController(mockService);
      const result = await controller.search(authedReq('user-1'), {} as SearchTodoQueryDto);
      expect(search).toHaveBeenCalledWith('user-1', {});
      expect(result).toEqual({ items: [{ id: '1' }] });
    });

    it('returns two items for authenticated user', async () => {
      const search = vi.fn().mockResolvedValue({ items: [{ id: '1' }, { id: '2' }] });
      const mockService = {
        search,
      } as unknown as TodosService;
      const controller = new TodosController(mockService);
      const result = await controller.search(authedReq('user-1'), {} as SearchTodoQueryDto);
      expect(search).toHaveBeenCalledWith('user-1', {});
      expect(result).toEqual({ items: [{ id: '1' }, { id: '2' }] });
    });

    it('throws Forbidden when user is missing', () => {
      const controller = new TodosController({} as TodosService);
      expect(() => controller.search({} as unknown as Request, {} as SearchTodoQueryDto)).toThrow(ForbiddenException);
    });

    it('validates query', async () => {
      const pipe = new ValidationPipe({ whitelist: true, transform: true });
      await expect(
        pipe.transform(
          { createdFrom: 'invalid-date' },
          {
            type: 'query',
            metatype: SearchTodoQueryDto,
          },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects too long projectId in query', async () => {
      const pipe = new ValidationPipe({ whitelist: true, transform: true });
      const longProjectId = '1'.repeat(21);
      await expect(
        pipe.transform(
          { projectId: longProjectId },
          {
            type: 'query',
            metatype: SearchTodoQueryDto,
          },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('TodosService.search', () => {
    const search = vi.fn();
    const repo = {
      search,
    } as unknown as TodosRepository;
    const projectRepo = {} as ProjectsRepository;
    const service = new TodosService(repo, projectRepo);

    it('returns empty list when no result', async () => {
      search.mockResolvedValue([]);
      const result = await service.search('user-1', { createdTo: '2024-05-03' });
      expect(search).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ createdTo: '2024-05-03T00:00:00.000Z' }),
        201,
      );
      expect(result).toEqual({ items: [] });
    });

    it('returns mapped list when <= 200', async () => {
      const entities: TodoEntity[] = [
        {
          id: '1',
          projectId: '1',
          userId: 'user-1',
          title: 'Task',
          status: TodoStatus.NotStarted,
          isDeleted: false,
          createdAt: 'now',
          updatedAt: 'now',
        },
      ];
      search.mockResolvedValue(entities);
      const result = await service.search('user-1', { createdFrom: '2024-05-01', updatedTo: '2024-05-02' });
      expect(search).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          createdFrom: '2024-05-01T00:00:00.000Z',
          updatedTo: '2024-05-02T00:00:00.000Z',
        }),
        201,
      );
      expect(result).toEqual({ items: entities });
    });

    it('passes projectId through without modification', async () => {
      search.mockResolvedValue([]);
      await service.search('user-1', { projectId: '2' });
      expect(search).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          projectId: '2',
        }),
        201,
      );
    });

    it('throws BadRequest when more than 200 results', async () => {
      const many = Array.from({ length: 201 }).map((_, i) => ({
        id: `${i}`,
        projectId: '1',
        userId: 'user-1',
        title: `Task ${i}`,
        status: TodoStatus.NotStarted,
        isDeleted: false,
        createdAt: 'now',
        updatedAt: 'now',
      })) as TodoEntity[];
      search.mockResolvedValue(many);
      await expect(service.search('user-1', {})).rejects.toThrow(BadRequestException);
    });
  });

  describe('TodosRepository.search', () => {
    let repo: TodosRepository;
    let now: string;
    let later: string;

    beforeAll(() => {
      const sqlite = new Database(':memory:');
      sqlite.exec(`
        CREATE TABLE t_project (
          id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
          user_id text NOT NULL,
          name text NOT NULL,
          created_at text NOT NULL,
          updated_at text NOT NULL
        );
        CREATE TABLE t_todo (
          id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
          project_id integer NOT NULL,
          user_id text NOT NULL,
          title text NOT NULL,
          status integer NOT NULL,
          is_deleted integer DEFAULT true NOT NULL,
          created_at text NOT NULL,
          updated_at text NOT NULL
        );
      `);
      const insertProject = sqlite.prepare('INSERT INTO t_project (user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?)');
      insertProject.run('user-1', 'p1', 'now', 'now');
      const secondProject = insertProject.run('user-1', 'p2', 'now', 'now');
      const secondProjectId = Number(secondProject.lastInsertRowid);
      now = '2024-05-01T10:00:00.000Z';
      later = '2024-05-02T10:00:00.000Z';
      const otherProjectDate = '2024-05-03T10:00:00.000Z';
      const insert = sqlite.prepare(
        'INSERT INTO t_todo (project_id, user_id, title, status, is_deleted, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      );
      insert.run(1, 'user-1', 'Alpha task', TodoStatus.NotStarted, 0, now, now);
      insert.run(1, 'user-1', 'Beta work', TodoStatus.InProgress, 0, later, later);
      insert.run(1, 'user-1', 'Gamma done', TodoStatus.Done, 1, now, now); // deleted
      insert.run(1, 'other-user', 'Other task', TodoStatus.NotStarted, 0, now, now);
      insert.run(secondProjectId, 'user-1', 'Delta other project', TodoStatus.NotStarted, 0, otherProjectDate, otherProjectDate);
      const db = drizzle(sqlite) as BetterSQLite3Database;
      repo = new TodosRepository(db);
    });

    it('filters by title, status, and date ranges', async () => {
      const result = await repo.search(
        'user-1',
        {
          title: 'Beta',
          status: TodoStatus.InProgress,
          createdFrom: '2024-05-01T00:00:00.000Z',
          createdTo: '2024-05-03T00:00:00.000Z',
          updatedFrom: '2024-05-01T00:00:00.000Z',
          updatedTo: '2024-05-03T00:00:00.000Z',
        },
        10,
      );
      expect(result).toHaveLength(2);
      expect(result.map((t) => t.title).sort()).toEqual(['Alpha task', 'Beta work']);
    });

    it('filters by projectId', async () => {
      const result = await repo.search(
        'user-1',
        {
          projectId: '2',
        },
        10,
      );
      expect(result).toHaveLength(1);
      expect(result[0].projectId).toBe('2');
      expect(result[0].title).toBe('Delta other project');
    });

    it('matches when date conditions hit even if status does not (OR grouping)', async () => {
      const result = await repo.search(
        'user-1',
        {
          status: TodoStatus.Done, // no record matches this status alone
          updatedFrom: later,
          updatedTo: later,
          createdFrom: now,
        },
        10,
      );
      expect(result.map((t) => t.title)).toEqual(['Beta work']);
    });

    it('includes items on createdAt boundary', async () => {
      const result = await repo.search(
        'user-1',
        {
          createdFrom: now,
          createdTo: now,
        },
        10,
      );
      expect(result.map((t) => t.title)).toEqual(['Alpha task']);
    });

    it('includes items on updatedAt boundary', async () => {
      const result = await repo.search(
        'user-1',
        {
          updatedFrom: later,
          updatedTo: later,
        },
        10,
      );
      expect(result.map((t) => t.title)).toEqual(['Beta work']);
    });

    it('respects limit', async () => {
      const result = await repo.search('user-1', {}, 1);
      expect(result).toHaveLength(1);
    });

    it('returns empty when no match', async () => {
      const result = await repo.search(
        'user-1',
        {
          title: 'Nope',
        },
        10,
      );
      expect(result).toEqual([]);
    });

    it('excludes items before createdFrom and includes after', async () => {
      const result = await repo.search(
        'user-1',
        {
          createdFrom: '2024-05-01T10:00:01.000Z',
          createdTo: '2024-05-02T12:00:00.000Z',
        },
        10,
      );
      expect(result.map((t) => t.title)).toEqual(['Beta work']);
    });

    it('excludes items after updatedTo and includes before', async () => {
      const result = await repo.search(
        'user-1',
        {
          updatedFrom: '2024-04-30T00:00:00.000Z',
          updatedTo: '2024-05-01T10:00:00.000Z',
        },
        10,
      );
      expect(result.map((t) => t.title)).toEqual(['Alpha task']);
    });
  });
});

describe('update todo', () => {
  describe('TodosController.update', () => {
    it('updates todo for authenticated user', async () => {
      const update = vi.fn().mockResolvedValue({ id: '1', title: 'Updated' });
      const mockService = {
        update,
      } as unknown as TodosService;
      const controller = new TodosController(mockService);
      const result = await controller.update(authedReq('user-1'), '1', { title: 'Updated' });
      expect(update).toHaveBeenCalledWith('user-1', '1', { title: 'Updated' });
      expect(result).toEqual({ id: '1', title: 'Updated' });
    });

    it('throws Forbidden when user is missing', () => {
      const controller = new TodosController({} as TodosService);
      expect(() => controller.update({} as unknown as Request, '1', { title: 'Updated' })).toThrow(ForbiddenException);
    });
  });

  describe('TodosService.update', () => {
    const projectRepo = {} as ProjectsRepository;
    const updateById = vi.fn();
    const todosRepo = {
      updateById,
    } as unknown as TodosRepository;
    const service = new TodosService(todosRepo, projectRepo);

    it('returns updated todo when repository updates', async () => {
      const updated: TodoEntity = {
        id: '1',
        projectId: '1',
        userId: 'user-1',
        title: 'Updated',
        status: TodoStatus.Done,
        isDeleted: false,
        createdAt: 'old',
        updatedAt: 'new',
      };
      updateById.mockResolvedValue(updated);

      const result = await service.update('user-1', '1', { title: 'Updated', status: TodoStatus.Done });

      expect(updateById).toHaveBeenCalledWith('1', 'user-1', { title: 'Updated', status: TodoStatus.Done });
      expect(result).toEqual(updated);
    });

    it('throws NotFound when repository returns null', async () => {
      updateById.mockResolvedValue(null);
      await expect(service.update('user-1', '1', { title: 'Updated' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('TodosRepository.updateById', () => {
    let repo: TodosRepository;
    let now: string;
    let oldUpdatedAt: string;

    beforeAll(() => {
      const sqlite = new Database(':memory:');
      sqlite.exec(`
        CREATE TABLE t_project (
          id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
          user_id text NOT NULL,
          name text NOT NULL,
          created_at text NOT NULL,
          updated_at text NOT NULL
        );
        CREATE TABLE t_todo (
          id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
          project_id integer NOT NULL,
          user_id text NOT NULL,
          title text NOT NULL,
          status integer NOT NULL,
          is_deleted integer DEFAULT true NOT NULL,
          created_at text NOT NULL,
          updated_at text NOT NULL,
          FOREIGN KEY (project_id) REFERENCES t_project(id) ON DELETE CASCADE ON UPDATE CASCADE
        );
      `);
      now = new Date().toISOString();
      oldUpdatedAt = new Date(Date.now() - 1000).toISOString();
      sqlite.prepare('INSERT INTO t_project (user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?)').run('user-1', 'project', now, now);
      sqlite
        .prepare('INSERT INTO t_todo (project_id, user_id, title, status, is_deleted, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(1, 'user-1', 'Task', TodoStatus.InProgress, 0, now, oldUpdatedAt);
      sqlite
        .prepare('INSERT INTO t_todo (project_id, user_id, title, status, is_deleted, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(1, 'other-user', 'Other Task', TodoStatus.InProgress, 0, now, oldUpdatedAt);
      sqlite
        .prepare('INSERT INTO t_todo (project_id, user_id, title, status, is_deleted, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(1, 'user-1', 'Deleted Task', TodoStatus.InProgress, 1, now, oldUpdatedAt);
      const db = drizzle(sqlite) as BetterSQLite3Database;
      repo = new TodosRepository(db);
    });

    it('updates title and status for owned active todo', async () => {
      const result = await repo.updateById('1', 'user-1', { title: 'Updated', status: TodoStatus.Done });
      expect(result).not.toBeNull();
      expect(result?.title).toBe('Updated');
      expect(result?.status).toBe(TodoStatus.Done);
      expect(result?.userId).toBe('user-1');
      expect(result?.updatedAt).not.toBe(oldUpdatedAt);
      expect(result?.createdAt).toBe(now);
      expect(result?.projectId).toBe('1');
      expect(result?.isDeleted).toBe(false);
    });

    it('returns null when todo belongs to another user', async () => {
      const result = await repo.updateById('2', 'user-1', { title: 'Updated' });
      expect(result).toBeNull();
    });

    it('returns null when todo is deleted', async () => {
      const result = await repo.updateById('3', 'user-1', { title: 'Updated' });
      expect(result).toBeNull();
    });

    it('updates isDeleted flag when provided without touching other fields', async () => {
      const initial = await repo.findById('1', 'user-1');
      const result = await repo.updateById('1', 'user-1', { isDeleted: true });
      expect(result?.isDeleted).toBe(true);
      expect(result?.title).toBe(initial?.title);
      expect(result?.status).toBe(initial?.status);
      expect(result?.projectId).toBe(initial?.projectId);
      expect(result?.userId).toBe(initial?.userId);
      expect(result?.createdAt).toBe(initial?.createdAt);
    });
  });
});

describe('delete todo', () => {
  describe('TodosController.remove', () => {
    it('deletes todo for authenticated user', async () => {
      const remove = vi.fn().mockResolvedValue(undefined);
      const mockService = {
        remove,
      } as unknown as TodosService;
      const controller = new TodosController(mockService);
      const result = await controller.remove(authedReq('user-1'), '1');
      expect(remove).toHaveBeenCalledWith('user-1', '1');
      expect(result).toBeUndefined();
    });

    it('throws Forbidden when user is missing', () => {
      const controller = new TodosController({} as TodosService);
      expect(() => controller.remove({} as unknown as Request, '1')).toThrow(ForbiddenException);
    });
  });

  describe('TodosService.remove', () => {
    const projectRepo = {} as ProjectsRepository;
    const softDelete = vi.fn();
    const todosRepo = {
      softDelete,
    } as unknown as TodosRepository;
    const service = new TodosService(todosRepo, projectRepo);

    it('returns void when repository deletes', async () => {
      softDelete.mockResolvedValue(true);
      await service.remove('user-1', '1');
      expect(softDelete).toHaveBeenCalledWith('1', 'user-1');
    });

    it('throws NotFound when repository returns false', async () => {
      softDelete.mockResolvedValue(false);
      await expect(service.remove('user-1', '1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('TodosRepository.softDelete', () => {
    let repo: TodosRepository;
    let now: string;
    let oldUpdatedAt: string;

    beforeAll(() => {
      const sqlite = new Database(':memory:');
      sqlite.exec(`
        CREATE TABLE t_project (
          id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
          user_id text NOT NULL,
          name text NOT NULL,
          created_at text NOT NULL,
          updated_at text NOT NULL
        );
        CREATE TABLE t_todo (
          id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
          project_id integer NOT NULL,
          user_id text NOT NULL,
          title text NOT NULL,
          status integer NOT NULL,
          is_deleted integer DEFAULT true NOT NULL,
          created_at text NOT NULL,
          updated_at text NOT NULL,
          FOREIGN KEY (project_id) REFERENCES t_project(id) ON DELETE CASCADE ON UPDATE CASCADE
        );
      `);
      now = new Date().toISOString();
      oldUpdatedAt = new Date(Date.now() - 1000).toISOString();
      sqlite.prepare('INSERT INTO t_project (user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?)').run('user-1', 'project', now, now);
      sqlite
        .prepare('INSERT INTO t_todo (project_id, user_id, title, status, is_deleted, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(1, 'user-1', 'Task', TodoStatus.InProgress, 0, now, oldUpdatedAt);
      sqlite
        .prepare('INSERT INTO t_todo (project_id, user_id, title, status, is_deleted, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(1, 'other-user', 'Other Task', TodoStatus.InProgress, 0, now, oldUpdatedAt);
      sqlite
        .prepare('INSERT INTO t_todo (project_id, user_id, title, status, is_deleted, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(1, 'user-1', 'Deleted Task', TodoStatus.InProgress, 1, now, oldUpdatedAt);
      const db = drizzle(sqlite) as BetterSQLite3Database;
      repo = new TodosRepository(db);
    });

    it('soft deletes owned active todo', async () => {
      const result = await repo.softDelete('1', 'user-1');
      expect(result).toBe(true);
      const found = await repo.findById('1', 'user-1');
      expect(found).toBeNull();
    });

    it('returns false when todo belongs to another user', async () => {
      const result = await repo.softDelete('2', 'user-1');
      expect(result).toBe(false);
    });

    it('returns false when todo already deleted', async () => {
      const result = await repo.softDelete('3', 'user-1');
      expect(result).toBe(false);
    });
  });
});
