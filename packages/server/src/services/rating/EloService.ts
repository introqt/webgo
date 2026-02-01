/**
 * ELO Rating Service
 * Implements the ELO rating system for Go games with K-factor of 32
 */

const K_FACTOR = 32;
const MINIMUM_RATING = 100;

export interface RatingChange {
  newRating: number;
  ratingChange: number;
}

export interface GameRatingResult {
  winner: RatingChange;
  loser: RatingChange;
}

export interface DrawRatingResult {
  player1: RatingChange;
  player2: RatingChange;
}

export class EloService {
  /**
   * Calculate expected score for a player
   * Formula: 1 / (1 + 10^((opponentRating - playerRating) / 400))
   */
  static calculateExpectedScore(playerRating: number, opponentRating: number): number {
    return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  }

  /**
   * Calculate new rating after a game
   * Formula: oldRating + K * (actualScore - expectedScore)
   * @param oldRating - Player's rating before the game
   * @param expectedScore - Expected score (0-1)
   * @param actualScore - Actual score (1 for win, 0 for loss, 0.5 for draw)
   */
  static calculateNewRating(
    oldRating: number,
    expectedScore: number,
    actualScore: number
  ): number {
    const newRating = oldRating + K_FACTOR * (actualScore - expectedScore);
    return Math.max(MINIMUM_RATING, Math.round(newRating));
  }

  /**
   * Calculate rating changes after a win/loss game
   */
  static calculateGameResult(
    winnerRating: number,
    loserRating: number
  ): GameRatingResult {
    const winnerExpected = this.calculateExpectedScore(winnerRating, loserRating);
    const loserExpected = this.calculateExpectedScore(loserRating, winnerRating);

    const winnerNewRating = this.calculateNewRating(winnerRating, winnerExpected, 1);
    const loserNewRating = this.calculateNewRating(loserRating, loserExpected, 0);

    return {
      winner: {
        newRating: winnerNewRating,
        ratingChange: winnerNewRating - winnerRating,
      },
      loser: {
        newRating: loserNewRating,
        ratingChange: loserNewRating - loserRating,
      },
    };
  }

  /**
   * Calculate rating changes after a draw
   */
  static calculateDrawResult(
    player1Rating: number,
    player2Rating: number
  ): DrawRatingResult {
    const player1Expected = this.calculateExpectedScore(player1Rating, player2Rating);
    const player2Expected = this.calculateExpectedScore(player2Rating, player1Rating);

    const player1NewRating = this.calculateNewRating(player1Rating, player1Expected, 0.5);
    const player2NewRating = this.calculateNewRating(player2Rating, player2Expected, 0.5);

    return {
      player1: {
        newRating: player1NewRating,
        ratingChange: player1NewRating - player1Rating,
      },
      player2: {
        newRating: player2NewRating,
        ratingChange: player2NewRating - player2Rating,
      },
    };
  }
}
