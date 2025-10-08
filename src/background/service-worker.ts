import logger from "@/shared/utils/logger"

logger.info("IICS Field Validator background service worker loaded")
chrome.runtime.onInstalled.addListener(async (details) => {
  logger.info(`Extension event: ${details.reason}`)

  if (details.reason === "install") {
    const version = chrome.runtime.getManifest().version
    logger.info(`Extension installed - version ${version}`)

    try {
      const result = await chrome.storage.sync.get(["config"])
      if (!result["config"]) {
        logger.info("Initializing default configuration")
      }
    } catch (error) {
      logger.error("Failed to check intial config", error as Error)
    }
  } else if (details.reason === "update") {
    logger.info(
      `Extension updated from ${details.previousVersion} to ${
        chrome.runtime.getManifest().version
      }`
    )
  }
})

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  logger.debug(
    "Background received:",
    request.action,
    "from:",
    sender.tab?.id || "popup"
  )

  switch (request.action) {
    case "getVersion":
      sendResponse({ version: chrome.runtime.getManifest().version })
      break
    case "ping":
      sendResponse({ alive: true, timestamp: Date.now() })
      break
    default:
      sendResponse({ received: true })
  }

  return true
})

chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (
    changeInfo.status === "complete" &&
    tab.url?.includes("informaticacloud.com")
  ) {
    logger.debug(`IICS page loaded: ${tab.url}`)
  }
})

const KEEP_ALIVE_INTERVAL: number = 20000
let keepAliveInterval: ReturnType<typeof setInterval> | undefined

function startKeepAlive() {
  if (keepAliveInterval) {
    return
  }

  keepAliveInterval = setInterval(() => {
    chrome.tabs
      .query({ url: "*://*.informaticacloud.com/*" })
      .then((tabs) => {
        if (tabs.length > 0) {
          logger.debug(`Active IICS tabs: ${tabs.length}`)
        }
      })
      .catch((error) => {
        logger.error("Failed to query tabs", error as Error)
      })
  }, KEEP_ALIVE_INTERVAL)
}

function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval)

    keepAliveInterval = undefined
    logger.debug("Service worker keep-alive stopped")
  }
}

startKeepAlive()
self.addEventListener("deactivate", () => {
  stopKeepAlive()
})

self.addEventListener("error", (event) => {
  logger.error("Service worker error:", event.error)
})

logger.info("IICS Field Validator background service worker ready")
