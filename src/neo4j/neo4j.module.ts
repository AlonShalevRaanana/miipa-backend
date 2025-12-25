import { Global, Module } from '@nestjs/common';
import neo4j, { Driver } from 'neo4j-driver';

@Global()
@Module({
  providers: [
    {
      provide: 'NEO4J_DRIVER',
      useFactory: (): Driver => {
        const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
        const user = process.env.NEO4J_USER || 'neo4j';
        const password = process.env.NEO4J_PASSWORD || 'password';
        return neo4j.driver(uri, neo4j.auth.basic(user, password));
      }
    }
  ],
  exports: ['NEO4J_DRIVER']
})
export class Neo4jModule {}