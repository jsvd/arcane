import { describe, it, assert } from "../testing/harness.ts";
import {
  createTextInput,
  updateTextInput,
  type TextInputKeyEvent,
} from "./text-input.ts";

function key(k: string): TextInputKeyEvent {
  return { key: k, pressed: true };
}

describe("createTextInput", () => {
  it("creates text input with correct position and size", () => {
    const ti = createTextInput(10, 20, 200);
    assert.equal(ti.x, 10);
    assert.equal(ti.y, 20);
    assert.equal(ti.w, 200);
  });

  it("defaults to empty text", () => {
    const ti = createTextInput(0, 0, 100);
    assert.equal(ti.text, "");
  });

  it("accepts placeholder", () => {
    const ti = createTextInput(0, 0, 100, "Enter name");
    assert.equal(ti.placeholder, "Enter name");
  });

  it("defaults to inactive and non-disabled", () => {
    const ti = createTextInput(0, 0, 100);
    assert.equal(ti.active, false);
    assert.equal(ti.disabled, false);
    assert.equal(ti.changed, false);
    assert.equal(ti.cursorPos, 0);
  });
});

describe("updateTextInput - focus", () => {
  it("activates on click inside", () => {
    const ti = createTextInput(10, 10, 200);
    updateTextInput(ti, 50, 20, true, []);
    assert.equal(ti.active, true);
  });

  it("deactivates on click outside", () => {
    const ti = createTextInput(10, 10, 200);
    ti.active = true;
    updateTextInput(ti, 500, 500, true, []);
    assert.equal(ti.active, false);
  });

  it("hover when mouse over input", () => {
    const ti = createTextInput(10, 10, 200);
    updateTextInput(ti, 50, 20, false, []);
    assert.equal(ti.hovered, true);
  });

  it("no hover when mouse away", () => {
    const ti = createTextInput(10, 10, 200);
    updateTextInput(ti, 500, 500, false, []);
    assert.equal(ti.hovered, false);
  });

  it("disabled input ignores clicks", () => {
    const ti = createTextInput(10, 10, 200);
    ti.disabled = true;
    updateTextInput(ti, 50, 20, true, []);
    assert.equal(ti.active, false);
    assert.equal(ti.hovered, false);
  });

  it("cursor at end of text on first click", () => {
    const ti = createTextInput(10, 10, 200);
    ti.text = "hello";
    ti.cursorPos = 0;
    updateTextInput(ti, 50, 20, true, []);
    assert.equal(ti.cursorPos, 5);
  });
});

describe("updateTextInput - typing", () => {
  it("inserts printable characters", () => {
    const ti = createTextInput(10, 10, 200);
    ti.active = true;
    updateTextInput(ti, 50, 20, false, [key("h"), key("i")]);
    assert.equal(ti.text, "hi");
    assert.equal(ti.cursorPos, 2);
    assert.equal(ti.changed, true);
  });

  it("ignores keys when not active", () => {
    const ti = createTextInput(10, 10, 200);
    ti.active = false;
    updateTextInput(ti, 50, 20, false, [key("a")]);
    assert.equal(ti.text, "");
  });

  it("backspace deletes character before cursor", () => {
    const ti = createTextInput(10, 10, 200);
    ti.active = true;
    ti.text = "abc";
    ti.cursorPos = 3;
    updateTextInput(ti, 50, 20, false, [key("Backspace")]);
    assert.equal(ti.text, "ab");
    assert.equal(ti.cursorPos, 2);
    assert.equal(ti.changed, true);
  });

  it("backspace at position 0 does nothing", () => {
    const ti = createTextInput(10, 10, 200);
    ti.active = true;
    ti.text = "abc";
    ti.cursorPos = 0;
    updateTextInput(ti, 50, 20, false, [key("Backspace")]);
    assert.equal(ti.text, "abc");
    assert.equal(ti.changed, false);
  });

  it("delete removes character after cursor", () => {
    const ti = createTextInput(10, 10, 200);
    ti.active = true;
    ti.text = "abc";
    ti.cursorPos = 1;
    updateTextInput(ti, 50, 20, false, [key("Delete")]);
    assert.equal(ti.text, "ac");
    assert.equal(ti.cursorPos, 1);
    assert.equal(ti.changed, true);
  });

  it("delete at end does nothing", () => {
    const ti = createTextInput(10, 10, 200);
    ti.active = true;
    ti.text = "abc";
    ti.cursorPos = 3;
    updateTextInput(ti, 50, 20, false, [key("Delete")]);
    assert.equal(ti.text, "abc");
    assert.equal(ti.changed, false);
  });

  it("inserts character at cursor position", () => {
    const ti = createTextInput(10, 10, 200);
    ti.active = true;
    ti.text = "ac";
    ti.cursorPos = 1;
    updateTextInput(ti, 50, 20, false, [key("b")]);
    assert.equal(ti.text, "abc");
    assert.equal(ti.cursorPos, 2);
  });

  it("respects maxLength", () => {
    const ti = createTextInput(10, 10, 200);
    ti.active = true;
    ti.maxLength = 3;
    ti.text = "abc";
    ti.cursorPos = 3;
    updateTextInput(ti, 50, 20, false, [key("d")]);
    assert.equal(ti.text, "abc");
    assert.equal(ti.cursorPos, 3);
  });

  it("space character is printable", () => {
    const ti = createTextInput(10, 10, 200);
    ti.active = true;
    updateTextInput(ti, 50, 20, false, [key(" ")]);
    assert.equal(ti.text, " ");
    assert.equal(ti.changed, true);
  });

  it("ignores non-pressed key events", () => {
    const ti = createTextInput(10, 10, 200);
    ti.active = true;
    updateTextInput(ti, 50, 20, false, [{ key: "a", pressed: false }]);
    assert.equal(ti.text, "");
  });
});

