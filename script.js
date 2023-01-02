import {h, render} from 'https://cdn.skypack.dev/preact';
import {useReducer} from 'https://cdn.skypack.dev/preact/hooks'; //development version?
import htm from 'https://cdn.skypack.dev/htm';

const ht = htm.bind(h);


const disableEdges = board => {
  const h = board.length;
  const w = board[0].length;
  for (const iRow in board) {
    for (const i in [1, 2, 3]) {
      board[iRow][0][i][0].disabled = true;
      board[iRow][w - 1][i][2].disabled = true;
    }
  }
  for (const iCol in board[0]) {
    for (const i in [1, 2, 3]) { //ugly
      board[0][iCol][0][i].disabled = true;
      board[h - 1][iCol][2][i].disabled = true;
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
  const initCell = () => ({value: null, disabled: false});
  const board = initND([h, w, 3, 3], initCell); //h & w other way around?
  disableEdges(board);
  return {board: board, next: 'X'};
}

const update = (state, action) => {
  const [oy, ox, iy, ix] = action;
  const ocell = state.board[oy][ox];
  const icell = ocell[iy][ix];
  const soy = oy + (iy - 1);
  const sox = ox + (ix - 1);
  const siy = 2 - iy;
  const six = 2 - ix;
  const socell = state.board[soy][sox];
  const sicell = socell[siy][six];
  icell.value = 'X';
  sicell.value = 'X';
  return {
    board: state.board,
    next: (state.next === 'X') ? 'O' : 'X'
  }; //ponder returning the same state
}

const OuterCell = props => {
  const click = (cell, iRow, iCol) => {
    if (!cell.disabled) {
      props.dispatch([props.iRow, props.iCol, iRow, iCol]);
    }
  }
  return ht`
    <td class='outer-cell'>
      <table class='inner-table'>
        ${props.cell.map((row, iRow) => ht`
          <tr>
            ${row.map((cell, iCol) => ht`
              <td class='inner-cell ${cell.disabled ? 'disabled' : ''}' 
               onclick=${() => click(cell, iRow, iCol)}
               disabled=${cell.disabled}>
                ${cell.value}
              </td>
            `)}
          </tr>
        `)}
      </table>
    </td>
    `;
}

const App = () => {
  const [state, dispatch] = useReducer(update, init(13, 9));
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
    `;
}

render(ht`<${App} />`, document.body);
