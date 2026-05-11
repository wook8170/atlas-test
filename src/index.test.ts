const test = require("node:test");
const assert = require("node:assert/strict");

const {
  EXPECTED_PRIMARY_MENU_IDS,
  HOME_SCREEN_PREVIEW,
  MAX_EDIT_STEPS,
  MIN_BODY_FONT_SIZE_PX,
  MIN_HEADING_FONT_SIZE_PX,
  MIN_TOUCH_TARGET_PX,
  PRIMARY_MENUS,
  QUICK_EDIT_FLOW,
  SUBJECT_COLOR_CHIPS,
  createChildFriendlyUiSpec,
  validateChildFriendlyUiSpec,
  validateLargeTouchTargets,
  validateQuickEditFlow,
  validateReadableTypeScale,
} = require("./index.ts");

test("primary menus stay limited to the four child-facing top-level destinations", () => {
  assert.deepEqual(
    PRIMARY_MENUS.map((menu) => menu.id),
    EXPECTED_PRIMARY_MENU_IDS,
  );
});

test("home CTAs keep large touch targets for mobile browsers", () => {
  assert.doesNotThrow(() => {
    validateLargeTouchTargets(HOME_SCREEN_PREVIEW.ctaButtons);
  });

  for (const button of HOME_SCREEN_PREVIEW.ctaButtons) {
    assert.ok(button.minHeightPx >= MIN_TOUCH_TARGET_PX);
  }
});

test("type scale stays large enough for young readers", () => {
  const spec = createChildFriendlyUiSpec();

  assert.doesNotThrow(() => {
    validateReadableTypeScale(spec.rules);
  });

  assert.ok(spec.rules.minimumBodyFontSizePx >= MIN_BODY_FONT_SIZE_PX);
  assert.ok(spec.rules.minimumHeadingFontSizePx >= MIN_HEADING_FONT_SIZE_PX);
});

test("subject chips stay distinct and edit flow stays short", () => {
  assert.ok(SUBJECT_COLOR_CHIPS.length >= 4);
  assert.ok(QUICK_EDIT_FLOW.length <= MAX_EDIT_STEPS);

  assert.doesNotThrow(() => {
    validateQuickEditFlow(QUICK_EDIT_FLOW);
    validateChildFriendlyUiSpec();
  });
});