describe("updateTextInput - cursor movement", () => {
  it("ArrowLeft moves cursor left", () => {
    const ti = createTextInput(10, 10, 200);
    ti.active = true;
    ti.text = "abc";
    ti.cursorPos = 2;
    updateTextInput(ti, 50, 20, false, [key("ArrowLeft")]);
    assert.equal(ti.cursorPos, 1);
  });

  it("ArrowRight moves cursor right", () => {
    const ti = createTextInput(10, 10, 200);
    ti.active = true;
    ti.text = "abc";
    ti.cursorPos = 1;
    updateTextInput(ti, 50, 20, false, [key("ArrowRight")]);
    assert.equal(ti.cursorPos, 2);
  });

  it("ArrowLeft at 0 stays at 0", () => {
    const ti = createTextInput(10, 10, 200);
    ti.active = true;
    ti.text = "abc";
    ti.cursorPos = 0;
    updateTextInput(ti, 50, 20, false, [key("ArrowLeft")]);
    assert.equal(ti.cursorPos, 0);
  });

  it("ArrowRight at end stays at end", () => {
    const ti = createTextInput(10, 10, 200);
    ti.active = true;
    ti.text = "abc";
    ti.cursorPos = 3;
    updateTextInput(ti, 50, 20, false, [key("ArrowRight")]);
    assert.equal(ti.cursorPos, 3);
  });

  it("Home moves cursor to start", () => {
    const ti = createTextInput(10, 10, 200);
    ti.active = true;
    ti.text = "abc";
    ti.cursorPos = 2;
    updateTextInput(ti, 50, 20, false, [key("Home")]);
    assert.equal(ti.cursorPos, 0);
  });

  it("End moves cursor to end", () => {
    const ti = createTextInput(10, 10, 200);
    ti.active = true;
    ti.text = "abc";
    ti.cursorPos = 0;
    updateTextInput(ti, 50, 20, false, [key("End")]);
    assert.equal(ti.cursorPos, 3);
  });
});

describe("updateTextInput - changed flag", () => {
  it("changed is true when text modified", () => {
    const ti = createTextInput(10, 10, 200);
    ti.active = true;
    updateTextInput(ti, 50, 20, false, [key("a")]);
    assert.equal(ti.changed, true);
  });

  it("changed resets to false on next frame with no modification", () => {
    const ti = createTextInput(10, 10, 200);
    ti.active = true;
    updateTextInput(ti, 50, 20, false, [key("a")]);
    assert.equal(ti.changed, true);
    updateTextInput(ti, 50, 20, false, []);
    assert.equal(ti.changed, false);
  });

  it("changed is false for cursor movement only", () => {
    const ti = createTextInput(10, 10, 200);
    ti.active = true;
    ti.text = "abc";
    ti.cursorPos = 1;
    updateTextInput(ti, 50, 20, false, [key("ArrowLeft")]);
    assert.equal(ti.changed, false);
  });
});
