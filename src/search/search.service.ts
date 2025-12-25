import { Inject, Injectable } from '@nestjs/common';
import { Driver, int } from 'neo4j-driver';

@Injectable()
export class SearchService {
  constructor(@Inject('NEO4J_DRIVER') private readonly driver: Driver) {}

  async search(q: string) {
    const session = this.driver.session();
    try {
      // Search indications
      const indicationsRes = await session.run(
        `
        MATCH (i:Indication)
        WHERE toLower(i.name) CONTAINS toLower($q)
        RETURN 'indication' AS type, i.id AS id, i.name AS name
        LIMIT 10
        `,
        { q }
      );

      // Search mutations
      const mutationsRes = await session.run(
        `
        MATCH (m:Mutation)
        WHERE toLower(m.name) CONTAINS toLower($q)
           OR toLower(m.alias) CONTAINS toLower($q)
        RETURN 'mutation' AS type, m.id AS id, m.name AS name
        LIMIT 10
        `,
        { q }
      );

      const results = [
        ...indicationsRes.records.map(rec => ({
          type: rec.get('type'),
          id: rec.get('id'),
          name: rec.get('name')
        })),
        ...mutationsRes.records.map(rec => ({
          type: rec.get('type'),
          id: rec.get('id'),
          name: rec.get('name')
        }))
      ];

      return results;
    } finally {
      await session.close();
    }
  }

  // Autocomplete suggestions for search dropdown
  async autocomplete(q: string, limit: number = 10) {
    if (!q || q.length < 2) return [];
    
    const session = this.driver.session();
    try {
      // Search indications - prioritize starts with, then contains
      const indicationsRes = await session.run(
        `
        MATCH (i:Indication)
        WHERE toLower(i.name) STARTS WITH toLower($q)
           OR toLower(i.name) CONTAINS toLower($q)
           OR ANY(alias IN i.aliases WHERE toLower(alias) CONTAINS toLower($q))
        WITH i, 
             CASE WHEN toLower(i.name) STARTS WITH toLower($q) THEN 0 ELSE 1 END AS priority
        RETURN 'indication' AS type, i.id AS id, i.name AS name, priority
        ORDER BY priority, i.name
        LIMIT $limit
        `,
        { q, limit: int(limit) }
      );

      // Search mutations - by gene or alteration
      const mutationsRes = await session.run(
        `
        MATCH (m:Mutation)
        WHERE toLower(m.name) STARTS WITH toLower($q)
           OR toLower(m.name) CONTAINS toLower($q)
           OR toLower(m.gene) STARTS WITH toLower($q)
           OR toLower(m.alteration) CONTAINS toLower($q)
        WITH m,
             CASE WHEN toLower(m.name) STARTS WITH toLower($q) OR toLower(m.gene) STARTS WITH toLower($q) THEN 0 ELSE 1 END AS priority
        RETURN 'mutation' AS type, m.id AS id, m.name AS name, m.gene AS gene, priority
        ORDER BY priority, m.name
        LIMIT $limit
        `,
        { q, limit: int(limit) }
      );

      // Combine and sort results
      const indications = indicationsRes.records.map(rec => ({
        type: rec.get('type') as string,
        id: rec.get('id') as string,
        name: rec.get('name') as string,
        label: rec.get('name') as string,
        category: 'Indication'
      }));

      const mutations = mutationsRes.records.map(rec => {
        const gene = rec.get('gene');
        const name = rec.get('name') as string;
        return {
          type: rec.get('type') as string,
          id: rec.get('id') as string,
          name: name,
          label: gene ? `${gene} - ${name}` : name,
          category: 'Mutation'
        };
      });

      // Interleave results, prioritizing exact matches
      return [...indications, ...mutations].slice(0, limit);
    } finally {
      await session.close();
    }
  }
}