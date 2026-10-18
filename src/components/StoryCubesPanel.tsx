// src/components/StoryCubesPanel.tsx
/**
 * MT16 BISTAPP — StoryCubesPanel artık TacticalCard içindeki [Detay v] çekmecesine taşınmıştır.
 * Geriye dönük uyumluluk için TacticalCard'ı yeniden dışa aktarır.
 */
export { TacticalCard as StoryCubesPanel, TacticalCard, type TacticalCardProps } from './TacticalCard';
export default TacticalCard;
import { TacticalCard } from './TacticalCard';
