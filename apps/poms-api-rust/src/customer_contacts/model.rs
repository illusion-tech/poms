use crate::{auth::js_json::JsString, compat::json::Field};

#[derive(Clone, Debug)]
pub struct Query {
    pub customer_id: String,
}

#[derive(Clone, Debug)]
pub struct Create {
    pub customer_id: String,
    pub name: JsString,
    pub gender: Option<String>,
    pub department: Field<JsString>,
    pub title: Field<JsString>,
    pub work_phone: Field<JsString>,
    pub mobile: Field<JsString>,
    pub wechat: Field<JsString>,
    pub email: Field<JsString>,
    pub remark: Field<JsString>,
}

#[derive(Clone, Debug)]
pub struct Update {
    pub name: Option<JsString>,
    pub gender: Option<String>,
    pub department: Field<JsString>,
    pub title: Field<JsString>,
    pub work_phone: Field<JsString>,
    pub mobile: Field<JsString>,
    pub wechat: Field<JsString>,
    pub email: Field<JsString>,
    pub remark: Field<JsString>,
    pub status: Option<String>,
}
