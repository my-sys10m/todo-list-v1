import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { sampleTable } from '../../schemas/sample';
import { DRIZZLE_DB } from '../../database/database.tokens';
import { SampleEntity } from './todos.entity';

@Injectable()
export class TodosRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: BetterSQLite3Database,
  ) {}

  getSample(): SampleEntity {
    const rows = this.db
      .select()
      .from(sampleTable)
      .where(eq(sampleTable.id, 1))
      .limit(1)
      .all();

    if (!rows.length || !rows[0].objects) {
      throw new Error('Sample data not found');
    }

    return {
      id: rows[0].id,
      objects: rows[0].objects,
    };
  }
}
