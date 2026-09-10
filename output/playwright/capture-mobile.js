async (page) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1800);

  const onboarding = page.getByRole("dialog");
  if (await onboarding.isVisible().catch(() => false)) {
    await page.screenshot({ path: "output/playwright/zen-onboarding-mobile.png", scale: "device" });
    await page.getByRole("button", { name: "Passer l’introduction" }).click();
  }

  await page.waitForTimeout(500);
  await page.screenshot({ path: "output/playwright/zen-home-mobile.png", scale: "device" });

  const pages = [
    ["catalog", "zen-catalog-mobile.png", 2200],
    ["watchlist", "zen-watchlist-mobile.png", 2200],
    ["top", "zen-top-mobile.png", 2200],
    ["recommendations", "zen-discover-mobile.png", 2200],
    ["search?q=Dune", "zen-search-mobile.png", 2200],
    ["settings", "zen-settings-mobile.png", 500],
    ["movies/419430", "zen-movie-detail-mobile.png", 2200],
  ];

  for (const [route, filename, wait] of pages) {
    await page.goto(`http://localhost:3000/${route}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(wait);
    await page.screenshot({ path: `output/playwright/${filename}`, scale: "device" });
  }
}
