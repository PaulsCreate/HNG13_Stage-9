import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixEverything1765399000000 implements MigrationInterface {
    name = 'FixEverything1765399000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        console.log('Fixing ENUMs and schema...');
        
        // 1. FIRST DROP existing ENUMs if they exist
        await queryRunner.query(`
            DROP TYPE IF EXISTS "public"."transactions_type_enum" CASCADE;
            DROP TYPE IF EXISTS "public"."transactions_status_enum" CASCADE;
        `);

        // 2. Create NEW ENUMs with lowercase values
        await queryRunner.query(`
            CREATE TYPE "public"."transactions_type_enum" AS ENUM ('deposit', 'transfer_in', 'transfer_out');
            CREATE TYPE "public"."transactions_status_enum" AS ENUM ('pending', 'success', 'failed');
        `);

        // 3. Drop all tables if they exist
        await queryRunner.query(`DROP TABLE IF EXISTS "api_keys" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "transactions" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "wallets" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE;`);

        // 4. Create users table
        await queryRunner.query(`
            CREATE TABLE "users" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "email" character varying NOT NULL,
                "google_id" character varying NOT NULL,
                "display_name" character varying,
                "profile_picture" character varying,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"),
                CONSTRAINT "UQ_9e90ef6dfa6c53e95dc3b6f6a06" UNIQUE ("google_id"),
                CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
            )
        `);

        // 5. Create wallets table
        await queryRunner.query(`
            CREATE TABLE "wallets" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "wallet_number" character varying NOT NULL,
                "balance" numeric(15,2) NOT NULL DEFAULT '0',
                "user_id" uuid NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_e6f0b5e4ee3d8a2ac9f8d4e4b4e" UNIQUE ("wallet_number"),
                CONSTRAINT "PK_bec464dd8d54c39c54fd32e2334" PRIMARY KEY ("id"),
                CONSTRAINT "FK_wallets_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);

        // 6. Create transactions table
        await queryRunner.query(`
            CREATE TABLE "transactions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "wallet_id" uuid NOT NULL,
                "type" "public"."transactions_type_enum" NOT NULL,
                "amount" numeric(15,2) NOT NULL,
                "status" "public"."transactions_status_enum" NOT NULL DEFAULT 'pending',
                "reference" character varying,
                "recipient_wallet_number" character varying,
                "sender_wallet_number" character varying,
                "metadata" text,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_dd85cc865e0c3d5d4be095d3f3f" UNIQUE ("reference"),
                CONSTRAINT "PK_a219afd8dd77ed80f5a862f1db9" PRIMARY KEY ("id"),
                CONSTRAINT "FK_transactions_wallet_id" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE
            )
        `);

        // 7. Create api_keys table
        await queryRunner.query(`
            CREATE TABLE "api_keys" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "key_hash" character varying NOT NULL,
                "key_prefix" character varying NOT NULL,
                "permissions" text NOT NULL,
                "is_revoked" boolean NOT NULL DEFAULT false,
                "expires_at" TIMESTAMP NOT NULL,
                "user_id" uuid NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_4d0f7b8c6e3e3e3e3e3e3e3e3e4" UNIQUE ("key_hash"),
                CONSTRAINT "PK_5c8a79801b44bd27b4c1c7c8a79" PRIMARY KEY ("id"),
                CONSTRAINT "FK_api_keys_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);
        
        console.log('✅ Schema created successfully!');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Just drop everything
        await queryRunner.query(`DROP TABLE IF EXISTS "api_keys" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "transactions" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "wallets" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE;`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."transactions_status_enum" CASCADE;`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."transactions_type_enum" CASCADE;`);
    }
}
