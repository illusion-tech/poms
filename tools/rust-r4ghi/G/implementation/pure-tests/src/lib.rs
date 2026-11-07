//! Isolated pure arithmetic tests, importing the actual common scalar and G
//! facts source. The small error adapter is test-only; this is not a product
//! compilation, CommonSession, authorization, database or HTTP acceptance.
#![allow(dead_code)]
mod contract_support {
    #[derive(Debug)]
    pub enum Error {
        BadRequest(String), Unprocessable(String), Conflict(String), Internal,
        CodedUnprocessable { code: &'static str, message: String },
    }
}
include!(concat!(env!("OUT_DIR"), "/actual_sources.rs"));

#[cfg(test)] mod acceptance {
    use crate::{project_operating::facts as f,scalars::OperatingMoneyCents as Money};
    use serde_json::json;
    #[test]fn aggregate_overflow_fails_before_any_writer(){
        let max=f::known(Money::parse_exact("9999999999999999.99","max").unwrap(),vec![],"source-basis-value");
        let one=f::known(Money::from_cents(1,"one").unwrap(),vec![],"source-basis-value");
        assert!(f::sum_amounts([&max,&one],"aggregate").is_err());
    }
    #[test]fn mixed_currency_does_not_sum_known_members(){
        let triple=json!({"currency":"CNY","net":f::known(Money::from_cents(100,"net").unwrap(),vec![],"source-basis-value"),"tax":f::known(Money::from_cents(0,"tax").unwrap(),vec![],"source-basis-value"),"gross":f::known(Money::from_cents(100,"gross").unwrap(),vec![],"source-basis-value")});
        let aggregate=f::sum_triples([&triple],None,true).unwrap();
        assert_eq!(aggregate["net"]["knowledge"],"unknown");assert!(aggregate["net"]["value"].is_null());
    }
    #[test]fn empty_known_scope_requires_currency_and_closure(){
        assert_eq!(f::empty_triple(Some("CNY"),true).unwrap()["net"]["zeroProof"],"exhaustive-classified-scope-zero");
        assert!(f::empty_triple(None,true).unwrap()["net"]["value"].is_null());
        assert!(f::empty_triple(Some("CNY"),false).unwrap()["net"]["value"].is_null());
    }
    #[test]fn historical_subcent_is_not_rounded(){assert!(Money::parse_exact("123.001","legacy").is_err());assert_eq!(Money::parse_exact("123.0000","exact").unwrap().decimal_string(),"123.00");}
    #[test]fn zero_denominator_stays_unknown(){let zero=f::known(Money::from_cents(0,"zero").unwrap(),vec![],"source-basis-value");assert_eq!(f::ratio(&zero,&zero).unwrap()["reasonCode"],"zero-denominator");}
}
