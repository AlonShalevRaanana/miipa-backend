/**
 * MIIPA Service - Core Business Logic for MIIPA Knowledge Graph
 * 
 * This service provides the main data retrieval functionality for the MIIPA
 * (Mutation-Indication-Incidence-Prevalence-Actionability) dashboard.
 * 
 * It queries a Neo4j graph database to retrieve comprehensive information about:
 * - Cancer indications (diseases) and their associated data
 * - Genetic mutations and their clinical relevance
 * - Epidemiology metrics (prevalence, incidence) across geographic regions
 * - Therapeutic options and their actionability levels
 * - Diagnostic modalities and competitive landscape
 * 
 * @module MiipaService
 * @author MIIPA Development Team
 */

import { Inject, Injectable } from '@nestjs/common';
import { Driver } from 'neo4j-driver';

@Injectable()
export class MiipaService {
  /**
   * Creates an instance of MiipaService.
   * @param driver - Neo4j database driver injected via NestJS DI
   */
  constructor(
    @Inject('NEO4J_DRIVER') private readonly driver: Driver
  ) {}

  /**
   * Retrieves comprehensive MIIPA data for a specific cancer indication.
   * 
   * This method fetches all relevant data for an indication including:
   * - Basic indication information (name, aliases, oncotree code)
   * - Associated mutations with their prevalence percentages
   * - Epidemiology metrics filtered by selected geographic regions
   * - Available therapies linked to this indication
   * - Diagnostic modalities used for this indication
   * 
   * The mutation data includes calculated estimates of:
   * - Estimated prevalence patients: (indication prevalence × mutation %) 
   * - Estimated incidence patients: (indication incidence × mutation %)
   * 
   * @param indicationId - Unique identifier for the indication (e.g., 'ind-breast-cancer')
   * @param regions - Array of geographic regions to filter epidemiology data (e.g., ['USA', 'EU', 'APAC'])
   * @returns Promise containing indication data with mutations, epidemiology, therapies, and diagnostics
   * @returns null if indication not found
   * 
   * @example
   * const data = await miipaService.getIndicationMiipa('ind-breast-cancer', ['USA', 'EU']);
   */
  async getIndicationMiipa(indicationId: string, regions: string[]) {
    const session = this.driver.session();
    try {
      const result = await session.readTransaction(async tx => {
        // First get indication basic data
        const res = await tx.run(
          `
          MATCH (i:Indication {id: $indicationId})
          OPTIONAL MATCH (i)-[:HAS_THERAPY]->(t:Therapy)
          OPTIONAL MATCH (i)-[:HAS_DIAGNOSTIC]->(d:DiagnosticModality)
          OPTIONAL MATCH (i)-[:MEASURED_BY]->(e:EpidemiologyMetric)-[:FOR_REGION]->(r:Region)
          WHERE r.name IN $regions
          RETURN i,
                 collect(DISTINCT {therapy: t, region: r}) AS therapies,
                 collect(DISTINCT {diagnostic: d, region: r}) AS diagnostics,
                 collect(DISTINCT {epi: e, region: r}) AS epidemiology
          `,
          { indicationId, regions }
        );

        if (res.records.length === 0) return null;
        const rec = res.records[0];

        // Get mutations with prevalence data for this indication
        const mutRes = await tx.run(
          `
          MATCH (i:Indication {id: $indicationId})
          MATCH (m:Mutation)-[:IN_GENE]->(g:Gene)
          WHERE (m)-[:ASSOCIATED_WITH]->(i)
             OR (m)-[:HAS_THERAPEUTIC_ACTIONABILITY]->(:TherapeuticActionability)-[:FOR_INDICATION]->(i)
             OR (m)-[:HAS_PREVALENCE]->(:MutationPrevalence)-[:IN_INDICATION]->(i)
          OPTIONAL MATCH (m)-[:HAS_PREVALENCE]->(mp:MutationPrevalence)-[:IN_INDICATION]->(i)
          OPTIONAL MATCH (i)-[:MEASURED_BY]->(epPrev:EpidemiologyMetric {type: 'PREVALENCE'})-[:FOR_REGION]->(rPrev:Region)
          WHERE rPrev.name IN $regions
          OPTIONAL MATCH (i)-[:MEASURED_BY]->(epInc:EpidemiologyMetric {type: 'INCIDENCE'})-[:FOR_REGION]->(rInc:Region)
          WHERE rInc.name IN $regions
          WITH m, g, mp,
               sum(DISTINCT epPrev.value) as totalPrevalence,
               sum(DISTINCT epInc.value) as totalIncidence
          RETURN m, g.hugoSymbol as gene, g.name as geneName,
                 mp.percentageOfPatients as percentageOfPatients,
                 totalPrevalence,
                 totalIncidence,
                 CASE WHEN mp.percentageOfPatients IS NOT NULL AND totalPrevalence > 0 
                      THEN mp.percentageOfPatients * totalPrevalence / 100 
                      ELSE 0 END as estimatedPrevalencePatients,
                 CASE WHEN mp.percentageOfPatients IS NOT NULL AND totalIncidence > 0 
                      THEN mp.percentageOfPatients * totalIncidence / 100 
                      ELSE 0 END as estimatedIncidencePatients
          `,
          { indicationId, regions }
        );

        const i = rec.get('i').properties;
        const therapiesRaw = rec.get('therapies') as any[];
        const diagnosticsRaw = rec.get('diagnostics') as any[];
        const epiRaw = rec.get('epidemiology') as any[];

        const therapies = therapiesRaw
          .filter(t => t.therapy)
          .map(t => ({
            ...t.therapy.properties,
            region: t.region ? t.region.properties.name : null
          }));

        const diagnostics = diagnosticsRaw
          .filter(d => d.diagnostic)
          .map(d => ({
            ...d.diagnostic.properties,
            region: d.region ? d.region.properties.name : null
          }));

        const epidemiology = epiRaw
          .filter(e => e.epi)
          .map(e => ({
            ...e.epi.properties,
            region: e.region ? e.region.properties.name : null
          }));

        const mutations = mutRes.records.map(mutRec => {
          const m = mutRec.get('m').properties;
          const pct = mutRec.get('percentageOfPatients');
          const estPrev = mutRec.get('estimatedPrevalencePatients');
          const estInc = mutRec.get('estimatedIncidencePatients');
          return {
            ...m,
            gene: mutRec.get('gene') || mutRec.get('geneName'),
            percentageOfPatients: pct ? (typeof pct === 'object' ? pct.toNumber() : pct) : null,
            estimatedPrevalencePatients: estPrev ? Math.round(typeof estPrev === 'object' ? estPrev.toNumber() : estPrev) : 0,
            estimatedIncidencePatients: estInc ? Math.round(typeof estInc === 'object' ? estInc.toNumber() : estInc) : 0
          };
        });

        return {
          indication: i,
          mutations,
          epidemiology,
          therapies,
          diagnostics
        };
      });

      return result;
    } finally {
      await session.close();
    }
  }

