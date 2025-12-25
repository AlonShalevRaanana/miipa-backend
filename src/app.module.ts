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
      useFactory: () => ({
        type: 'better-sqlite3',
        database: 'miipa.sqlite',
        entities: [User],
        synchronize: true
      })
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