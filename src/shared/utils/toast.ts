import { ToastType } from "../types/types"
import logger from "./logger"

export class ToastManager {
  private container: HTMLDivElement | null = null
  private toasts: Map<string, HTMLDivElement> = new Map()
  private toastCounter = 0

  constructor() {
    this.injectStyles()
    this.createContainer()
  }

  private injectStyles(): void {
    if (document.getElementById("iics-toast-styles")) {
      return
    }

    const style = document.createElement("style")
    style.id = "iics-toast-styles"
    style.textContent = `
      .iics-toast {
        background: white;
        padding: 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 300px;
        animation: toastSlideIn 0.3s ease forwards;
      }
      
      .iics-toast-success {
        border-left: 4px solid #4caf50;
      }
      
      .iics-toast-error {
        border-left: 4px solid #f44336;
      }
      
      .iics-toast-warning {
        border-left: 4px solid #ff9800;
      }
      
      .iics-toast-info {
        border-left: 4px solid #2196f3;
      }
      
      .toast-icon {
        font-size: 20px;
        font-weight: bold;
      }
      
      .toast-content {
        flex: 1;
        font-size: 14px;
        color: #333;
      }
      
      .toast-close {
        background: transparent;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: #666;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
      }
      
      .toast-close:hover {
        background: #f0f0f0;
      }
      
      @keyframes toastSlideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      @keyframes toastSlideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(400px);
          opacity: 0;
        }
      }
    `
    document.head.appendChild(style)
  }

  private createContainer(): void {
    this.container = document.createElement("div")
    this.container.id = "iics-toast-container"
    this.container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 999999;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 400px;
    `
    document.body.appendChild(this.container)
  }

  public show(
    message: string,
    type: ToastType = "info",
    duration: number = 3000
  ): string {
    if (!this.container) {
      this.createContainer()
    }

    const id = `toast-${++this.toastCounter}`
    const toast = document.createElement("div")
    toast.className = `iics-toast iics-toast-${type}`
    toast.setAttribute("data-toast-id", id)
    toast.setAttribute("role", "alert")
    toast.setAttribute("aria-live", "polite")

    const icons: Record<ToastType, string> = {
      success: "✓",
      error: "✗",
      warning: "⚠",
      info: "ℹ",
    }

    toast.innerHTML = `
      <div class="toast-icon" aria-hidden="true">${icons[type]}</div>
      <div class="toast-content">${this.escapeHtml(message)}</div>
      <button class="toast-close" aria-label="Close notification">×</button>
    `

    toast.style.pointerEvents = "auto"

    // Close button
    const closeBtn = toast.querySelector(".toast-close")
    closeBtn?.addEventListener("click", () => this.hide(id))

    this.container?.appendChild(toast)
    this.toasts.set(id, toast)

    // Animate in
    requestAnimationFrame(() => {
      toast.style.animation = "toastSlideIn 0.3s ease forwards"
    })

    // Auto-hide
    if (duration > 0) {
      setTimeout(() => this.hide(id), duration)
    }

    logger.debug(`Toast shown: ${type} - ${message}`)
    return id
  }

  public hide(id: string): void {
    const toast = this.toasts.get(id)
    if (!toast) return

    toast.style.animation = "toastSlideOut 0.3s ease forwards"

    setTimeout(() => {
      toast.remove()
      this.toasts.delete(id)
    }, 300)
  }

  public hideAll(): void {
    this.toasts.forEach((_, id) => this.hide(id))
  }

  private escapeHtml(text: string): string {
    const div = document.createElement("div")
    div.textContent = text
    return div.innerHTML
  }

  public destroy(): void {
    this.hideAll()
    this.container?.remove()
    this.container = null
  }
}
