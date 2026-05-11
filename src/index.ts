const EXPECTED_PRIMARY_MENU_IDS = ["home", "schedule", "history", "settings"];
const MAX_EDIT_STEPS = 3;
const MIN_TOUCH_TARGET_PX = 56;
const MIN_BODY_FONT_SIZE_PX = 18;
const MIN_HEADING_FONT_SIZE_PX = 28;
const DEFAULT_FONT_STACK = "'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif";

const PRIMARY_MENUS = Object.freeze([
  Object.freeze({ id: "home", label: "홈", icon: "house" }),
  Object.freeze({ id: "schedule", label: "시간표", icon: "calendar" }),
  Object.freeze({ id: "history", label: "기록", icon: "star" }),
  Object.freeze({ id: "settings", label: "설정", icon: "gear" }),
]);

const SUBJECT_COLOR_CHIPS = Object.freeze([
  Object.freeze({ subject: "수학", color: "#FF8A3D", textColor: "#1F1300" }),
  Object.freeze({ subject: "국어", color: "#5BC0BE", textColor: "#062B2A" }),
  Object.freeze({ subject: "영어", color: "#7A9EFA", textColor: "#0F1A48" }),
  Object.freeze({ subject: "과학", color: "#A0D468", textColor: "#173100" }),
]);

const QUICK_EDIT_FLOW = Object.freeze([
  Object.freeze({
    id: "subject",
    title: "과목과 색 고르기",
    fields: Object.freeze(["subjectName", "subjectColor"]),
  }),
  Object.freeze({
    id: "time",
    title: "시간 정하기",
    fields: Object.freeze(["startTime", "endTime"]),
  }),
  Object.freeze({
    id: "timer",
    title: "집중과 쉬는 시간 정하기",
    fields: Object.freeze(["focusDurationMin", "breakDurationMin"]),
  }),
]);

const MOBILE_UI_RULES = Object.freeze({
  minimumTouchTargetPx: MIN_TOUCH_TARGET_PX,
  minimumBodyFontSizePx: MIN_BODY_FONT_SIZE_PX,
  minimumHeadingFontSizePx: MIN_HEADING_FONT_SIZE_PX,
  fontFamily: DEFAULT_FONT_STACK,
  maximumEditSteps: MAX_EDIT_STEPS,
});

const HOME_SCREEN_PREVIEW = Object.freeze({
  heading: "오늘 공부",
  currentTask: Object.freeze({
    subject: "수학",
    timeRange: "15:00 - 15:25",
    remainingMinutes: 12,
    chipColor: "#FF8A3D",
  }),
  nextTask: Object.freeze({
    subject: "영어",
    startsInMinutes: 30,
    chipColor: "#7A9EFA",
  }),
  ctaButtons: Object.freeze([
    Object.freeze({ id: "resume", label: "이어서 공부하기", minHeightPx: 64 }),
    Object.freeze({ id: "free-timer", label: "자유 타이머 시작", minHeightPx: 64 }),
  ]),
});

function validatePrimaryMenus(menus = PRIMARY_MENUS) {
  if (menus.length !== EXPECTED_PRIMARY_MENU_IDS.length) {
    throw new Error(
      `Primary navigation must expose exactly ${EXPECTED_PRIMARY_MENU_IDS.length} menus.`,
    );
  }

  const actualIds = menus.map((menu) => menu.id);

  for (const expectedId of EXPECTED_PRIMARY_MENU_IDS) {
    if (!actualIds.includes(expectedId)) {
      throw new Error(`Primary navigation is missing required menu "${expectedId}".`);
    }
  }

  for (const actualId of actualIds) {
    if (!EXPECTED_PRIMARY_MENU_IDS.includes(actualId)) {
      throw new Error(`Primary navigation includes unsupported menu "${actualId}".`);
    }
  }
}

function validateLargeTouchTargets(buttons) {
  for (const button of buttons) {
    if (button.minHeightPx < MIN_TOUCH_TARGET_PX) {
      throw new Error(
        `Touch target "${button.id}" must be at least ${MIN_TOUCH_TARGET_PX}px high.`,
      );
    }
  }
}

function validateReadableTypeScale(rules = MOBILE_UI_RULES) {
  if (rules.minimumBodyFontSizePx < MIN_BODY_FONT_SIZE_PX) {
    throw new Error(`Body copy must stay at or above ${MIN_BODY_FONT_SIZE_PX}px.`);
  }

  if (rules.minimumHeadingFontSizePx < MIN_HEADING_FONT_SIZE_PX) {
    throw new Error(`Headings must stay at or above ${MIN_HEADING_FONT_SIZE_PX}px.`);
  }
}

function validateSubjectColorChips(chips = SUBJECT_COLOR_CHIPS) {
  if (chips.length < 4) {
    throw new Error("At least four subject color chips are required for quick recognition.");
  }

  const seenSubjects = new Set();
  for (const chip of chips) {
    if (seenSubjects.has(chip.subject)) {
      throw new Error(`Subject color chip "${chip.subject}" must be unique.`);
    }

    if (!/^#[0-9A-Fa-f]{6}$/.test(chip.color)) {
      throw new Error(`Subject color chip "${chip.subject}" must use a 6-digit hex color.`);
    }

    seenSubjects.add(chip.subject);
  }
}

function validateQuickEditFlow(steps = QUICK_EDIT_FLOW) {
  if (steps.length > MAX_EDIT_STEPS) {
    throw new Error(`Edit flow must stay within ${MAX_EDIT_STEPS} short steps.`);
  }

  for (const step of steps) {
    if (!Array.isArray(step.fields) || step.fields.length === 0) {
      throw new Error(`Edit step "${step.id}" must define at least one field.`);
    }
  }
}

function validateChildFriendlyUiSpec(spec = createChildFriendlyUiSpec()) {
  validatePrimaryMenus(spec.primaryMenus);
  validateLargeTouchTargets(spec.homeScreen.ctaButtons);
  validateReadableTypeScale(spec.rules);
  validateSubjectColorChips(spec.subjectColorChips);
  validateQuickEditFlow(spec.quickEditFlow);
  return spec;
}

function createChildFriendlyUiSpec() {
  return Object.freeze({
    primaryMenus: PRIMARY_MENUS,
    rules: MOBILE_UI_RULES,
    subjectColorChips: SUBJECT_COLOR_CHIPS,
    quickEditFlow: QUICK_EDIT_FLOW,
    homeScreen: HOME_SCREEN_PREVIEW,
  });
}

validateChildFriendlyUiSpec();

module.exports = {
  DEFAULT_FONT_STACK,
  EXPECTED_PRIMARY_MENU_IDS,
  HOME_SCREEN_PREVIEW,
  MAX_EDIT_STEPS,
  MIN_BODY_FONT_SIZE_PX,
  MIN_HEADING_FONT_SIZE_PX,
  MIN_TOUCH_TARGET_PX,
  MOBILE_UI_RULES,
  PRIMARY_MENUS,
  QUICK_EDIT_FLOW,
  SUBJECT_COLOR_CHIPS,
  createChildFriendlyUiSpec,
  validateChildFriendlyUiSpec,
  validateLargeTouchTargets,
  validatePrimaryMenus,
  validateQuickEditFlow,
  validateReadableTypeScale,
  validateSubjectColorChips,
};
