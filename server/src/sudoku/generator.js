function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isValidPlacement(grid, row, col, num) {
  for (let c = 0; c < 9; c++) {
    if (grid[row][c] === num) return false;
  }
  for (let r = 0; r < 9; r++) {
    if (grid[r][col] === num) return false;
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if (grid[r][c] === num) return false;
    }
  }
  return true;
}

function solve(grid) {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col] === 0) {
        const numbers = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (const num of numbers) {
          if (isValidPlacement(grid, row, col, num)) {
            grid[row][col] = num;
            if (solve(grid)) return true;
            grid[row][col] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

function generateCompleteSolution() {
  const grid = Array.from({ length: 9 }, () => Array(9).fill(0));
  const numbers = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  for (let i = 0; i < 9; i++) {
    grid[i][i] = numbers[i];
  }
  solve(grid);
  return grid;
}

function countSolutions(grid, limit = 2) {
  let count = 0;

  function backtrack() {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col] === 0) {
          for (let num = 1; num <= 9; num++) {
            if (isValidPlacement(grid, row, col, num)) {
              grid[row][col] = num;
              backtrack();
              grid[row][col] = 0;
              if (count >= limit) return;
            }
          }
          return;
        }
      }
    }
    count++;
  }

  backtrack();
  return count;
}

function generatePuzzle(difficulty = 'medium') {
  const solution = generateCompleteSolution();
  const puzzle = solution.map(row => [...row]);
  const cellsToRemove = {
    easy: 38,
    medium: 47,
    hard: 54,
    expert: 60,
  };

  const toRemove = cellsToRemove[difficulty] || 47;
  const positions = shuffleArray(
    Array.from({ length: 81 }, (_, i) => i)
  );

  let removed = 0;
  for (const pos of positions) {
    if (removed >= toRemove) break;
    const row = Math.floor(pos / 9);
    const col = pos % 9;
    const backup = puzzle[row][col];
    puzzle[row][col] = 0;

    const testGrid = puzzle.map(r => [...r]);
    if (countSolutions(testGrid) === 1) {
      removed++;
    } else {
      puzzle[row][col] = backup;
    }
  }

  return { puzzle, solution };
}

function validateMove(grid, row, col, value) {
  if (value < 1 || value > 9) return false;
  if (row < 0 || row > 8 || col < 0 || col > 8) return false;
  const testGrid = grid.map(r => [...r]);
  const prev = testGrid[row][col];
  testGrid[row][col] = 0;
  if (!isValidPlacement(testGrid, row, col, value)) return false;
  testGrid[row][col] = value;
  return true;
}

function isBoardComplete(board, solution) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] !== solution[r][c]) return false;
    }
  }
  return true;
}

function isCellCorrect(board, solution, row, col) {
  return board[row][col] === solution[row][col];
}

module.exports = {
  generatePuzzle,
  validateMove,
  isBoardComplete,
  isCellCorrect,
};
