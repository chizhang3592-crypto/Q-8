
import React from 'react';
import { motion } from 'motion/react';
import { Card, Suit } from '../types';

interface PlayingCardProps {
  card: Card;
  isFaceUp?: boolean;
  onClick?: () => void;
  isPlayable?: boolean;
  className?: string;
}

const SuitIcon = ({ suit }: { suit: Suit }) => {
  switch (suit) {
    case 'hearts': return <span className="text-red-500">♥</span>;
    case 'diamonds': return <span className="text-red-500">♦</span>;
    case 'clubs': return <span className="text-black">♣</span>;
    case 'spades': return <span className="text-black">♠</span>;
  }
};

export const PlayingCard: React.FC<PlayingCardProps> = ({ 
  card, 
  isFaceUp = true, 
  onClick, 
  isPlayable = false,
  className = ""
}) => {
  if (!isFaceUp) {
    return (
      <div 
        className={`w-20 h-28 sm:w-24 sm:h-36 bg-indigo-800 rounded-lg border-2 border-white/20 shadow-lg flex items-center justify-center overflow-hidden relative ${className}`}
      >
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
        <div className="w-12 h-16 border border-white/30 rounded flex items-center justify-center">
          <div className="text-white/40 font-bold text-xl">Q</div>
        </div>
      </div>
    );
  }

  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';

  return (
    <motion.div
      whileHover={isPlayable ? { y: -10, scale: 1.05 } : {}}
      whileTap={isPlayable ? { scale: 0.95 } : {}}
      onClick={isPlayable ? onClick : undefined}
      className={`
        w-20 h-28 sm:w-24 sm:h-36 bg-white rounded-lg border-2 shadow-lg flex flex-col p-2 relative cursor-default select-none
        ${isPlayable ? 'border-yellow-400 cursor-pointer ring-4 ring-yellow-400/30' : 'border-gray-200'}
        ${className}
      `}
    >
      <div className={`text-lg sm:text-xl font-bold leading-none ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
        {card.rank}
      </div>
      <div className="text-sm sm:text-base leading-none">
        <SuitIcon suit={card.suit} />
      </div>
      
      <div className="flex-1 flex items-center justify-center text-3xl sm:text-4xl">
        <SuitIcon suit={card.suit} />
      </div>

      <div className="rotate-180 flex flex-col items-start">
        <div className={`text-lg sm:text-xl font-bold leading-none ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
          {card.rank}
        </div>
        <div className="text-sm sm:text-base leading-none">
          <SuitIcon suit={card.suit} />
        </div>
      </div>
    </motion.div>
  );
};
