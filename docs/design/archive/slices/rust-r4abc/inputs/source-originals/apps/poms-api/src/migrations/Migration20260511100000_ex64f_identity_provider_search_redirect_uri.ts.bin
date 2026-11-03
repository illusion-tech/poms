import { Migration } from '@mikro-orm/migrations';

export class Migration20260511100000_ex64f_identity_provider_search_redirect_uri extends Migration {
    override async up(): Promise<void> {
        this.addSql(`alter table "poms"."identity_provider_config" add column "search_redirect_uri" varchar(512) null;`);
        this.addSql(`comment on column "poms"."identity_provider_config"."redirect_uri" is '外部登录 OAuth redirect URI';`);
        this.addSql(`comment on column "poms"."identity_provider_config"."search_redirect_uri" is '管理员搜索授权 OAuth redirect URI';`);
    }

    override async down(): Promise<void> {
        this.addSql(`alter table "poms"."identity_provider_config" drop column if exists "search_redirect_uri";`);
        this.addSql(`comment on column "poms"."identity_provider_config"."redirect_uri" is null;`);
    }
}
