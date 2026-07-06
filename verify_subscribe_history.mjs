// 验证台账速读订阅抽屉 - 订阅设置 / 历史报告 Tab
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const ARTEFACT_DIR = 'verify_subscribe_history_artefacts';
const URL_BASE = 'http://localhost:3001';

const fail = (msg) => { console.error('❌ FAIL:', msg); process.exit(1); };
const ok = (msg) => console.log('✅', msg);
const info = (msg) => console.log('  ·', msg);

const setup = async () => {
  fs.mkdirSync(ARTEFACT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') console.error('CONSOLE ERROR:', m.text());
  });
  return { browser, page };
};

const screenshot = async (page, name) => {
  await page.screenshot({ path: path.join(ARTEFACT_DIR, name), fullPage: false });
  info(`screenshot → ${ARTEFACT_DIR}/${name}`);
};

const step = async (label, fn) => {
  console.log(`\n--- ${label} ---`);
  await fn();
};

const run = async () => {
  const { browser, page } = await setup();

  try {
    // ============== 1. 总览页：打开抽屉，验证 Tab 与历史报告 ==============
    await step('总览页：访问 /app/ledger → 打开订阅抽屉', async () => {
      await page.goto(`${URL_BASE}/app/ledger`, { waitUntil: 'networkidle' });
      await page.waitForSelector('button:has-text("订阅速读")', { timeout: 15000 });
      await screenshot(page, '01_overview_before_drawer.png');

      await page.click('button:has-text("订阅速读")');
      await page.waitForSelector('.ant-drawer-open', { timeout: 5000 });
      await page.waitForSelector('.ant-drawer-title:has-text("全院台账速读订阅")', { timeout: 5000 });
      ok('总览页订阅抽屉打开成功');

      // 两个 Tab 都应该存在
      const tabs = await page.locator('.ant-drawer .ant-tabs-tab').allTextContents();
      info(`Tab 列表: ${JSON.stringify(tabs)}`);
      if (tabs.length !== 2) fail(`期望 2 个 Tab,实际 ${tabs.length}`);
      if (!tabs.some((t) => t.includes('订阅设置'))) fail('缺少「订阅设置」Tab');
      if (!tabs.some((t) => t.includes('历史报告'))) fail('缺少「历史报告」Tab');
      ok('两 Tab 渲染正确（订阅设置 + 历史报告）');
      await screenshot(page, '02_overview_drawer_settings.png');
    });

    await step('总览页：切换到「历史报告」Tab', async () => {
      await page.click('.ant-drawer .ant-tabs-tab:has-text("历史报告")');
      await page.waitForTimeout(400);
      // 历史报告容器应可见
      const historyBox = page.locator('[data-testid="subscription-history"]');
      if (!(await historyBox.isVisible())) fail('历史报告容器未渲染');
      // 顶部摘要
      const summary = await historyBox.locator('text=/共 \\d+ 条历史报告/').textContent();
      info(`摘要: ${summary}`);
      if (!summary.includes('条历史报告')) fail('历史报告摘要异常');

      // 列表项数量
      const items = await historyBox.locator('.ant-list-item').count();
      info(`历史报告条数: ${items}`);
      if (items < 5) fail(`历史报告至少应展示 5 条,实际 ${items}`);

      // 验证标题文本「全院台账速读」
      const firstTitle = await historyBox.locator('.ant-list-item strong').first().textContent();
      info(`首条报告标题: ${firstTitle}`);
      if (!firstTitle.includes('全院台账速读')) fail(`首条报告标题异常: ${firstTitle}`);

      // 验证存在「每日」「每周」Tag
      const hasDaily = await historyBox.locator('.ant-tag:has-text("每日")').count();
      const hasWeekly = await historyBox.locator('.ant-tag:has-text("每周")').count();
      info(`每日/每周 Tag 数: ${hasDaily}/${hasWeekly}`);
      if (hasDaily < 1) fail('缺少「每日」Tag');
      if (hasWeekly < 1) fail('缺少「每周」Tag');

      // 验证存在「推送失败」状态（demo 含 1 条失败）
      const failedTag = await historyBox.locator('.ant-tag:has-text("推送失败")').count();
      info(`推送失败条数: ${failedTag}`);
      if (failedTag < 1) fail('缺少「推送失败」演示条');

      // 验证存在「查看」按钮
      const viewBtns = await historyBox.locator('button:has-text("查看")').count();
      info(`查看按钮数: ${viewBtns}`);
      if (viewBtns < 5) fail('查看按钮数量异常');

      ok('历史报告列表渲染正常');
      await screenshot(page, '03_overview_drawer_history.png');
    });

    await step('总览页：切回订阅设置 Tab 仍正常', async () => {
      await page.click('.ant-drawer .ant-tabs-tab:has-text("订阅设置")');
      await page.waitForTimeout(300);
      const dailyBtn = page.locator('.ant-drawer label:has-text("每日速读")');
      if (!(await dailyBtn.isVisible())) fail('订阅设置 Tab 切换后内容丢失');
      const openBtn = page.locator('.ant-drawer button:has-text("立即开启订阅")');
      if (!(await openBtn.isVisible())) fail('订阅设置主按钮丢失');
      ok('订阅设置 Tab 切回正常');
    });

    // 关闭抽屉
    await page.click('.ant-drawer-close');
    await page.waitForTimeout(300);

    // ============== 2. 列表页：打开抽屉，同样验证两 Tab ==============
    await step('列表页：访问 /app/ledger/list → 打开订阅抽屉', async () => {
      await page.goto(`${URL_BASE}/app/ledger/list`, { waitUntil: 'networkidle' });
      await page.waitForSelector('button:has-text("订阅速读")', { timeout: 15000 });
      await page.click('button:has-text("订阅速读")');
      await page.waitForSelector('.ant-drawer-open', { timeout: 5000 });
      await page.waitForSelector('.ant-drawer-title:has-text("全院台账速读订阅")', { timeout: 5000 });
      ok('列表页订阅抽屉打开成功');
      await screenshot(page, '04_list_drawer_settings.png');
    });

    await step('列表页：切换历史报告 Tab', async () => {
      await page.click('.ant-drawer .ant-tabs-tab:has-text("历史报告")');
      await page.waitForTimeout(400);
      const items = await page.locator('[data-testid="subscription-history"] .ant-list-item').count();
      info(`列表页历史报告条数: ${items}`);
      if (items < 5) fail(`列表页历史报告数量异常: ${items}`);
      ok('列表页历史报告 Tab 渲染正常');
      await screenshot(page, '05_list_drawer_history.png');
    });

    // 关闭抽屉
    await page.click('.ant-drawer-close');
    await page.waitForTimeout(300);

    console.log('\n🎉 全部验证通过');
  } finally {
    await browser.close();
  }
};

run().catch((e) => fail(e.stack || e.message));