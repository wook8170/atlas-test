const test = require("node:test");
const assert = require("node:assert/strict");

const {
  EXPECTED_PRIMARY_MENU_IDS,
  PRIMARY_MENUS,
  validatePrimaryMenus,
} = require("./index.ts");

test("primary menus stay limited to the four child-facing top-level destinations", () => {
  assert.deepEqual(
    PRIMARY_MENUS.map((menu) => menu.id),
    EXPECTED_PRIMARY_MENU_IDS,
  );
});

test("validation rejects any extra top-level menu", () => {
  assert.throws(() => {
    validatePrimaryMenus([
      ...PRIMARY_MENUS,
      { id: "rewards", label: "보상" },
    ]);
  }, /exactly 4 menus/);
});

test("validation rejects any missing required top-level menu", () => {
  assert.throws(() => {
    validatePrimaryMenus(PRIMARY_MENUS.slice(0, 3));
  }, /exactly 4 menus/);
});
