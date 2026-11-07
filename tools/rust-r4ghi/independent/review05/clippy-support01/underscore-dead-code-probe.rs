#![deny(dead_code)]
struct Retained { _proof: () }
fn _retained_authorization_helper() {}
fn main() { let _value = Retained { _proof: () }; }
