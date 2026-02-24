
import { Card, Rank, Suit } from '../types';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: `${rank}-${suit}-${Math.random().toString(36).substr(2, 9)}`,
        suit,
        rank,
      });
    }
  }
  return shuffle(deck);
}

export function shuffle(deck: Card[]): Card[] {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
}

export function canPlay(card: Card, topCard: Card | null, currentSuit: Suit | null): boolean {
  if (!card) return false;
  if (card.rank === '8') return true;
  if (!topCard) return true; // Should not happen in normal play
  
  const targetSuit = currentSuit || topCard.suit;
  return card.suit === targetSuit || card.rank === topCard.rank;
}
