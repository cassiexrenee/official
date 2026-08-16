export interface ParsedMobilizationRow {
  rank?: number;
  rawName: string;
  score: number;
  questsSubmitted: number;
  questsAccepted: number;
}

// Matches lines like: "1 Malischka 2,472 11/11"
// Rank is optional/best-effort since OCR often garbles rank icons/medals.
const LINE_REGEX = /^\s*(\d{1,3})?\s*([^\d,]+?)\s+([\d,]{2,})\s+(\d{1,3})\s*\/\s*(\d{1,3})\s*$/;

export function parseMobilizationText(text: string): ParsedMobilizationRow[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const rows: ParsedMobilizationRow[] = [];

  for (const line of lines) {
    const match = line.match(LINE_REGEX);
    if (!match) continue;

    const [, rankStr, namePart, scoreStr, submittedStr, acceptedStr] = match;
    const rawName = namePart.trim();
    if (!rawName) continue;

    rows.push({
      rank: rankStr ? parseInt(rankStr, 10) : undefined,
      rawName,
      score: parseInt(scoreStr.replace(/,/g, ""), 10) || 0,
      questsSubmitted: parseInt(submittedStr, 10) || 0,
      questsAccepted: parseInt(acceptedStr, 10) || 0,
    });
  }

  return rows;
}

function normalizeName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, "");
}

export function matchPlayerByName(
  rawName: string,
  players: { characterId: string; currentName: string }[]
): string | null {
  const target = normalizeName(rawName);
  const exact = players.find((p) => normalizeName(p.currentName) === target);
  return exact ? exact.characterId : null;
}