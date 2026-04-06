export interface DiffToken {
  value: string;
  changed: boolean;
}

const DIFF_COMPLEXITY_LIMIT = 10000;

function tokenize(text: string): string[] {
  const matches = text.match(/(\s+|[^\s]+)/g);
  return matches || [];
}

export function diffText(baseText: string, nextText: string): DiffToken[] {
  const baseTokens = tokenize(baseText);
  const nextTokens = tokenize(nextText);
  if (baseTokens.length * nextTokens.length > DIFF_COMPLEXITY_LIMIT) {
    return nextTokens.map((value) => ({ value, changed: true }));
  }

  const rows = baseTokens.length + 1;
  const columns = nextTokens.length + 1;
  const table: number[][] = Array.from({ length: rows }, () => Array<number>(columns).fill(0));

  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      if (baseTokens[row - 1] === nextTokens[column - 1]) {
        table[row][column] = table[row - 1][column - 1] + 1;
      } else {
        table[row][column] = Math.max(table[row - 1][column], table[row][column - 1]);
      }
    }
  }

  const tokens: DiffToken[] = [];
  let row = baseTokens.length;
  let column = nextTokens.length;

  while (column > 0) {
    if (row > 0 && baseTokens[row - 1] === nextTokens[column - 1]) {
      tokens.unshift({ value: nextTokens[column - 1], changed: false });
      row -= 1;
      column -= 1;
      continue;
    }

    if (column > 0 && (row === 0 || table[row][column - 1] >= table[row - 1][column])) {
      tokens.unshift({ value: nextTokens[column - 1], changed: true });
      column -= 1;
      continue;
    }

    row -= 1;
  }

  return tokens;
}
