import { MobilizationParticipantEntry } from "../types";

export function parseMobilizationData(
  rawText: string,
  eventId: string,
  existingPlayers: { characterId: string; currentName: string }[]
): MobilizationParticipantEntry[] {
  const lines = rawText.split("\n");
  const entries: MobilizationParticipantEntry[] = [];
  
  const playerMap = new Map(existingPlayers.map(p => [p.currentName.toLowerCase(), p.characterId]));

  lines.forEach((line, index) => {
    const parts = line.split(/[\t,|]+/).map(p => p.trim());
    if (parts.length >= 2) {
      const playerName = parts[0];
      const personalScore = parseInt(parts[1].replace(/[^0-9]/g, ""), 10) || 0;
      const tasksSubmitted = parts.length > 2 ? parseInt(parts[2].replace(/[^0-9]/g, ""), 10) || 0 : 0;
      
      // Attempt to link to an existing player ID from roster, or generate a provisional one
      const matchedId = playerMap.get(playerName.toLowerCase()) || `p_mob_${Date.now()}_${index}`;

      entries.push({
        id: `mob_entry_${Date.now()}_${index}`,
        eventId,
        playerId: matchedId,
        playerName,
        personalScore,
        tasksCompleted: tasksSubmitted,
        tasksSubmitted,
        recordedAt: new Date().toISOString()
      });
    }
  });

  return entries;
}