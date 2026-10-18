// src/components/FundamentalCard.tsx
/**
 * MT16 BISTAPP — FundamentalCard artık TacticalCard ile değiştirilmiştir.
 * Geriye dönük uyumluluk için TacticalCard'ı yeniden dışa aktarır.
 */
export { TacticalCard as FundamentalCard, TacticalCard, type TacticalCardProps } from './TacticalCard';
export default TacticalCard;
import { TacticalCard } from './TacticalCard';
