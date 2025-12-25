import neo4j from 'neo4j-driver';
import * as dotenv from 'dotenv';
dotenv.config();

const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
const user = process.env.NEO4J_USER || 'neo4j';
const password = process.env.NEO4J_PASSWORD || 'password';

const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

async function seed() {
  const session = driver.session();

  try {
    console.log('Clearing existing data...');
    await session.run('MATCH (n) DETACH DELETE n');

    console.log('Creating regions...');
    await session.run(`
      CREATE (:Region {name: 'USA'})
      CREATE (:Region {name: 'EU'})
      CREATE (:Region {name: 'APAC'})
    `);

    console.log('Creating top 10 US oncology indications...');
    const indications = [
      { id: 'ind-breast', name: 'Breast Cancer', prevalenceRankUSA: 1 },
      { id: 'ind-prostate', name: 'Prostate Cancer', prevalenceRankUSA: 2 },
      { id: 'ind-lung', name: 'Non-Small Cell Lung Cancer (NSCLC)', prevalenceRankUSA: 3 },
      { id: 'ind-colorectal', name: 'Colorectal Cancer', prevalenceRankUSA: 4 },
      { id: 'ind-melanoma', name: 'Melanoma', prevalenceRankUSA: 5 },
      { id: 'ind-bladder', name: 'Bladder Cancer', prevalenceRankUSA: 6 },
      { id: 'ind-kidney', name: 'Renal Cell Carcinoma', prevalenceRankUSA: 7 },
      { id: 'ind-thyroid', name: 'Thyroid Cancer', prevalenceRankUSA: 8 },
      { id: 'ind-pancreatic', name: 'Pancreatic Cancer', prevalenceRankUSA: 9 },
      { id: 'ind-leukemia', name: 'Acute Myeloid Leukemia (AML)', prevalenceRankUSA: 10 }
    ];

    for (const ind of indications) {
      await session.run(
        'CREATE (:Indication {id: $id, name: $name, prevalenceRankUSA: $rank})',
        { id: ind.id, name: ind.name, rank: ind.prevalenceRankUSA }
      );
    }

    console.log('Creating genes and mutations...');
    const mutations = [
      { id: 'mut-brca1', name: 'BRCA1 p.C61G', alias: 'BRCA1', gene: 'BRCA1', indication: 'ind-breast' },
      { id: 'mut-brca2', name: 'BRCA2 p.S1982Rfs', alias: 'BRCA2', gene: 'BRCA2', indication: 'ind-breast' },
      { id: 'mut-her2', name: 'ERBB2 amplification', alias: 'HER2+', gene: 'ERBB2', indication: 'ind-breast' },
      { id: 'mut-egfr-l858r', name: 'EGFR p.L858R', alias: 'EGFR L858R', gene: 'EGFR', indication: 'ind-lung' },
      { id: 'mut-egfr-t790m', name: 'EGFR p.T790M', alias: 'EGFR T790M', gene: 'EGFR', indication: 'ind-lung' },
      { id: 'mut-alk', name: 'ALK fusion', alias: 'ALK+', gene: 'ALK', indication: 'ind-lung' },
      { id: 'mut-kras-g12c', name: 'KRAS p.G12C', alias: 'KRAS G12C', gene: 'KRAS', indication: 'ind-lung' },
      { id: 'mut-braf-v600e', name: 'BRAF p.V600E', alias: 'BRAF V600E', gene: 'BRAF', indication: 'ind-melanoma' },
      { id: 'mut-kras-crc', name: 'KRAS p.G12D', alias: 'KRAS G12D', gene: 'KRAS', indication: 'ind-colorectal' },
      { id: 'mut-pik3ca', name: 'PIK3CA p.H1047R', alias: 'PIK3CA H1047R', gene: 'PIK3CA', indication: 'ind-breast' },
      { id: 'mut-flt3', name: 'FLT3-ITD', alias: 'FLT3-ITD', gene: 'FLT3', indication: 'ind-leukemia' },
      { id: 'mut-idh1', name: 'IDH1 p.R132H', alias: 'IDH1 R132H', gene: 'IDH1', indication: 'ind-leukemia' }
    ];

    for (const mut of mutations) {
      await session.run(`
        MERGE (g:Gene {name: $gene})
        CREATE (m:Mutation {id: $id, name: $name, alias: $alias})
        CREATE (m)-[:IN_GENE]->(g)
        WITH m
        MATCH (i:Indication {id: $indication})
        CREATE (m)-[:ASSOCIATED_WITH]->(i)
      `, { id: mut.id, name: mut.name, alias: mut.alias, gene: mut.gene, indication: mut.indication });
    }

    console.log('Creating epidemiology metrics...');
    const epiData = [
      { indication: 'ind-breast', region: 'USA', prevalence: 3800000, incidence: 297000, medianSurvival: 10.2 },
      { indication: 'ind-breast', region: 'EU', prevalence: 3500000, incidence: 355000, medianSurvival: 9.8 },
      { indication: 'ind-breast', region: 'APAC', prevalence: 2100000, incidence: 450000, medianSurvival: 8.5 },
      { indication: 'ind-prostate', region: 'USA', prevalence: 3300000, incidence: 268000, medianSurvival: 15.0 },
      { indication: 'ind-prostate', region: 'EU', prevalence: 2800000, incidence: 450000, medianSurvival: 14.5 },
      { indication: 'ind-lung', region: 'USA', prevalence: 650000, incidence: 235000, medianSurvival: 2.1 },
      { indication: 'ind-lung', region: 'EU', prevalence: 550000, incidence: 310000, medianSurvival: 1.9 },
      { indication: 'ind-lung', region: 'APAC', prevalence: 1200000, incidence: 1100000, medianSurvival: 1.7 },
      { indication: 'ind-colorectal', region: 'USA', prevalence: 1500000, incidence: 153000, medianSurvival: 6.5 },
      { indication: 'ind-colorectal', region: 'EU', prevalence: 1300000, incidence: 340000, medianSurvival: 6.2 },
      { indication: 'ind-melanoma', region: 'USA', prevalence: 1300000, incidence: 100000, medianSurvival: 8.0 },
      { indication: 'ind-bladder', region: 'USA', prevalence: 700000, incidence: 83000, medianSurvival: 5.5 },
      { indication: 'ind-kidney', region: 'USA', prevalence: 500000, incidence: 79000, medianSurvival: 5.0 },
      { indication: 'ind-thyroid', region: 'USA', prevalence: 850000, incidence: 44000, medianSurvival: 20.0 },
      { indication: 'ind-pancreatic', region: 'USA', prevalence: 95000, incidence: 64000, medianSurvival: 0.9 },
      { indication: 'ind-leukemia', region: 'USA', prevalence: 60000, incidence: 20000, medianSurvival: 2.5 }
    ];

    for (const epi of epiData) {
      await session.run(`
        MATCH (i:Indication {id: $indication})
        MATCH (r:Region {name: $region})
        CREATE (ep:EpidemiologyMetric {type: 'PREVALENCE', value: $prevalence})
        CREATE (ei:EpidemiologyMetric {type: 'INCIDENCE', value: $incidence})
        CREATE (es:EpidemiologyMetric {type: 'MEDIAN_SURVIVAL_YEARS', value: $medianSurvival})
        CREATE (i)-[:MEASURED_BY]->(ep)-[:FOR_REGION]->(r)
        CREATE (i)-[:MEASURED_BY]->(ei)-[:FOR_REGION]->(r)
        CREATE (i)-[:MEASURED_BY]->(es)-[:FOR_REGION]->(r)
      `, epi);
    }

    console.log('Creating therapies...');
    const therapies = [
      { id: 'th-trastuzumab', name: 'Trastuzumab (Herceptin)', mechanism: 'HER2 inhibitor', status: 'APPROVED', costUSA: 70000, indication: 'ind-breast' },
      { id: 'th-palbociclib', name: 'Palbociclib (Ibrance)', mechanism: 'CDK4/6 inhibitor', status: 'APPROVED', costUSA: 165000, indication: 'ind-breast' },
      { id: 'th-olaparib', name: 'Olaparib (Lynparza)', mechanism: 'PARP inhibitor', status: 'APPROVED', costUSA: 150000, indication: 'ind-breast' },
      { id: 'th-osimertinib', name: 'Osimertinib (Tagrisso)', mechanism: 'EGFR TKI', status: 'APPROVED', costUSA: 180000, indication: 'ind-lung' },
      { id: 'th-sotorasib', name: 'Sotorasib (Lumakras)', mechanism: 'KRAS G12C inhibitor', status: 'APPROVED', costUSA: 178000, indication: 'ind-lung' },
      { id: 'th-alectinib', name: 'Alectinib (Alecensa)', mechanism: 'ALK inhibitor', status: 'APPROVED', costUSA: 170000, indication: 'ind-lung' },
      { id: 'th-pembrolizumab', name: 'Pembrolizumab (Keytruda)', mechanism: 'PD-1 inhibitor', status: 'APPROVED', costUSA: 200000, indication: 'ind-melanoma' },
      { id: 'th-vemurafenib', name: 'Vemurafenib (Zelboraf)', mechanism: 'BRAF inhibitor', status: 'APPROVED', costUSA: 130000, indication: 'ind-melanoma' },
      { id: 'th-encorafenib', name: 'Encorafenib + Cetuximab', mechanism: 'BRAF + EGFR inhibitor', status: 'APPROVED', costUSA: 145000, indication: 'ind-colorectal' },
      { id: 'th-midostaurin', name: 'Midostaurin (Rydapt)', mechanism: 'FLT3 inhibitor', status: 'APPROVED', costUSA: 250000, indication: 'ind-leukemia' },
      { id: 'th-ivosidenib', name: 'Ivosidenib (Tibsovo)', mechanism: 'IDH1 inhibitor', status: 'APPROVED', costUSA: 260000, indication: 'ind-leukemia' }
    ];

    for (const th of therapies) {
      await session.run(`
        MATCH (i:Indication {id: $indication})
        CREATE (t:Therapy {id: $id, name: $name, mechanism: $mechanism, status: $status, annualCostUSA: $costUSA})
        CREATE (i)-[:HAS_THERAPY]->(t)
      `, th);
    }

    console.log('Creating diagnostic modalities...');
    const diagnostics = [
      { id: 'dx-guardant', name: 'Guardant360', type: 'Liquid Biopsy', invasiveness: 'Non-invasive', indication: 'ind-lung' },
      { id: 'dx-foundone', name: 'FoundationOne Liquid CDx', type: 'Liquid Biopsy', invasiveness: 'Non-invasive', indication: 'ind-lung' },
      { id: 'dx-oncotype', name: 'Oncotype DX', type: 'Gene Expression Panel', invasiveness: 'Minimally invasive', indication: 'ind-breast' },
      { id: 'dx-mammaprint', name: 'MammaPrint', type: 'Gene Expression Panel', invasiveness: 'Minimally invasive', indication: 'ind-breast' },
      { id: 'dx-ngs-tissue', name: 'NGS Tissue Panel', type: 'Tissue Biopsy + NGS', invasiveness: 'Invasive', indication: 'ind-colorectal' },
      { id: 'dx-pet-ct', name: 'PET-CT Scan', type: 'Imaging', invasiveness: 'Non-invasive', indication: 'ind-melanoma' },
      { id: 'dx-bone-marrow', name: 'Bone Marrow Biopsy + NGS', type: 'Tissue Biopsy + NGS', invasiveness: 'Invasive', indication: 'ind-leukemia' }
    ];

    for (const dx of diagnostics) {
      await session.run(`
        MATCH (i:Indication {id: $indication})
        CREATE (d:DiagnosticModality {id: $id, name: $name, type: $type, invasiveness: $invasiveness})
        CREATE (i)-[:HAS_DIAGNOSTIC]->(d)
      `, dx);
    }

    console.log('Creating actionability data...');
    const actionability = [
      { mutation: 'mut-egfr-l858r', level: 'Level 1', evidence: 'FDA-approved therapy exists' },
      { mutation: 'mut-alk', level: 'Level 1', evidence: 'FDA-approved therapy exists' },
      { mutation: 'mut-braf-v600e', level: 'Level 1', evidence: 'FDA-approved therapy exists' },
      { mutation: 'mut-her2', level: 'Level 1', evidence: 'FDA-approved therapy exists' },
      { mutation: 'mut-kras-g12c', level: 'Level 1', evidence: 'FDA-approved therapy exists' },
      { mutation: 'mut-brca1', level: 'Level 1', evidence: 'FDA-approved PARP inhibitor' },
      { mutation: 'mut-brca2', level: 'Level 1', evidence: 'FDA-approved PARP inhibitor' },
      { mutation: 'mut-flt3', level: 'Level 1', evidence: 'FDA-approved FLT3 inhibitor' },
      { mutation: 'mut-idh1', level: 'Level 1', evidence: 'FDA-approved IDH1 inhibitor' },
      { mutation: 'mut-pik3ca', level: 'Level 2', evidence: 'Emerging evidence, clinical trials' }
    ];

    for (const act of actionability) {
      await session.run(`
        MATCH (m:Mutation {id: $mutation})
        CREATE (a:Actionability {level: $level, evidence: $evidence})
        CREATE (m)-[:HAS_ACTIONABILITY]->(a)
      `, act);
    }

    console.log('Neo4j seed completed successfully!');
  } catch (error) {
    console.error('Seed error:', error);
    throw error;
  } finally {
    await session.close();
    await driver.close();
  }
}

seed().catch(console.error);
