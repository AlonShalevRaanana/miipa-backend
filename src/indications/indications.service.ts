/**
 * Indications Service - Cancer Indication Data Retrieval
 * 
 * This service handles all indication-related data queries from Neo4j.
 * Supports filtering by geographic regions and sorting by various metrics.
 * 
 * Features:
 * - List indications with epidemiology data (prevalence, incidence)
 * - Filter by USA, EU, APAC regions
 * - Sort by prevalence, incidence, or alphabetically
 * - Ascending/descending order support
 * 
 * Data validated against OncoKB (December 2024):
 * - 45 oncology indications
 * - Epidemiology metrics from SEER/GLOBOCAN
 * 
 * @module IndicationsService
 */

import { Inject, Injectable } from '@nestjs/common';
import { Driver, int } from 'neo4j-driver';

/** Sort field options for indication listing */
export type IndicationSortBy = 'prevalence' | 'incidence' | 'alphabetical';

/** Sort direction */
export type SortOrder = 'asc' | 'desc';

@Injectable()
export class IndicationsService {
  /**
   * Creates an instance of IndicationsService.
   * 
   * @param driver - Neo4j driver instance
   */
  constructor(@Inject('NEO4J_DRIVER') private readonly driver: Driver) {}

  /**
   * Retrieves indications with epidemiology data, sorted and filtered.
   * 
   * @param limit - Maximum number of results to return
   * @param regions - Geographic regions to include (USA, EU, APAC)
   * @param sortBy - Field to sort by (prevalence, incidence, alphabetical)
   * @param sortOrder - Sort direction (asc, desc)
   * @returns Array of indication summaries with prevalence/incidence totals
   */
  async getTopIndications(
    limit = 10, 
    regions: string[] = ['USA', 'EU', 'APAC'],
    sortBy: IndicationSortBy = 'prevalence',
    sortOrder: SortOrder = 'desc'
  ) {
    const session = this.driver.session();
    try {
      // Build ORDER BY clause based on sort options
      const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
      let orderClause: string;
      
      switch (sortBy) {
        case 'incidence':
          orderClause = `ORDER BY totalIncidence ${order}`;
          break;
        case 'alphabetical':
          orderClause = `ORDER BY i.name ${order}`;
          break;
        case 'prevalence':
        default:
          orderClause = `ORDER BY totalPrevalence ${order}`;
          break;
      }

      const res = await session.readTransaction(tx =>
        tx.run(
          `
          MATCH (i:Indication)
          OPTIONAL MATCH (i)-[:MEASURED_BY]->(ep:EpidemiologyMetric {type: 'PREVALENCE'})-[:FOR_REGION]->(rp:Region)
          WHERE rp.name IN $regions
          OPTIONAL MATCH (i)-[:MEASURED_BY]->(ei:EpidemiologyMetric {type: 'INCIDENCE'})-[:FOR_REGION]->(ri:Region)
          WHERE ri.name IN $regions
          WITH i, sum(ep.value) as totalPrevalence, sum(ei.value) as totalIncidence
          RETURN i, totalPrevalence, totalIncidence
          ${orderClause}
          LIMIT $limit
          `,
          { limit: int(limit), regions }
        )
      );

      return res.records.map((rec, idx) => {
        const i = rec.get('i').properties;
        const prevalence = rec.get('totalPrevalence');
        const incidence = rec.get('totalIncidence');
        return {
          id: i.id,
          name: i.name,
          rank: idx + 1,
          totalPrevalence: prevalence ? Math.round(typeof prevalence === 'object' ? prevalence.toNumber() : prevalence) : 0,
          totalIncidence: incidence ? Math.round(typeof incidence === 'object' ? incidence.toNumber() : incidence) : 0
        };
      });
    } finally {
      await session.close();
    }
  }
}