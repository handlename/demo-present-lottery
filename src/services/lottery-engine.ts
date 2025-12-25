import type { Session, Participant } from "@/types";

export class LotteryEngine {
  /**
   * 未当選者の中からランダムに1名を抽選する
   */
  drawWinner(session: Session): Participant | null {
    const candidates = this.getCandidates(session);
    if (candidates.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * candidates.length);
    const winner = candidates[randomIndex];

    winner.isWinner = true;
    winner.winOrder = session.lotteryState.currentRound + 1;

    session.lotteryState.currentRound += 1;
    session.lotteryState.winners.push(winner.id);

    if (this.isCompleted(session)) {
      session.lotteryState.status = "completed";
    } else {
      session.lotteryState.status = "in_progress";
    }

    return winner;
  }

  /**
   * 抽選をリセットする
   */
  reset(session: Session): void {
    session.lotteryState = {
      status: "waiting",
      currentRound: 0,
      winners: [],
    };

    for (const participant of session.participants.values()) {
      participant.isWinner = false;
      participant.winOrder = undefined;
    }
  }

  /**
   * 抽選が完了したかどうかを判定する
   */
  isCompleted(session: Session): boolean {
    return session.lotteryState.winners.length >= session.participants.size;
  }

  /**
   * 未当選の参加者一覧を取得する
   */
  getCandidates(session: Session): Participant[] {
    return Array.from(session.participants.values()).filter(
      (p) => !p.isWinner
    );
  }

  /**
   * 現在のラウンド数を取得する
   */
  getCurrentRound(session: Session): number {
    return session.lotteryState.currentRound;
  }

  /**
   * 残りの参加者数を取得する
   */
  getRemainingCount(session: Session): number {
    return this.getCandidates(session).length;
  }
}

export const lotteryEngine = new LotteryEngine();
