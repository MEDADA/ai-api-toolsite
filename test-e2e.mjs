import { chromium } from 'playwright';

const BASE = 'http://localhost:3005';
const results = [];

function log(name, status, detail = '') {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  const line = `${icon} [${status}] ${name}${detail ? ' — ' + detail : ''}`;
  console.log(line);
  results.push({ name, status, detail });
}

async function runTests() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push('PAGE ERROR: ' + err.message));

  try {
    // ── 1. Homepage zh ──────────────────────────────────────────
    console.log('\n=== 1. Homepage ZH ===');
    errors.length = 0;
    await page.goto(`${BASE}/zh`, { waitUntil: 'networkidle', timeout: 15000 });
    const h1Text = await page.locator('h1, h2').first().textContent().catch(() => 'N/A');
    log('ZH Homepage loads', 'PASS', `h1/h2: "${h1Text?.slice(0,50)}"`);
    if (errors.length > 0) log('ZH Homepage console errors', 'FAIL', errors.join('; '));
    else log('ZH Homepage no console errors', 'PASS');

    // ── 2. Homepage EN ──────────────────────────────────────────
    console.log('\n=== 2. Homepage EN ===');
    errors.length = 0;
    await page.goto(`${BASE}/en`, { waitUntil: 'networkidle', timeout: 15000 });
    const h1TextEn = await page.locator('h1, h2').first().textContent().catch(() => 'N/A');
    log('EN Homepage loads', 'PASS', `h1/h2: "${h1TextEn?.slice(0,50)}"`);
    if (errors.length > 0) log('EN Homepage console errors', 'FAIL', errors.join('; '));
    else log('EN Homepage no console errors', 'PASS');

    // ── 3. Image page ZH ──────────────────────────────────────────
    console.log('\n=== 3. Image Page ZH ===');
    errors.length = 0;
    await page.goto(`${BASE}/zh/image`, { waitUntil: 'networkidle', timeout: 15000 });
    const imageTitle = await page.locator('body').textContent().catch(() => '');
    const hasImageZh = imageTitle.includes('图片') || imageTitle.includes('生成');
    log('ZH Image page loads', hasImageZh ? 'PASS' : 'FAIL', hasImageZh ? 'content looks Chinese' : 'NOT Chinese');
    if (errors.length > 0) log('ZH Image page errors', 'FAIL', errors.join('; '));
    else log('ZH Image page no errors', 'PASS');

    // ── 4. Login modal ──────────────────────────────────────────
    console.log('\n=== 4. Login Modal ===');
    errors.length = 0;
    await page.goto(`${BASE}/zh/image`, { waitUntil: 'networkidle', timeout: 15000 });
    // Click login button
    const loginBtn = page.locator('button', { hasText: /登录|Login/ }).first();
    await loginBtn.click();
    await page.waitForTimeout(500);
    
    // Check modal appeared
    const modalVisible = await page.locator('text=手机号|Phone number|Phone').isVisible().catch(() => false);
    log('Login modal appears', modalVisible ? 'PASS' : 'FAIL', modalVisible ? 'Modal visible' : 'Modal NOT visible');
    
    // Type phone
    const phoneInput = page.locator('input[type="tel"]').first();
    await phoneInput.fill('13800138000');
    log('Phone input works', 'PASS');
    
    // Click send code
    const sendBtn = page.locator('button', { hasText: /获取验证码|Get Code|发送验证码|Send Code/ }).first();
    const sendBtnVisible = await sendBtn.isVisible().catch(() => false);
    log('Send code button visible', sendBtnVisible ? 'PASS' : 'FAIL');
    
    if (sendBtnVisible) {
      await sendBtn.click();
      await page.waitForTimeout(1500);
      // Check if we're on code step
      const codeInput = page.locator('input[maxlength="6"]').first();
      const codeInputVisible = await codeInput.isVisible().catch(() => false);
      log('Code step shown after send', codeInputVisible ? 'PASS' : 'FAIL');
    }

    // ── 5. EN Image page & language switch ──────────────────────
    console.log('\n=== 5. Language Switch EN ===');
    errors.length = 0;
    await page.goto(`${BASE}/zh/image`, { waitUntil: 'networkidle', timeout: 15000 });
    // Click language switcher
    const langBtn = page.locator('button', { hasText: /EN|中文/ }).first();
    const langBtnVisible = await langBtn.isVisible().catch(() => false);
    if (langBtnVisible) {
      await langBtn.click();
      await page.waitForTimeout(1000);
    }
    const currentUrl = page.url();
    log('Language switch navigates', currentUrl.includes('/en/') ? 'PASS' : 'FAIL', `url: ${currentUrl}`);
    
    const pageTextEn = await page.locator('body').textContent().catch(() => '');
    const hasEnglish = pageTextEn.includes('Image') || pageTextEn.includes('Generate') || pageTextEn.includes('Generation');
    log('EN Image page is in English', hasEnglish ? 'PASS' : 'FAIL', hasEnglish ? 'content is English' : 'content NOT English');

    // ── 6. Video page ZH ──────────────────────────────────────────
    console.log('\n=== 6. Video Page ZH ===');
    errors.length = 0;
    await page.goto(`${BASE}/zh/video`, { waitUntil: 'networkidle', timeout: 15000 });
    const videoText = await page.locator('body').textContent().catch(() => '');
    const hasVideoZh = videoText.includes('视频');
    log('ZH Video page loads', hasVideoZh ? 'PASS' : 'FAIL', hasVideoZh ? 'Chinese content' : 'NOT Chinese');
    if (errors.length > 0) log('ZH Video page errors', 'FAIL', errors.join('; '));
    else log('ZH Video page no errors', 'PASS');

    // ── 7. Audio page ZH ──────────────────────────────────────────
    console.log('\n=== 7. Audio Page ZH ===');
    errors.length = 0;
    await page.goto(`${BASE}/zh/audio`, { waitUntil: 'networkidle', timeout: 15000 });
    const audioText = await page.locator('body').textContent().catch(() => '');
    const hasAudioZh = audioText.includes('语音') || audioText.includes('音频') || audioText.includes('TTS');
    log('ZH Audio page loads', hasAudioZh ? 'PASS' : 'FAIL', hasAudioZh ? 'Chinese content' : 'NOT Chinese');
    if (errors.length > 0) log('ZH Audio page errors', 'FAIL', errors.join('; '));
    else log('ZH Audio page no errors', 'PASS');

    // ── 8. EN Video & Audio ──────────────────────────────────────
    console.log('\n=== 8. EN Pages ===');
    errors.length = 0;
    await page.goto(`${BASE}/en/video`, { waitUntil: 'networkidle', timeout: 15000 });
    const enVideoText = await page.locator('body').textContent().catch(() => '');
    const hasEnVideo = enVideoText.includes('Video') || enVideoText.includes('Generation');
    log('EN Video page loads & English', hasEnVideo ? 'PASS' : 'FAIL');
    if (errors.length > 0) log('EN Video page errors', 'FAIL', errors.join('; '));

    await page.goto(`${BASE}/en/audio`, { waitUntil: 'networkidle', timeout: 15000 });
    const enAudioText = await page.locator('body').textContent().catch(() => '');
    const hasEnAudio = enAudioText.includes('Audio') || enAudioText.includes('Speech') || enAudioText.includes('TTS');
    log('EN Audio page loads & English', hasEnAudio ? 'PASS' : 'FAIL');
    if (errors.length > 0) log('EN Audio page errors', 'FAIL', errors.join('; '));
    else log('EN Audio page no errors', 'PASS');

    // ── 9. Image generation (mock) ─────────────────────────────
    console.log('\n=== 9. Image Generation Flow ===');
    await page.goto(`${BASE}/zh/image`, { waitUntil: 'networkidle', timeout: 15000 });
    const promptInput = page.locator('textarea').first();
    const promptVisible = await promptInput.isVisible().catch(() => false);
    if (promptVisible) {
      await promptInput.fill('一只橘色的猫在草地上奔跑');
      log('Prompt input filled', 'PASS');
      // Click generate
      const genBtn = page.locator('button', { hasText: /生成|Generate/ }).first();
      await genBtn.click();
      await page.waitForTimeout(500);
      // Check generating state
      const genText = await page.locator('body').textContent().catch(() => '');
      const isGenerating = genText.includes('生成中') || genText.includes('Generating');
      log('Generate button triggers state', isGenerating ? 'PASS' : 'FAIL');
    } else {
      log('Prompt textarea NOT found', 'FAIL');
    }

    // ── 10. Login flow end-to-end ─────────────────────────────
    console.log('\n=== 10. Login Flow E2E ===');
    // Close any modal first
    await page.goto(`${BASE}/zh/image`, { waitUntil: 'networkidle', timeout: 15000 });
    // Try to find and click login
    const loginBtn2 = page.locator('button').filter({ hasText: /登录/ }).first();
    await loginBtn2.click();
    await page.waitForTimeout(800);
    
    // Enter phone
    const phoneInput2 = page.locator('input[type="tel"]').first();
    await phoneInput2.fill('13800138000');
    
    // Send code via UI
    const sendBtn2 = page.locator('button').filter({ hasText: /获取验证码/ }).first();
    await sendBtn2.click();
    await page.waitForTimeout(2000);
    
    // Get code via API
    const apiResponse = await page.evaluate(async () => {
      const res = await fetch('http://localhost:3004/api/v1/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '13800138000' })
      });
      return res.json();
    });
    const code = apiResponse._dev_code;
    log('API returns code for login', code ? 'PASS' : 'FAIL', `code: ${code}`);
    
    // Enter code
    const codeInput2 = page.locator('input[maxlength="6"]').first();
    await codeInput2.fill(code);
    await page.waitForTimeout(500);
    
    // Confirm login
    const confirmBtn = page.locator('button').filter({ hasText: /确认登录|Confirm/ }).first();
    await confirmBtn.click();
    await page.waitForTimeout(3000);
    
    // Check if logged in (check for balance in header)
    const bodyText = await page.locator('body').textContent().catch(() => '');
    const isLoggedIn = bodyText.includes('¥') || bodyText.includes('dashboard') || bodyText.includes('Dashboard');
    log('Login successful (shows balance/UI)', isLoggedIn ? 'PASS' : 'FAIL');

  } catch (err) {
    console.error('TEST ERROR:', err.message);
    log('CRITICAL ERROR', 'FAIL', err.message);
  } finally {
    await browser.close();
  }

  // Summary
  console.log('\n=== SUMMARY ===');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(`Total: ${results.length} | ✅ ${passed} | ❌ ${failed}`);
  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => console.log(`  ❌ ${r.name}: ${r.detail}`));
  }
}

runTests();
