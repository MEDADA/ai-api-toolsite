const { chromium } = require('playwright');

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
    // ── 1. Homepage ZH ──────────────────────────────────────────
    console.log('\n=== 1. Homepage ZH ===');
    errors.length = 0;
    await page.goto(`${BASE}/zh`, { waitUntil: 'networkidle', timeout: 15000 });
    const bodyText = await page.locator('body').textContent();
    const h1Text = await page.locator('h1, h2').first().textContent().catch(() => 'N/A');
    log('ZH Homepage loads', 'PASS', `h2: "${h1Text?.slice(0,60)}"`);
    const hasChineseHome = bodyText.includes('AI') || bodyText.includes('创作');
    log('ZH Homepage has Chinese content', hasChineseHome ? 'PASS' : 'FAIL');
    if (errors.length > 0) log('ZH Homepage errors', 'FAIL', errors.slice(0,2).join('; '));
    else log('ZH Homepage no console errors', 'PASS');

    // ── 2. Homepage EN ──────────────────────────────────────────
    console.log('\n=== 2. Homepage EN ===');
    errors.length = 0;
    await page.goto(`${BASE}/en`, { waitUntil: 'networkidle', timeout: 15000 });
    const enBodyText = await page.locator('body').textContent();
    const enH2 = await page.locator('h1, h2').first().textContent().catch(() => 'N/A');
    log('EN Homepage loads', 'PASS', `h2: "${enH2?.slice(0,60)}"`);
    const hasEnglishHome = enBodyText.includes('AI') || enBodyText.includes('Creation');
    log('EN Homepage has English content', hasEnglishHome ? 'PASS' : 'FAIL');
    if (errors.length > 0) log('EN Homepage errors', 'FAIL', errors.slice(0,2).join('; '));
    else log('EN Homepage no console errors', 'PASS');

    // ── 3. Image page ZH ──────────────────────────────────────────
    console.log('\n=== 3. Image Page ZH ===');
    errors.length = 0;
    await page.goto(`${BASE}/zh/image`, { waitUntil: 'networkidle', timeout: 15000 });
    const zhImgBody = await page.locator('body').textContent();
    const hasImageZh = zhImgBody.includes('图片') || zhImgBody.includes('生成') || zhImgBody.includes('模型');
    log('ZH Image page loads with Chinese', hasImageZh ? 'PASS' : 'FAIL');
    const hasPromptArea = await page.locator('textarea').isVisible().catch(() => false);
    log('ZH Image page has textarea', hasPromptArea ? 'PASS' : 'FAIL');
    if (errors.length > 0) log('ZH Image page errors', 'FAIL', errors.slice(0,2).join('; '));
    else log('ZH Image page no console errors', 'PASS');

    // ── 4. Login modal ──────────────────────────────────────────
    console.log('\n=== 4. Login Modal ===');
    errors.length = 0;
    await page.goto(`${BASE}/zh/image`, { waitUntil: 'networkidle', timeout: 15000 });
    // Click login button (text contains 登录)
    const loginBtn = page.locator('button').filter({ hasText: '登录' }).first();
    const loginBtnVisible = await loginBtn.isVisible().catch(() => false);
    log('Login button visible', loginBtnVisible ? 'PASS' : 'FAIL');
    
    if (loginBtnVisible) {
      await loginBtn.click();
      await page.waitForTimeout(800);
    }
    
    // Check modal
    const modalVisible = await page.locator('text=手机号').isVisible().catch(() => false) ||
                        await page.locator('input[type="tel"]').isVisible().catch(() => false);
    log('Login modal appears', modalVisible ? 'PASS' : 'FAIL');
    
    // Type phone
    const phoneInput = page.locator('input[type="tel"]').first();
    if (await phoneInput.isVisible().catch(() => false)) {
      await phoneInput.fill('13800138000');
      log('Phone input works', 'PASS');
      
      // Click send code
      const sendBtn = page.locator('button').filter({ hasText: /获取验证码|Send Code/ }).first();
      const sendBtnVisible = await sendBtn.isVisible().catch(() => false);
      log('Send code button visible', sendBtnVisible ? 'PASS' : 'FAIL');
      
      if (sendBtnVisible) {
        await sendBtn.click();
        await page.waitForTimeout(2000);
        
        // Check if code step shown
        const codeInput = page.locator('input[maxlength="6"]').first();
        const codeVisible = await codeInput.isVisible().catch(() => false);
        log('Code step shown after send', codeVisible ? 'PASS' : 'FAIL');
        
        if (codeVisible) {
          // Get code via API
          const apiRes = await page.evaluate(async () => {
            try {
              const res = await fetch('http://localhost:3004/api/v1/auth/send-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: '13800138000' })
              });
              return await res.json();
            } catch(e) { return { error: e.message }; }
          });
          const code = apiRes._dev_code;
          log('API returns verification code', code ? 'PASS' : 'FAIL', code ? `code: ${code}` : apiRes.error);
          
          if (code) {
            await codeInput.fill(code);
            await page.waitForTimeout(300);
            
            const confirmBtn = page.locator('button').filter({ hasText: /确认登录|Confirm/ }).first();
            await confirmBtn.click();
            await page.waitForTimeout(3000);
            
            const bodyAfterLogin = await page.locator('body').textContent();
            const isLoggedIn = bodyAfterLogin.includes('¥') || 
                               bodyAfterLogin.includes('dashboard') ||
                               bodyAfterLogin.includes('历史') ||
                               bodyAfterLogin.includes('Dashboard');
            log('Login flow completed', isLoggedIn ? 'PASS' : 'FAIL');
          }
        }
      }
    } else {
      log('Phone input NOT visible', 'FAIL');
    }
    
    if (errors.length > 0) log('Login modal errors', 'FAIL', errors.slice(0,2).join('; '));

    // ── 5. Language switch ──────────────────────────────────────
    console.log('\n=== 5. Language Switch ===');
    errors.length = 0;
    await page.goto(`${BASE}/zh/image`, { waitUntil: 'networkidle', timeout: 15000 });
    const langBtn = page.locator('button').filter({ hasText: /EN|中文/ }).first();
    const langBtnVisible = await langBtn.isVisible().catch(() => false);
    log('Language switch button visible', langBtnVisible ? 'PASS' : 'FAIL');
    
    if (langBtnVisible) {
      await langBtn.click();
      await page.waitForTimeout(1500);
    }
    
    const currentUrl = page.url();
    const switchedToEn = currentUrl.includes('/en/') || currentUrl.includes('/en?');
    log('Language switch navigates to EN', switchedToEn ? 'PASS' : 'FAIL', `url: ${currentUrl}`);
    
    const enPageText = await page.locator('body').textContent().catch(() => '');
    const hasEnglish = enPageText.includes('Image') || enPageText.includes('Generation') || enPageText.includes('Generate');
    log('EN Image page is English', hasEnglish ? 'PASS' : 'FAIL');
    
    // Switch back to ZH
    const langBtn2 = page.locator('button').filter({ hasText: /中文|EN/ }).first();
    if (await langBtn2.isVisible().catch(() => false)) {
      await langBtn2.click();
      await page.waitForTimeout(1500);
    }
    const backUrl = page.url();
    const switchedBack = backUrl.includes('/zh/') || (!backUrl.includes('/en/') && backUrl.includes('localhost:3005'));
    log('Switch back to ZH works', switchedBack ? 'PASS' : 'FAIL', `url: ${backUrl}`);
    
    if (errors.length > 0) log('Language switch errors', 'FAIL', errors.slice(0,2).join('; '));
    else log('Language switch no errors', 'PASS');

    // ── 6. Video page ZH ──────────────────────────────────────────
    console.log('\n=== 6. Video Page ===');
    errors.length = 0;
    await page.goto(`${BASE}/zh/video`, { waitUntil: 'networkidle', timeout: 15000 });
    const videoText = await page.locator('body').textContent();
    const hasVideoZh = videoText.includes('视频') || videoText.includes('生成');
    log('ZH Video page loads', hasVideoZh ? 'PASS' : 'FAIL');
    if (errors.length > 0) log('ZH Video errors', 'FAIL', errors.slice(0,2).join('; '));
    else log('ZH Video no errors', 'PASS');

    // ── 7. Audio page ZH ──────────────────────────────────────────
    console.log('\n=== 7. Audio Page ===');
    errors.length = 0;
    await page.goto(`${BASE}/zh/audio`, { waitUntil: 'networkidle', timeout: 15000 });
    const audioText = await page.locator('body').textContent();
    const hasAudioZh = audioText.includes('语音') || audioText.includes('音频') || audioText.includes('TTS');
    log('ZH Audio page loads', hasAudioZh ? 'PASS' : 'FAIL');
    if (errors.length > 0) log('ZH Audio errors', 'FAIL', errors.slice(0,2).join('; '));
    else log('ZH Audio no errors', 'PASS');

    // ── 8. EN pages ──────────────────────────────────────────────
    console.log('\n=== 8. EN Pages ===');
    errors.length = 0;
    await page.goto(`${BASE}/en/video`, { waitUntil: 'networkidle', timeout: 15000 });
    const enVideoText = await page.locator('body').textContent();
    const hasEnVideo = enVideoText.includes('Video') || enVideoText.includes('Generation');
    log('EN Video page loads & English', hasEnVideo ? 'PASS' : 'FAIL');
    if (errors.length > 0) log('EN Video errors', 'FAIL', errors.slice(0,2).join('; '));
    else log('EN Video no errors', 'PASS');

    errors.length = 0;
    await page.goto(`${BASE}/en/audio`, { waitUntil: 'networkidle', timeout: 15000 });
    const enAudioText = await page.locator('body').textContent();
    const hasEnAudio = enAudioText.includes('Audio') || enAudioText.includes('Speech') || enAudioText.includes('TTS');
    log('EN Audio page loads & English', hasEnAudio ? 'PASS' : 'FAIL');
    if (errors.length > 0) log('EN Audio errors', 'FAIL', errors.slice(0,2).join('; '));
    else log('EN Audio no errors', 'PASS');

    // ── 9. Image generation flow ──────────────────────────────────
    console.log('\n=== 9. Image Generation ===');
    errors.length = 0;
    await page.goto(`${BASE}/zh/image`, { waitUntil: 'networkidle', timeout: 15000 });
    const promptArea = page.locator('textarea').first();
    if (await promptArea.isVisible().catch(() => false)) {
      await promptArea.fill('一只橘色的猫在草地上奔跑');
      log('Prompt input filled', 'PASS');
      
      const genBtn = page.locator('button').filter({ hasText: /生成|Generate/ }).first();
      const genBtnEnabled = !(await genBtn.getAttribute('disabled'));
      log('Generate button is enabled', genBtnEnabled ? 'PASS' : 'FAIL');
      
      await genBtn.click();
      await page.waitForTimeout(1000);
      
      const pageDuringGen = await page.locator('body').textContent();
      const isGenerating = pageDuringGen.includes('生成中') || pageDuringGen.includes('Generating');
      log('Generating state shows', isGenerating ? 'PASS' : 'FAIL');
    }
    if (errors.length > 0) log('Image generation errors', 'FAIL', errors.slice(0,2).join('; '));

  } catch (err) {
    console.error('\n❌ CRITICAL ERROR:', err.message);
    log('CRITICAL ERROR', 'FAIL', err.message);
  } finally {
    await browser.close();
  }

  // Summary
  console.log('\n=== SUMMARY ===');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(`Total: ${results.length} | ✅ ${passed} passed | ❌ ${failed} failed`);
  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => console.log(`  ❌ ${r.name}${r.detail ? ': ' + r.detail : ''}`));
  }
}

runTests();
