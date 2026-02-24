/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PlayingCard } from './components/PlayingCard';
import { Card, GameState, Suit, GameStatus } from './types';
import { createDeck, canPlay, shuffle } from './utils/deck';
import { Trophy, RotateCcw, Info, ChevronRight, Layers } from 'lucide-react';

export default function App() {
  const [state, setState] = useState<GameState>({
    deck: [],
    playerHand: [],
    aiHand: [],
    discardPile: [],
    currentSuit: null,
    turn: 'player',
    status: 'menu',
    winner: null,
    lastAction: '欢迎来到 Q 疯狂 8 点！',
  });

  const [pendingEightCard, setPendingEightCard] = useState<Card | null>(null);

  // Initialize game
  const initGame = useCallback(() => {
    const fullDeck = createDeck();
    const playerHand = fullDeck.splice(0, 8);
    const aiHand = fullDeck.splice(0, 8);
    
    // Find a non-8 card for the start of discard pile
    let firstCardIndex = fullDeck.findIndex(c => c.rank !== '8');
    if (firstCardIndex === -1) firstCardIndex = 0;
    const discardPile = [fullDeck.splice(firstCardIndex, 1)[0]];

    setState({
      deck: fullDeck,
      playerHand,
      aiHand,
      discardPile,
      currentSuit: null,
      turn: 'player',
      status: 'playing',
      winner: null,
      lastAction: '游戏开始！轮到你了。',
    });
  }, []);

  useEffect(() => {
    if (state.status === 'waiting') {
      initGame();
    }
  }, [state.status, initGame]);

  // Reshuffle discard pile back into deck when deck is low
  const reshuffleIfNeeded = useCallback(() => {
    setState(prev => {
      if (prev.deck.length > 2 || prev.discardPile.length <= 1) return prev;
      
      const topCard = prev.discardPile[prev.discardPile.length - 1];
      const restOfDiscard = prev.discardPile.slice(0, -1);
      const newDeck = shuffle([...prev.deck, ...restOfDiscard]);
      
      return {
        ...prev,
        deck: newDeck,
        discardPile: [topCard],
        lastAction: '摸牌堆已耗尽，弃牌堆已重新洗牌。',
      };
    });
  }, []);

  // Check for winner
  useEffect(() => {
    if (state.status === 'playing') {
      if (state.playerHand.length === 0) {
        setState(prev => ({ ...prev, status: 'game_over', winner: 'player', lastAction: '你赢了！' }));
      } else if (state.aiHand.length === 0) {
        setState(prev => ({ ...prev, status: 'game_over', winner: 'ai', lastAction: 'AI 赢了！' }));
      }
    }
  }, [state.playerHand.length, state.aiHand.length, state.status]);

  const getSuitName = (suit: Suit) => {
    const names: Record<Suit, string> = { hearts: '红心', diamonds: '方块', clubs: '梅花', spades: '黑桃' };
    return names[suit];
  };

  const playCard = useCallback((card: Card, player: 'player' | 'ai', chosenSuit?: Suit) => {
    setState(prev => {
      const isPlayer = player === 'player';
      const hand = isPlayer ? prev.playerHand : prev.aiHand;
      const newHand = hand.filter(c => c.id !== card.id);
      
      return {
        ...prev,
        [isPlayer ? 'playerHand' : 'aiHand']: newHand,
        discardPile: [...prev.discardPile, card],
        currentSuit: chosenSuit || null,
        turn: isPlayer ? 'ai' : 'player',
        lastAction: `${isPlayer ? '你' : 'AI'} 打出了 ${getSuitName(card.suit)} ${card.rank}${chosenSuit ? `。新花色：${getSuitName(chosenSuit)}` : ''}`,
      };
    });
  }, []);

  const drawCard = useCallback((player: 'player' | 'ai') => {
    let canPlayAfterDraw = false;
    
    setState(prev => {
      if (prev.deck.length === 0) return prev;
      
      const newDeck = [...prev.deck];
      const drawnCard = newDeck.pop()!;
      const isPlayer = player === 'player';
      const hand = isPlayer ? prev.playerHand : prev.aiHand;
      
      const topCard = prev.discardPile[prev.discardPile.length - 1];
      const canPlayDrawn = canPlay(drawnCard, topCard, prev.currentSuit);
      canPlayAfterDraw = canPlayDrawn;

      return {
        ...prev,
        deck: newDeck,
        [isPlayer ? 'playerHand' : 'aiHand']: [...hand, drawnCard],
        // If player draws and can play, they keep their turn. Otherwise turn passes.
        turn: isPlayer ? (canPlayDrawn ? 'player' : 'ai') : (canPlayDrawn ? 'ai' : 'player'),
        lastAction: `${isPlayer ? '你' : 'AI'} 摸了一张牌。`,
      };
    });

    // If deck is getting low, trigger reshuffle
    reshuffleIfNeeded();
  }, [reshuffleIfNeeded]);

  // AI Turn Logic - Refactored to ensure it continues if AI draws a playable card
  useEffect(() => {
    if (state.status === 'playing' && state.turn === 'ai') {
      const timer = setTimeout(() => {
        setState(current => {
          if (current.status !== 'playing' || current.turn !== 'ai') return current;

          const topCard = current.discardPile[current.discardPile.length - 1];
          if (!topCard) return current; // Safety guard

          const playableCards = current.aiHand.filter(card => canPlay(card, topCard, current.currentSuit));

          if (playableCards.length > 0) {
            const nonEight = playableCards.find(c => c.rank !== '8');
            const cardToPlay = nonEight || playableCards[0];

            if (cardToPlay.rank === '8') {
              const suitCounts: Record<Suit, number> = { hearts: 0, diamonds: 0, clubs: 0, spades: 0 };
              current.aiHand.forEach(c => { if (c.id !== cardToPlay.id) suitCounts[c.suit]++; });
              const bestSuit = (Object.keys(suitCounts) as Suit[]).reduce((a, b) => suitCounts[a] > suitCounts[b] ? a : b);
              
              const newHand = current.aiHand.filter(c => c.id !== cardToPlay.id);
              return {
                ...current,
                aiHand: newHand,
                discardPile: [...current.discardPile, cardToPlay],
                currentSuit: bestSuit,
                turn: 'player',
                lastAction: `AI 打出了 ${getSuitName(cardToPlay.suit)} 8。新花色：${getSuitName(bestSuit)}`,
              };
            } else {
              const newHand = current.aiHand.filter(c => c.id !== cardToPlay.id);
              return {
                ...current,
                aiHand: newHand,
                discardPile: [...current.discardPile, cardToPlay],
                currentSuit: null,
                turn: 'player',
                lastAction: `AI 打出了 ${getSuitName(cardToPlay.suit)} ${cardToPlay.rank}`,
              };
            }
          } else {
            // AI must draw
            if (current.deck.length > 0) {
              const newDeck = [...current.deck];
              const drawnCard = newDeck.pop();
              if (!drawnCard) return current;

              const canPlayDrawn = canPlay(drawnCard, topCard, current.currentSuit);
              
              return {
                ...current,
                deck: newDeck,
                aiHand: [...current.aiHand, drawnCard],
                // If playable, AI keeps turn and effect will re-run due to aiHand.length change
                turn: canPlayDrawn ? 'ai' : 'player',
                lastAction: `AI 摸了一张牌。`,
              };
            } else {
              return { ...current, turn: 'player', lastAction: 'AI 跳过了（没有可摸的牌）' };
            }
          }
        });
        
        reshuffleIfNeeded();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [state.turn, state.status, state.aiHand.length, state.discardPile.length, reshuffleIfNeeded]);

  const handlePlayerPlay = (card: Card) => {
    if (state.turn !== 'player' || state.status !== 'playing') return;
    
    const topCard = state.discardPile[state.discardPile.length - 1];
    if (!topCard || !canPlay(card, topCard, state.currentSuit)) return;

    if (card.rank === '8') {
      setPendingEightCard(card);
      setState(prev => ({ ...prev, status: 'suit_selection' }));
    } else {
      playCard(card, 'player');
    }
  };

  const handleSuitSelect = (suit: Suit) => {
    if (pendingEightCard) {
      playCard(pendingEightCard, 'player', suit);
      setPendingEightCard(null);
      setState(prev => ({ ...prev, status: 'playing' }));
    }
  };

  const topCard = state.discardPile.length > 0 ? state.discardPile[state.discardPile.length - 1] : null;

  return (
    <div className="min-h-screen bg-[#1a1c2c] text-white font-sans selection:bg-indigo-500/30 overflow-hidden flex flex-col">
      {/* Header */}
      <header className="p-4 flex justify-between items-center border-bottom border-white/10 bg-black/20 backdrop-blur-md z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center font-bold text-xl shadow-lg shadow-indigo-500/20">Q</div>
          <h1 className="text-xl font-bold tracking-tight">疯狂 8 点</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-mono">剩余 {state.deck.length} 张</span>
          </div>
          <button 
            onClick={() => {
              if (state.status === 'playing' && !window.confirm('确定要退出当前游戏回到主菜单吗？')) return;
              setState(prev => ({ ...prev, status: 'menu' }));
            }}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Game Board */}
      <main className="flex-1 relative flex flex-col items-center justify-between p-4 sm:p-8 max-w-6xl mx-auto w-full">
        
        {/* AI Hand */}
        <div className="w-full flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${state.turn === 'ai' ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`}></div>
            <span className="text-sm font-medium opacity-70 uppercase tracking-widest">对手 ({state.aiHand.length})</span>
          </div>
          <div className="flex -space-x-12 sm:-space-x-16 hover:-space-x-8 transition-all duration-300">
            {state.aiHand.map((card, i) => (
              <motion.div
                key={card.id}
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                <PlayingCard card={card} isFaceUp={false} className="shadow-2xl" />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Center Area (Deck & Discard) */}
        <div className="flex items-center gap-8 sm:gap-16 my-8">
          {/* Draw Pile */}
          <div className="relative group">
            <div className="absolute -inset-4 bg-indigo-500/10 rounded-xl blur-xl group-hover:bg-indigo-500/20 transition-all"></div>
            <div 
              onClick={() => state.turn === 'player' && state.status === 'playing' && drawCard('player')}
              className={`relative cursor-pointer transition-transform active:scale-95 ${state.turn !== 'player' ? 'opacity-50 grayscale pointer-events-none' : ''}`}
            >
              {state.deck.length > 0 ? (
                <>
                  <PlayingCard card={state.deck[0]} isFaceUp={false} className="translate-x-1 translate-y-1 opacity-40 border-none shadow-none" />
                  <PlayingCard card={state.deck[0]} isFaceUp={false} className="absolute inset-0" />
                </>
              ) : (
                <div className="w-20 h-28 sm:w-24 sm:h-36 border-2 border-dashed border-white/20 rounded-lg flex items-center justify-center text-white/20">
                  空
                </div>
              )}
              {state.turn === 'player' && state.status === 'playing' && (
                <div className="absolute -top-2 -right-2 bg-yellow-400 text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg animate-bounce">
                  摸牌
                </div>
              )}
            </div>
          </div>

          {/* Discard Pile */}
          <div className="relative">
             <AnimatePresence mode="popLayout">
                <motion.div
                  key={topCard ? topCard.id : 'empty-discard'}
                  initial={{ scale: 0.8, opacity: 0, rotate: -10, x: -50 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0, x: 0 }}
                  className="relative"
                >
                  {topCard && <PlayingCard card={topCard} />}
                  {state.currentSuit && (
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-indigo-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter whitespace-nowrap shadow-lg border border-white/20">
                      当前花色: {getSuitName(state.currentSuit)}
                    </div>
                  )}
                </motion.div>
             </AnimatePresence>
          </div>
        </div>

        {/* Player Hand */}
        <div className="w-full flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${state.turn === 'player' ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`}></div>
            <span className="text-sm font-medium opacity-70 uppercase tracking-widest">你的手牌 ({state.playerHand.length})</span>
          </div>
          
          <div className="flex flex-wrap justify-center gap-2 sm:gap-4 max-w-4xl">
            {state.playerHand.map((card, i) => (
              <PlayingCard 
                key={card.id} 
                card={card} 
                isPlayable={state.turn === 'player' && state.status === 'playing' && canPlay(card, topCard, state.currentSuit)}
                onClick={() => handlePlayerPlay(card)}
              />
            ))}
          </div>
        </div>
      </main>

      {/* Status Bar */}
      <footer className="p-4 bg-black/40 border-t border-white/10 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Info className="w-4 h-4 text-indigo-400" />
            <p className="text-sm font-medium text-white/80 italic">{state.lastAction}</p>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-xs font-mono opacity-40">
            <span>回合: {state.turn === 'player' ? '玩家' : 'AI'}</span>
            <span>|</span>
            <span>状态: {state.status === 'playing' ? '进行中' : state.status === 'suit_selection' ? '选择花色' : '结束'}</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AnimatePresence>
        {state.status === 'menu' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1a1c2c] p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="max-w-2xl w-full text-center"
            >
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="mb-8 flex justify-center gap-4"
              >
                <div className="rotate-[-10deg]"><PlayingCard card={{ id: '1', suit: 'hearts', rank: '8' }} /></div>
                <div className="rotate-[5deg] translate-y-[-20px]"><PlayingCard card={{ id: '2', suit: 'spades', rank: 'A' }} /></div>
                <div className="rotate-[15deg]"><PlayingCard card={{ id: '3', suit: 'diamonds', rank: 'K' }} /></div>
              </motion.div>

              <h1 className="text-6xl sm:text-8xl font-black mb-4 tracking-tighter bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent">
                疯狂 8 点
              </h1>
              <p className="text-indigo-300/60 text-lg mb-12 max-w-md mx-auto">
                经典的纸牌对战游戏。匹配花色或点数，利用万能的 8 点来改变局势！
              </p>

              <div className="flex flex-col gap-4 max-w-xs mx-auto">
                <button
                  onClick={() => setState(prev => ({ ...prev, status: 'waiting' }))}
                  className="py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2 group text-xl"
                >
                  开始游戏
                  <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </button>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <div className="text-indigo-400 font-bold mb-1">规则</div>
                    <div className="text-[10px] opacity-50 uppercase tracking-widest">匹配花色或点数</div>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <div className="text-indigo-400 font-bold mb-1">万能牌</div>
                    <div className="text-[10px] opacity-50 uppercase tracking-widest">8 可以改变花色</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {state.status === 'suit_selection' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-[#2a2d3e] p-8 rounded-3xl border border-white/10 shadow-2xl max-w-md w-full text-center"
            >
              <h2 className="text-2xl font-bold mb-2">疯狂 8 点！</h2>
              <p className="text-white/60 mb-8">请选择新的花色</p>
              
              <div className="grid grid-cols-2 gap-4">
                {(['hearts', 'diamonds', 'clubs', 'spades'] as Suit[]).map(suit => (
                  <button
                    key={suit}
                    onClick={() => handleSuitSelect(suit)}
                    className="flex flex-col items-center justify-center p-6 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all group active:scale-95"
                  >
                    <span className={`text-4xl mb-2 group-hover:scale-125 transition-transform ${suit === 'hearts' || suit === 'diamonds' ? 'text-red-500' : 'text-white'}`}>
                      {suit === 'hearts' ? '♥' : suit === 'diamonds' ? '♦' : suit === 'clubs' ? '♣' : '♠'}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-widest opacity-60">{getSuitName(suit)}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}

        {state.status === 'game_over' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-[#2a2d3e] p-10 rounded-3xl border border-white/10 shadow-2xl max-w-md w-full text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
              
              <div className="mb-6 inline-flex p-4 bg-indigo-500/20 rounded-full">
                <Trophy className={`w-12 h-12 ${state.winner === 'player' ? 'text-yellow-400' : 'text-gray-400'}`} />
              </div>
              
              <h2 className="text-4xl font-black mb-2 uppercase tracking-tighter">
                {state.winner === 'player' ? '胜利！' : '失败'}
              </h2>
              <p className="text-white/60 mb-8">
                {state.winner === 'player' 
                  ? "你清空了所有手牌。干得漂亮！" 
                  : "这次 AI 更快。想再试一次吗？"}
              </p>
              
              <button
                onClick={initGame}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 group"
              >
                <RotateCcw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                再玩一次
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Decoration */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full"></div>
      </div>
    </div>
  );
}
