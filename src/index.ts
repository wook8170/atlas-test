const EXPECTED_PRIMARY_MENU_IDS = ["home", "schedule", "history", "settings"];

const PRIMARY_MENUS = Object.freeze([
  Object.freeze({ id: "home", label: "홈" }),
  Object.freeze({ id: "schedule", label: "시간표" }),
  Object.freeze({ id: "history", label: "기록" }),
  Object.freeze({ id: "settings", label: "설정" }),
]);

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

validatePrimaryMenus();

module.exports = {
  EXPECTED_PRIMARY_MENU_IDS,
  PRIMARY_MENUS,
  validatePrimaryMenus,
};
