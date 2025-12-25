import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Neo4jModule } from './neo4j/neo4j.module';
import { MiipaModule } from './miipa/miipa.module';
import { SearchModule } from './search/search.module';
import { MetaModule } from './meta/meta.module';
import { IndicationsModule } from './indications/indications.module';
import { MutationsModule } from './mutations/mutations.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { User } from './users/user.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        // Use PostgreSQL - required for Railway deployment
        return {
          type: 'postgres',
          url: process.env.DATABASE_URL || 'postgresql://localhost:5432/miipa',
          entities: [User],
          synchronize: true,
          ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
        };
      }
    }),
    Neo4jModule,
    UsersModule,
    AuthModule,
    IndicationsModule,
    MutationsModule,
    MiipaModule,
    SearchModule,
    MetaModule
  ]
})
export class AppModule {}