use arcane_core::scripting::ArcaneRuntime;

#[test]
fn eval_to_string_basic() {
    let mut rt = ArcaneRuntime::new();
    let result = rt.eval_to_string("1 + 2").unwrap();
    assert_eq!(result, "3");
}

#[test]
fn eval_to_string_returns_string_value() {
    let mut rt = ArcaneRuntime::new();
    let result = rt.eval_to_string("'hello' + ' ' + 'world'").unwrap();
    assert_eq!(result, "hello world");
}

#[test]
fn eval_to_string_returns_undefined_for_missing_global() {
    let mut rt = ArcaneRuntime::new();
    let result = rt
        .eval_to_string("globalThis.__arcaneAgent?.describe() ?? 'No agent registered.'")
        .unwrap();
    assert_eq!(result, "No agent registered.");
}

#[test]
fn eval_to_string_error_on_syntax_error() {
    let mut rt = ArcaneRuntime::new();
    let result = rt.eval_to_string("function {{{");
    assert!(result.is_err());
}

#[test]
fn eval_to_string_json_stringify() {
    let mut rt = ArcaneRuntime::new();
    let result = rt
        .eval_to_string("JSON.stringify({a: 1, b: 'two'}, null, 2)")
        .unwrap();
    assert!(result.contains("\"a\": 1"));
    assert!(result.contains("\"b\": \"two\""));
}