  /**
   * Retrieves comprehensive MIIPA data for a specific genetic mutation.
   * 
   * This method fetches all relevant data for a mutation including:
   * - Basic mutation information (gene, alteration, oncogenic status)
   * - Associated cancer indications where this mutation is relevant
   * - Epidemiology metrics for associated indications
   * - Therapeutic actionability (drugs that target this mutation)
   * - Diagnostic modalities that can detect this mutation
   * 
   * @param mutationId - Unique identifier for the mutation (e.g., 'mut-egfr-l858r')
   * @param regions - Array of geographic regions to filter epidemiology data
   * @returns Promise containing mutation data with indications, therapies, epidemiology, and diagnostics
   */
  async getMutationMiipa(mutationId: string, regions: string[]) {
    const session = this.driver.session();
    try {
      const result = await session.readTransaction(async tx => {
        // Query basic mutation data with associated indications and epidemiology
        const res = await tx.run(
          `
          MATCH (m:Mutation {id: $mutationId})-[:IN_GENE]->(g:Gene)
          OPTIONAL MATCH (m)-[:ASSOCIATED_WITH]->(i:Indication)
          OPTIONAL MATCH (i)-[:MEASURED_BY]->(e:EpidemiologyMetric)-[:FOR_REGION]->(r:Region)
          WHERE r.name IN $regions
          OPTIONAL MATCH (m)-[:HAS_ACTIONABILITY]->(a:Actionability)
          OPTIONAL MATCH (i)-[:HAS_DIAGNOSTIC]->(d:DiagnosticModality)
          RETURN m, g,
                 collect(DISTINCT {indication: i}) AS indications,
                 collect(DISTINCT {epi: e, region: r}) AS epidemiology,
                 collect(DISTINCT a) AS actionability,
                 collect(DISTINCT {diagnostic: d, indication: i}) AS diagnostics
          `,
          { mutationId, regions }
        );

        if (res.records.length === 0) return null;
        const rec = res.records[0];

        // Query therapies from TherapeuticActionability nodes
        const therapyRes = await tx.run(
          `
          MATCH (m:Mutation {id: $mutationId})
          OPTIONAL MATCH (m)-[:HAS_THERAPEUTIC_ACTIONABILITY]->(ta:TherapeuticActionability)-[:FOR_INDICATION]->(i:Indication)
          WHERE ta.drugs IS NOT NULL
          UNWIND ta.drugs AS drugName
          OPTIONAL MATCH (t:Therapy)
          WHERE t.name = drugName OR drugName IN t.brandNames
          RETURN DISTINCT drugName, t, i.name as indication, ta.level as level, ta.fdaApproved as fdaApproved
          `,
          { mutationId }
        );

        const m = rec.get('m').properties;
        const g = rec.get('g')?.properties || null;
        const indicationsRaw = rec.get('indications') as any[];
        const epiRaw = rec.get('epidemiology') as any[];
        const actionabilityRaw = rec.get('actionability') as any[];
        const diagnosticsRaw = rec.get('diagnostics') as any[];

        const indications = indicationsRaw
          .filter(i => i.indication)
          .map(i => i.indication.properties);

        const epidemiology = epiRaw
          .filter(e => e.epi)
          .map(e => ({
            ...e.epi.properties,
            region: e.region ? e.region.properties.name : null
          }));

        const actionability = actionabilityRaw
          .filter(a => a)
          .map(a => a.properties);

        const therapies = therapyRes.records.map(tRec => {
          const therapy = tRec.get('t');
          const drugName = tRec.get('drugName');
          const indication = tRec.get('indication');
          const level = tRec.get('level');
          const fdaApproved = tRec.get('fdaApproved');
          
          if (therapy) {
            return {
              ...therapy.properties,
              indication,
              level,
              fdaApproved
            };
          }
          return {
            name: drugName,
            indication,
            level,
            fdaApproved
          };
        });

        const diagnostics = diagnosticsRaw
          .filter(d => d.diagnostic)
          .map(d => ({
            ...d.diagnostic.properties,
            indication: d.indication ? d.indication.properties.name : null
          }));

        return {
          mutation: m,
          gene: g,
          indications,
          epidemiology,
          actionability,
          therapies,
          diagnostics
        };
      });

      return result;
    } finally {
      await session.close();
    }
  }
}