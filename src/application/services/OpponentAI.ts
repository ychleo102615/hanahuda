import type { GameState } from '@/domain/entities/GameState';
import type { PlayCardRequest } from '../ports/repositories/GameRepository';

export class OpponentAI {
  static decideMove(gameState: GameState): PlayCardRequest | null {
    if (!gameState.currentPlayer || gameState.currentPlayer.id !== 'player2') {
      return null;
    }

    const opponent = gameState.currentPlayer;
    if (opponent.hand.length === 0) {
      return null;
    }

    // Simple AI: find the first card in hand that has a match on the field.
    for (const handCard of opponent.hand) {
      const matches = gameState.getFieldMatches(handCard);
      if (matches.length > 0) {
        return {
          playerId: opponent.id,
          cardId: handCard.id,
          selectedFieldCard: matches[0].id,
        };
      }
    }

    // If no matches, play the first card.
    return {
      playerId: opponent.id,
      cardId: opponent.hand[0].id,
    };
  }
}
