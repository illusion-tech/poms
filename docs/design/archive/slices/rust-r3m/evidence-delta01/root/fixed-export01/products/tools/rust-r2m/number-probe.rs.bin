//! Explicit fresh-M internal service probe. No HTTP route or production change.
use chrono::{DateTime, Utc};
use poms_api_rust::{
    business_numbers::{BusinessNumberScope, BusinessNumberService},
    config::Config,
    database::Database,
};
use serde::Deserialize;
use serde_json::json;
use sqlx::{Connection, Row};
use std::{
    io::{self, Read},
    time::Duration,
};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Input {
    run_id: uuid::Uuid,
    marker: String,
    year: i32,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    if std::env::args_os().count() != 1
        || std::env::var("POMS_ENV_FILE").unwrap_or_default()
            != "/home/wangzishi/.local/share/poms-r2m/private/rust.env"
    {
        return Err("Explicit new M Rust environment required".into());
    }
    let mut raw = Vec::new();
    io::stdin().take(4097).read_to_end(&mut raw)?;
    if raw.is_empty() || raw.len() > 4096 {
        return Err("Bounded stdin required".into());
    }
    let input: Input = serde_json::from_slice(&raw)?;
    if input.marker != "1a6b458a-2e55-4dc9-8b50-0f1947a1a7d5"
        || !(4000..=8998).contains(&input.year)
    {
        return Err("Exact marker and fresh synthetic years required".into());
    }
    let config = Config::load().map_err(|_| "Probe config rejected")?;
    let c = &config.database;
    if !c.connect
        || c.host != "127.0.0.1"
        || c.port != 20432
        || c.database != "poms_r2m_rust"
        || c.username != "poms_r2m_app"
        || c.url.is_some()
    {
        return Err("Probe DB rejected before I/O".into());
    }
    let db = Database::new(c).await?;
    let outcome=async {
        let mut independent=db.pool().acquire().await?;
        let actual=sqlx::query("select current_database() as db,current_user::text as usr,current_setting('server_version_num') as version,current_setting('port') as port,current_setting('poms.r0e_isolated',true) as isolated,has_schema_privilege(current_user,'r2m_control','USAGE') as control_access").fetch_one(&mut *independent).await?;
        if actual.try_get::<String,_>("db")?!="poms_r2m_rust"||actual.try_get::<String,_>("usr")?!="poms_r2m_app"||actual.try_get::<String,_>("version")?!="150012"||actual.try_get::<String,_>("port")?!="15432"||actual.try_get::<String,_>("isolated")?!="on"||actual.try_get::<bool,_>("control_access")? {return Err::<_,Box<dyn std::error::Error>>("New isolated low-privilege connection rejected".into());}
        let scopes=BusinessNumberScope::ALL.iter().map(|s|s.as_str()).collect::<Vec<_>>();let periods=[input.year.to_string(),(input.year+1).to_string()];
        let before:i64=sqlx::query_scalar("select count(*) from poms.business_number_sequence where scope=any($1) and period=any($2)").bind(&scopes).bind(&periods[..]).fetch_one(&mut *independent).await?;
        if before!=0{return Err("Before-present number rows refused".into());}
        let at:DateTime<Utc>=format!("{}-01-01T00:00:00Z",input.year).parse()?;
        let next_year:DateTime<Utc>=format!("{}-01-01T00:00:00Z",input.year+1).parse()?;
        let before_boundary:DateTime<Utc>=format!("{}-01-01T00:30:00+08:00",input.year+1).parse()?;
        let service=BusinessNumberService::new(db.clone());let mut observations=Vec::new();
        for &scope in BusinessNumberScope::ALL {
            let mut tx=independent.begin().await?;
            let borrowed=BusinessNumberService::next_with_connection(&mut tx,scope,at).await?;tx.rollback().await?;
            let absent:i64=sqlx::query_scalar("select count(*) from poms.business_number_sequence where scope=$1 and period=$2").bind(scope.as_str()).bind(&periods[0]).fetch_one(&mut *independent).await?;
            if absent!=0||!borrowed.ends_with("-000001"){return Err("Borrowed rollback differs".into());}
            let first=service.next(scope,Some(at)).await?;
            let futures=(0..8).map(|_|service.next(scope,Some(at)));let concurrent=futures_util::future::join_all(futures).await.into_iter().collect::<Result<Vec<_>,_>>()?;
            let mut suffixes=concurrent.iter().map(|s|s.rsplit('-').next().unwrap_or("").to_owned()).collect::<Vec<_>>();suffixes.sort();
            if !first.ends_with("-000001")||suffixes!=(2..=9).map(|n|format!("{n:06}")).collect::<Vec<_>>(){return Err("Concurrent identity differs".into());}
            let utc_previous=service.next(scope,Some(before_boundary)).await?;let utc_next=service.next(scope,Some(next_year)).await?;
            if !utc_previous.ends_with(&format!("{}-000010",input.year))||!utc_next.ends_with(&format!("{}-000001",input.year+1)){return Err("UTC boundary differs".into());}
            let mut caller=independent.begin().await?;let standalone=service.next(scope,Some(at)).await?;sqlx::query("select 1").execute(&mut *caller).await?;caller.rollback().await?;
            let next_value:i32=sqlx::query_scalar("select next_value from poms.business_number_sequence where scope=$1 and period=$2").bind(scope.as_str()).bind(&periods[0]).fetch_one(&mut *independent).await?;
            if next_value!=12||!standalone.ends_with("-000011"){return Err("Standalone allocation did not independently commit".into());}
            observations.push(json!({"scope":scope.as_str(),"borrowedRollback":borrowed,"afterBorrowedRows":absent,"first":first,"concurrent":concurrent,"utcPrevious":utc_previous,"utcNext":utc_next,"standaloneSurvivesCallerRollback":standalone,"independentNextValue":next_value}));
        }
        independent.close().await?;
        Ok(json!({"operation":"numbers-nine-scopes","backend":"rust","runId":input.run_id,"marker":input.marker,"year":input.year,"scopeCount":9,"complete":true,"utcBoundaryObserved":true,"concurrentUnique":true,"onlyBeforeAbsentScopePeriods":true,"independentEmAndBorrowedConnectionSeparate":true,"observations":observations,"cleanupPerformed":false}))
    }.await;
    db.close(Duration::from_secs(5)).await?;
    match outcome {
        Ok(value) => println!("{}", serde_json::to_string(&value)?),
        Err(_) => return Err("Owned number probe failed; preserve journal and rows".into()),
    }
    Ok(())
}
