import 'https://cdn.skypack.dev/preact/debug';
import {h, render} from 'https://cdn.skypack.dev/preact';
import {useReducer} from 'https://cdn.skypack.dev/preact/hooks'; //development version?
import htm from 'https://cdn.skypack.dev/htm';

const ht = htm.bind(h);


const disableEdges = board => {
  const h = board.length;
  const w = board[0].length;
  for (const iRow in board) {
    for (let i=0; i<3; i++) {
      board[iRow][0].content[i][0].disabled = true;
      board[iRow][w - 1].content[i][2].disabled = true;
    }
  }
  for (const iCol in board[0]) {
    for (let i=0; i<3; i++) { //better way to iter?
      board[0][iCol].content[0][i].disabled = true;
      board[h - 1][iCol].content[2][i].disabled = true;
    }
  }
}

const init = (w, h) => {
  const initND = (dims, fn, indices=[]) => {
    const [first, ...rest] = dims;
    return first
           ? Array.from(Array(first), (x, i) => initND(rest, fn, [...indices, i]))
           : fn(indices);
  }
  const initInCell = () => ({value: null, disabled: false});
	const initOutCell = () => ({content: initND([3, 3], initInCell), color: 'black'});
  const board = initND([h, w], initOutCell); //h & w other way around?
  disableEdges(board);
  return {board: board, next: 'X', winner: null};
}

const oppositeCells = (board, oy, ox, iy, ix) => { //return both icell and ocell?
  const soy = oy + (iy - 1);
  const sox = ox + (ix - 1);
  const siy = 2 - iy;
  const six = 2 - ix;
  const socell = board[soy][sox];
  const sicell = socell.content[siy][six];
  return [socell, sicell, soy, sox, siy, six];
}


//just take queue, destructure first arg
const collapse = (state, queue, player, oy, ox) => {
  const ocell = state.board[oy][ox];
  const content = ocell.content;
  if (typeof content === 'string') return; //another hack
  for (const i in content) {
    for (const j in content[i]) {
      if (i == 1 && i == j) continue;
      const icell = content[i][j];
      if (icell.disabled) continue;
      const [socell, sicell, soy, sox] = oppositeCells(state.board, oy, ox, i, j);
      sicell.disabled = true; //explain the hack
      if (sicell.value) queue.push([sicell.value, soy, sox]);
    }
  }
  ocell.content = player; //hack update winner here?
  queue.map(([player, oy, ox]) => collapse(state, queue, player, oy, ox));
}

const checkHalfLine = (state, iRow, iCol, [dirX, dirY]) => {
  const {board, next} = state;
  let count = 0;
  while (board?.[iRow]?.[iCol]?.content === next) {
    count++;
    iRow += dirX;
    iCol += dirY;
  }
  return count;
}

const checkLine = (state, iRow, iCol, [dirX, dirY]) => {
  return checkHalfLine(state, iRow, iCol, [dirX, dirY])
         + checkHalfLine(state, iRow, iCol, [-dirX, -dirY])
         - 1;
}

const colorHalfLine = (state, iRow, iCol, [dirX, dirY]) => {
  const {board, next} = state;
  while (board?.[iRow]?.[iCol].content === next) {
    board[iRow][iCol].color = 'red';
    iRow += dirX;
    iCol += dirY;
  }
}

const colorLine = (state, iRow, iCol, [dirX, dirY]) => {
  colorHalfLine(state, iRow, iCol, [dirX, dirY]);
  colorHalfLine(state, iRow, iCol, [-dirX, -dirY]);
}

const updateWinner = (state, iRow, iCol) => {
  const {board, next} = state;
  const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
  let won = false;
  for (const dir of dirs) {
    const count = checkLine(state, iRow, iCol, dir);
    if (count >= 5) {
      won = true;
      colorLine(state, iRow, iCol, dir);
    }
  }
  return won ? next : null;
}

const update = (state, action) => {
  if (action == 'reset') return init(13, 11);
  if (state.winner) return state;
  const [oy, ox, iy, ix] = action;
  const ocell = state.board[oy][ox];
	if (ix == iy && ix == 1) {
    //factor out as 'collapse', map the queue
    collapse(state, [], state.next, oy, ox);
  } else {
    const icell = ocell.content[iy][ix];
    const [socell, sicell] = oppositeCells(state.board, ...action);
		icell.value = sicell.value = state.next;
	}
  return {
    board: state.board,
    next: (state.next === 'X') ? 'O' : 'X',
    winner: updateWinner(state, oy, ox)
  }; //ponder returning the same state
}

const OuterCell = props => {
  const icellClick = (cell, iRow, iCol) => { //disambiguate (it's and inner cell)
    if (!cell.disabled && !cell.value) {							//or just call with outer cell (to handle collapsed)
      props.dispatch([props.iRow, props.iCol, iRow, iCol]);
    }
  } //yeet into update?
  return ht`
    <td class='outer-cell'>
      ${typeof(props.cell.content) === 'string'
        ? ht`
            <font class='outer-cell-collapsed' 
             style='color :${props.cell.color}'>
              ${props.cell.content}
            </font>`
        : ht`
          <table class='inner-table'>
            ${props.cell.content.map((row, iRow) => ht`
              <tr>
                ${row.map((cell, iCol) => ht`
                  <td class='inner-cell ${cell.disabled ? 'disabled' : ''}' 
                   onclick=${() => icellClick(cell, iRow, iCol)}
                   disabled=${cell.disabled}>
                    ${cell.value}
                  </td>
                `)}
              </tr>
            `)}
          </table>
        `
      }
    </td>
    `;
}

const App = () => {
  const [state, dispatch] = useReducer(update, init(13, 11));
  return ht`
    <table>
      ${state.board.map((row, iRow) => ht`
        <tr>
          ${row.map((cell, iCol) => ht`
            <${OuterCell}
             iRow=${iRow}
             iCol=${iCol}
             cell=${cell}
             dispatch=${dispatch}/>
          `)}
        </tr>
      `)}
    </table>
    next player: ${state.next}
    <br />
    ${state.winner
      ? ht`
          winner: ${state.winner}
          <br />
        `
      : null
    }
    <button onclick=${() => dispatch('reset')}>reset</button>
    `;
}

render(ht`<${App} />`, document.body);
