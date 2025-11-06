import asyncio
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None
    
    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()
        
        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )
        
        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)
        
        # Open a new page in the browser context
        page = await context.new_page()
        
        # Navigate to your target URL and wait until the network request is committed
        await page.goto("http://localhost:5173", wait_until="commit", timeout=10000)
        
        # Wait for the main page to reach DOMContentLoaded state (optional for stability)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=3000)
        except async_api.Error:
            pass
        
        # Iterate through all iframes and wait for them to load as well
        for frame in page.frames:
            try:
                await frame.wait_for_load_state("domcontentloaded", timeout=3000)
            except async_api.Error:
                pass
        
        # Interact with the page elements to simulate user flow
        # -> Input email and password, then click Sign In button to authenticate.
        frame = context.pages[-1]
        # Input email address
        elem = frame.locator('xpath=html/body/div/div[3]/div/form/div/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('any2crds+pat1@gmail.com')
        

        frame = context.pages[-1]
        # Input password
        elem = frame.locator('xpath=html/body/div/div[3]/div/form/div[2]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('admin123')
        

        frame = context.pages[-1]
        # Click Sign In button
        elem = frame.locator('xpath=html/body/div/div[3]/div/form/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click the 'Chat with Pat' button to open the AI chat interface.
        frame = context.pages[-1]
        # Click the 'Chat with Pat' button to open AI chat interface
        elem = frame.locator('xpath=html/body/div/div[3]/main/div/div[2]/div/div[3]/div[2]/div[3]/div/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Input a query that triggers an AI response in the chat textarea.
        frame = context.pages[-1]
        # Input a query to trigger AI response
        elem = frame.locator('xpath=html/body/div/div[3]/main/div/div/div[2]/div/textarea').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('What is the recommended daily intake of protein?')
        

        # -> Click the 'Voice Chat' button to activate text-to-speech for the AI response.
        frame = context.pages[-1]
        # Click the 'Voice Chat' button to activate text-to-speech
        elem = frame.locator('xpath=html/body/div/div[3]/main/div/div/div[2]/div/button[3]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # --> Assertions to verify final state
        frame = context.pages[-1]
        await expect(frame.locator('text=Hi, I\'m Pat. I can help with meals, workouts, and planning!').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=🍽️ Tell me what you ate').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=📸 Show me what you\'re eating').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Silent Mode').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=neutral').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Start Voice Chat').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Chat with Pat').first).to_be_visible(timeout=30000)
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    