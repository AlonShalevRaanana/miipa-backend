/**
 * Mutations Service - Genetic Mutation Data Retrieval
 * 
 * This service handles all mutation-related data queries from Neo4j.
 * Provides comprehensive mutation data including therapeutic actionability,
 * prevalence estimates, and associated indications.
 * 
 * Features:
 * - List all mutations with actionability counts
 * - Calculate estimated patient populations per mutation
 * - Filter epidemiology by geographic regions (USA, EU, APAC)
 * - Sort by actionability, prevalence, incidence, or alphabetically
 * 
 * Data validated against OncoKB (December 2024):
 * - 61 mutations across 31 genes
 * - 39 mutations with therapeutic actionability
 * - All Level 1 FDA-approved biomarkers verified
 * 
 * @module MutationsService
 */

import { Inject, Injectable } from '@nestjs/common';
import { Driver, int } from 'neo4j-driver';

/** Sort field options for mutation listing */
export type SortBy = 'actionability' | 'alphabetical' | 'prevalence' | 'incidence';

/** Sort direction */
export type SortOrder = 'asc' | 'desc';

@Injectable()
export class MutationsService {
  constructor(@Inject('NEO4J_DRIVER') private readonly driver: Driver) {}

  /**
   * Retrieves all mutations with actionability and patient estimates.
   * 
   * Patient estimates are calculated as:
   * (indication prevalence) × (mutation % in that indication) / 100
   * 
   * @param limit - Maximum number of results
   * @param sortBy - Sort field (actionability, alphabetical, prevalence, incidence)
   * @param sortOrder - Sort direction (asc, desc)
   * @param regions - Geographic regions for epidemiology filtering
   * @returns Array of mutation summaries with actionability and patient estimates
   */
  async getAllMutations(limit = 50, sortBy: SortBy = 'actionability', sortOrder: SortOrder = 'desc', regions: string[] = ['USA', 'EU', 'APAC']) {
    const session = this.driver.session();
    try {
      // Build ORDER BY clause based on sort options
      let orderClause: string;
      const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
      
      switch (sortBy) {
        case 'alphabetical':
          orderClause = `ORDER BY m.name ${order}`;
          break;
        case 'prevalence':
          orderClause = `ORDER BY estimatedPatients ${order}, m.name ASC`;
          break;
        case 'incidence':
          orderClause = `ORDER BY estimatedNewCases ${order}, m.name ASC`;
          break;
        case 'actionability':
        default:
          orderClause = `ORDER BY actionabilityCount ${order}, m.name ASC`;
          break;
      }

      // Query uses MutationPrevalence to calculate estimated patient counts
      // Formula: (indication prevalence) * (mutation % in that indication) / 100
      // Only sum epidemiology from selected regions
      const res = await session.run(
        `
        MATCH (m:Mutation)-[:IN_GENE]->(g:Gene)
        OPTIONAL MATCH (m)-[:HAS_THERAPEUTIC_ACTIONABILITY]->(ta:TherapeuticActionability)
        OPTIONAL MATCH (m)-[:HAS_PREVALENCE]->(mp:MutationPrevalence)-[:IN_INDICATION]->(i:Indication)
        OPTIONAL MATCH (i)-[:MEASURED_BY]->(ep:EpidemiologyMetric {type: 'PREVALENCE'})-[:FOR_REGION]->(rp:Region)
        WHERE rp.name IN $regions
        OPTIONAL MATCH (i)-[:MEASURED_BY]->(ei:EpidemiologyMetric {type: 'INCIDENCE'})-[:FOR_REGION]->(ri:Region)
        WHERE ri.name IN $regions
        WITH m, g, 
             count(DISTINCT ta) as actionabilityCount,
             sum(ep.value * mp.percentageOfPatients / 100) as estimatedPatients,
             sum(ei.value * mp.percentageOfPatients / 100) as estimatedNewCases,
             collect(DISTINCT {indication: i.name, percentage: mp.percentageOfPatients}) as prevalenceByIndication
        RETURN m, g.hugoSymbol as gene, actionabilityCount, 
               coalesce(estimatedPatients, 0) as estimatedPatients,
               coalesce(estimatedNewCases, 0) as estimatedNewCases,
               prevalenceByIndication
        ${orderClause}
        LIMIT $limit
        `,
        { limit: int(limit), regions }
      );

      return res.records.map(rec => {
        const m = rec.get('m').properties;
        const patients = rec.get('estimatedPatients');
        const newCases = rec.get('estimatedNewCases');
        return {
          id: m.id,
          name: m.name,
          gene: rec.get('gene'),
          alteration: m.alteration,
          oncogenic: m.oncogenic || 'Unknown',
          actionabilityCount: rec.get('actionabilityCount').toNumber(),
          estimatedPatients: typeof patients === 'object' ? Math.round(patients.toNumber()) : Math.round(patients || 0),
          estimatedNewCases: typeof newCases === 'object' ? Math.round(newCases.toNumber()) : Math.round(newCases || 0)
        };
      });
    } finally {
      await session.close();
    }
  }
}
