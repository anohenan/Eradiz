import type { CreditsState } from "../types/eradiz";

const STORAGE_KEY = "eradiz_credits_v1";
export const INITIAL_FREE_CREDITS = 5;

/**
 * Interface abstraite prête pour brancher Firebase Auth / Firestore
 * sans modifier les composants UI.
 */
export interface CreditsRepository {
  getState(): CreditsState;
  decrementCredit(): CreditsState;
  addCredits(amount: number): CreditsState;
  purchasePack(packName: string, creditsAdded: number): CreditsState;
  activateSubscription(planName: string, creditsAdded: number): CreditsState;
  incrementGeneratedCount(): CreditsState;
  resetLocalData(): CreditsState;
}

class LocalStorageCreditsRepository implements CreditsRepository {
  private readRaw(): CreditsState | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<CreditsState>;
      if (typeof parsed.balance !== "number" || Number.isNaN(parsed.balance)) {
        return null;
      }
      return {
        balance: Math.max(0, Math.floor(parsed.balance)),
        activePlan:
          typeof parsed.activePlan === "string" && parsed.activePlan.trim()
            ? parsed.activePlan
            : "Découverte",
        isFirstVisitGranted: Boolean(parsed.isFirstVisitGranted),
        totalGenerated:
          typeof parsed.totalGenerated === "number" ? parsed.totalGenerated : 0,
        updatedAt:
          typeof parsed.updatedAt === "string"
            ? parsed.updatedAt
            : new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }

  private write(state: CreditsState): CreditsState {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        // Ignore storage quota errors gracefully
      }
    }
    return state;
  }

  getState(): CreditsState {
    const existing = this.readRaw();
    if (existing) {
      return existing;
    }
    const initialState: CreditsState = {
      balance: INITIAL_FREE_CREDITS,
      activePlan: "Découverte",
      isFirstVisitGranted: true,
      totalGenerated: 0,
      updatedAt: new Date().toISOString(),
    };
    return this.write(initialState);
  }

  decrementCredit(): CreditsState {
    const current = this.getState();
    const next: CreditsState = {
      ...current,
      balance: Math.max(0, current.balance - 1),
      totalGenerated: current.totalGenerated + 1,
      updatedAt: new Date().toISOString(),
    };
    return this.write(next);
  }

  addCredits(amount: number): CreditsState {
    const current = this.getState();
    const safeAmount = Math.max(0, Math.floor(amount));
    const next: CreditsState = {
      ...current,
      balance: current.balance + safeAmount,
      updatedAt: new Date().toISOString(),
    };
    return this.write(next);
  }

  purchasePack(packName: string, creditsAdded: number): CreditsState {
    const current = this.getState();
    const safeAmount = Math.max(0, Math.floor(creditsAdded));
    const next: CreditsState = {
      ...current,
      activePlan:
        current.activePlan === "Découverte" ? packName : current.activePlan,
      balance: current.balance + safeAmount,
      updatedAt: new Date().toISOString(),
    };
    return this.write(next);
  }

  activateSubscription(planName: string, creditsAdded: number): CreditsState {
    const current = this.getState();
    const safeAmount = Math.max(0, Math.floor(creditsAdded));
    const next: CreditsState = {
      ...current,
      activePlan: planName,
      balance: current.balance + safeAmount,
      updatedAt: new Date().toISOString(),
    };
    return this.write(next);
  }

  incrementGeneratedCount(): CreditsState {
    const current = this.getState();
    const next: CreditsState = {
      ...current,
      totalGenerated: current.totalGenerated + 1,
      updatedAt: new Date().toISOString(),
    };
    return this.write(next);
  }

  resetLocalData(): CreditsState {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore errors
      }
    }
    return this.getState();
  }
}

export const creditsRepository: CreditsRepository =
  new LocalStorageCreditsRepository();
