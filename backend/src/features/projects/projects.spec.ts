import 'reflect-metadata';
import Database from 'better-sqlite3';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException, ValidationPipe } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { CreateProjectDto } from './projects.dto';
import { ProjectsController } from './projects.controller';
import { ProjectEntity, ProjectsRepository } from './projects.repository';
import { ProjectsService } from './projects.service';

describe('create project', () => {
  describe('controller', () => {
    it('returns created project for authenticated user', async () => {
      const create = vi.fn().mockResolvedValue({ id: '1' });
      const mockService = {
        create,
      } as unknown as ProjectsService;
      const controller = new ProjectsController(mockService);
      const result = await controller.create({ user: { sub: 'user-1' } }, { name: 'New Project' } as CreateProjectDto);
      expect(create).toHaveBeenCalledWith('user-1', { name: 'New Project' });
      expect(result).toEqual({ id: '1' });
    });

    it('throws Forbidden when user is missing', () => {
      const controller = new ProjectsController({} as ProjectsService);
      expect(() => controller.create({}, { name: 'New Project' } as CreateProjectDto)).toThrow(ForbiddenException);
    });

    it('validates request body', async () => {
      const pipe = new ValidationPipe({ whitelist: true, transform: true });
      await expect(
        pipe.transform(
          {},
          {
            type: 'body',
            metatype: CreateProjectDto,
          },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('service', () => {
    const findByName = vi.fn();
    const insertProject = vi.fn();
    const repo = {
      findByName,
      insertProject,
    } as unknown as ProjectsRepository;
    const service = new ProjectsService(repo);

    it('creates project when not duplicated', async () => {
      findByName.mockResolvedValue(null);
      const entity: ProjectEntity = {
        id: '1',
        userId: 'user-1',
        name: 'New Project',
        createdAt: 'now',
        updatedAt: 'now',
      };
      insertProject.mockResolvedValue(entity);

      const result = await service.create('user-1', { name: 'New Project' });

      expect(findByName).toHaveBeenCalledWith('user-1', 'New Project');
      expect(insertProject).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1', name: 'New Project' }));
      expect(result).toEqual(entity);
    });

    it('throws Conflict when project name already exists for user', async () => {
      findByName.mockResolvedValue({
        id: '1',
        userId: 'user-1',
        name: 'New Project',
        createdAt: 'now',
        updatedAt: 'now',
      });

      await expect(service.create('user-1', { name: 'New Project' })).rejects.toThrow(ConflictException);
    });
  });

  describe('repository', () => {
    let repo: ProjectsRepository;

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
      `);
      const db = drizzle(sqlite) as BetterSQLite3Database;
      repo = new ProjectsRepository(db);
    });

    it('inserts project and returns mapped entity', async () => {
      const result = await repo.insertProject({ userId: 'user-1', name: 'Project A' });
      expect(result).toMatchObject({
        id: '1',
        userId: 'user-1',
        name: 'Project A',
      });
      expect(result.createdAt).toBeTruthy();
      expect(result.updatedAt).toBeTruthy();
    });

    it('uses provided timestamps when given', async () => {
      const createdAt = new Date('2024-01-01T00:00:00.000Z').toISOString();
      const updatedAt = new Date('2024-01-02T00:00:00.000Z').toISOString();
      const result = await repo.insertProject({ userId: 'user-1', name: 'Project B', createdAt, updatedAt });
      expect(result.createdAt).toBe(createdAt);
      expect(result.updatedAt).toBe(updatedAt);
    });
  });
});

describe('update project', () => {
  describe('controller', () => {
    it('updates project for authenticated user', async () => {
      const update = vi.fn().mockResolvedValue({ id: '1', name: 'updated' });
      const mockService = {
        update,
      } as unknown as ProjectsService;
      const controller = new ProjectsController(mockService);
      const result = await controller.update({ user: { sub: 'user-1' } }, '1', { name: 'updated' });
      expect(update).toHaveBeenCalledWith('user-1', '1', { name: 'updated' });
      expect(result).toEqual({ id: '1', name: 'updated' });
    });

    it('throws Forbidden when user is missing', () => {
      const controller = new ProjectsController({} as ProjectsService);
      expect(() => controller.update({}, '1', { name: 'updated' })).toThrow(ForbiddenException);
    });
  });

  describe('service', () => {
    const updateProject = vi.fn();
    const repo = {
      updateProject,
    } as unknown as ProjectsRepository;
    const service = new ProjectsService(repo);

    it('returns updated project when repository updates', async () => {
      const entity: ProjectEntity = {
        id: '1',
        userId: 'user-1',
        name: 'updated',
        createdAt: 'now',
        updatedAt: 'later',
      };
      updateProject.mockResolvedValue(entity);
      const result = await service.update('user-1', '1', { name: 'updated' });
      expect(updateProject).toHaveBeenCalledWith('1', 'user-1', { name: 'updated' });
      expect(result).toEqual(entity);
    });

    it('throws NotFound when repository returns null', async () => {
      updateProject.mockResolvedValue(null);
      await expect(service.update('user-1', '1', { name: 'updated' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('repository', () => {
    let repo: ProjectsRepository;
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
      `);
      now = new Date().toISOString();
      oldUpdatedAt = new Date(Date.now() - 1000).toISOString();
      sqlite.prepare('INSERT INTO t_project (user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?)').run('user-1', 'project', now, oldUpdatedAt);
      sqlite.prepare('INSERT INTO t_project (user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?)').run('other-user', 'project2', now, oldUpdatedAt);
      const db = drizzle(sqlite) as BetterSQLite3Database;
      repo = new ProjectsRepository(db);
    });

    it('updates name when owned', async () => {
      const result = await repo.updateProject('1', 'user-1', { name: 'updated' });
      expect(result?.name).toBe('updated');
      expect(result?.userId).toBe('user-1');
      expect(result?.createdAt).toBe(now);
      expect(result?.updatedAt).not.toBe(oldUpdatedAt);
    });

    it('returns null when project belongs to another user', async () => {
      const result = await repo.updateProject('2', 'user-1', { name: 'updated' });
      expect(result).toBeNull();
    });
  });
});

describe('remove project', () => {
  describe('controller', () => {
    it('removes project for authenticated user', async () => {
      const remove = vi.fn().mockResolvedValue(undefined);
      const mockService = {
        remove,
      } as unknown as ProjectsService;
      const controller = new ProjectsController(mockService);
      const result = await controller.remove({ user: { sub: 'user-1' } }, '1');
      expect(remove).toHaveBeenCalledWith('user-1', '1');
      expect(result).toBeUndefined();
    });

    it('throws Forbidden when user is missing', () => {
      const controller = new ProjectsController({} as ProjectsService);
      expect(() => controller.remove({}, '1')).toThrow(ForbiddenException);
    });
  });

  describe('service', () => {
    const softDelete = vi.fn();
    const repo = {
      softDelete,
    } as unknown as ProjectsRepository;
    const service = new ProjectsService(repo);

    it('completes when repository deletes', async () => {
      softDelete.mockResolvedValue(true);
      await service.remove('user-1', '1');
      expect(softDelete).toHaveBeenCalledWith('1', 'user-1');
    });

    it('throws NotFound when repository returns false', async () => {
      softDelete.mockResolvedValue(false);
      await expect(service.remove('user-1', '1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('repository', () => {
    let repo: ProjectsRepository;
    let now: string;

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
      `);
      now = new Date().toISOString();
      sqlite.prepare('INSERT INTO t_project (user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?)').run('user-1', 'project', now, now);
      sqlite.prepare('INSERT INTO t_project (user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?)').run('other-user', 'project2', now, now);
      const db = drizzle(sqlite) as BetterSQLite3Database;
      repo = new ProjectsRepository(db);
    });

    it('deletes owned project', async () => {
      const result = await repo.softDelete('1', 'user-1');
      expect(result).toBe(true);
      const found = await repo.findById('1', 'user-1');
      expect(found).toBeNull();
    });

    it('returns false when project belongs to another user', async () => {
      const result = await repo.softDelete('2', 'user-1');
      expect(result).toBe(false);
    });
  });
});

describe('list projects by user', () => {
  describe('controller', () => {
    it('returns empty list for authenticated user', async () => {
      const listByUser = vi.fn().mockResolvedValue({ items: [] });
      const mockService = {
        listByUser,
      } as unknown as ProjectsService;
      const controller = new ProjectsController(mockService);
      const result = await controller.listByUser({ user: { sub: 'user-1' } });
      expect(listByUser).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ items: [] });
    });

    it('returns single item list for authenticated user', async () => {
      const listByUser = vi.fn().mockResolvedValue({ items: [{ id: '1' }] });
      const mockService = {
        listByUser,
      } as unknown as ProjectsService;
      const controller = new ProjectsController(mockService);
      const result = await controller.listByUser({ user: { sub: 'user-1' } });
      expect(listByUser).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ items: [{ id: '1' }] });
    });

    it('returns two items for authenticated user', async () => {
      const listByUser = vi.fn().mockResolvedValue({ items: [{ id: '1' }, { id: '2' }] });
      const mockService = {
        listByUser,
      } as unknown as ProjectsService;
      const controller = new ProjectsController(mockService);
      const result = await controller.listByUser({ user: { sub: 'user-1' } });
      expect(listByUser).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ items: [{ id: '1' }, { id: '2' }] });
    });

    it('throws Forbidden when user is missing', () => {
      const controller = new ProjectsController({} as ProjectsService);
      expect(() => controller.listByUser({})).toThrow(ForbiddenException);
    });
  });

  describe('service', () => {
    const listByUser = vi.fn();
    const repo = {
      listByUser,
    } as unknown as ProjectsRepository;
    const service = new ProjectsService(repo);

    it('returns empty list', async () => {
      listByUser.mockResolvedValue([]);
      const result = await service.listByUser('user-1', 'user-1');
      expect(listByUser).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ items: [] });
    });

    it('returns single item list', async () => {
      const entities: ProjectEntity[] = [
        { id: '1', userId: 'user-1', name: 'proj1', createdAt: 'now', updatedAt: 'now' },
      ];
      listByUser.mockResolvedValue(entities);
      const result = await service.listByUser('user-1', 'user-1');
      expect(listByUser).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ items: entities });
    });

    it('returns two item list', async () => {
      const entities: ProjectEntity[] = [
        { id: '1', userId: 'user-1', name: 'proj1', createdAt: 'now', updatedAt: 'now' },
        { id: '2', userId: 'user-1', name: 'proj2', createdAt: 'now', updatedAt: 'now' },
      ];
      listByUser.mockResolvedValue(entities);
      const result = await service.listByUser('user-1', 'user-1');
      expect(listByUser).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ items: entities });
    });

    it('throws Forbidden when path user differs', async () => {
      await expect(service.listByUser('user-1', 'other')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('repository', () => {
    let repo: ProjectsRepository;

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
      `);
      const now = new Date().toISOString();
      const insert = sqlite.prepare('INSERT INTO t_project (user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?)');
      insert.run('user-1', 'project-a', now, now);
      insert.run('user-1', 'project-b', now, now);
      insert.run('other-user', 'project-c', now, now);
      const db = drizzle(sqlite) as BetterSQLite3Database;
      repo = new ProjectsRepository(db);
    });

    it('returns only projects for the given user', async () => {
      const result = await repo.listByUser('user-1');
      expect(result.map((p) => p.name)).toEqual(['project-a', 'project-b']);
    });

    it('returns single project when only one exists', async () => {
      const sqlite = new Database(':memory:');
      const now = new Date().toISOString();
      sqlite.exec(`
        CREATE TABLE t_project (
          id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
          user_id text NOT NULL,
          name text NOT NULL,
          created_at text NOT NULL,
          updated_at text NOT NULL
        );
      `);
      sqlite.prepare('INSERT INTO t_project (user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?)').run('user-1', 'only', now, now);
      const db = drizzle(sqlite) as BetterSQLite3Database;
      const singleRepo = new ProjectsRepository(db);
      const result = await singleRepo.listByUser('user-1');
      expect(result.map((p) => p.name)).toEqual(['only']);
    });

    it('returns empty array when none exists', async () => {
      const sqlite = new Database(':memory:');
      sqlite.exec(`
        CREATE TABLE t_project (
          id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
          user_id text NOT NULL,
          name text NOT NULL,
          created_at text NOT NULL,
          updated_at text NOT NULL
        );
      `);
      const db = drizzle(sqlite) as BetterSQLite3Database;
      const emptyRepo = new ProjectsRepository(db);
      const result = await emptyRepo.listByUser('user-1');
      expect(result).toEqual([]);
    });
  });
});
