import 'https://cdn.skypack.dev/preact/debug';
import {h, render} from 'https://cdn.skypack.dev/preact';
import {useReducer} from 'https://cdn.skypack.dev/preact/hooks'; //development version?
import htm from 'https://cdn.skypack.dev/htm';

const ht = htm.bind(h);

//validate separately
function opposite(state, pos) {
  const [ox, oy, ix, iy] = pos;
  const [w, h] = state.boardSize;
  //ix2 = -(ix - 1) + 1;
  const ix2 = 2 - ix; //TODO explain & generalize
  const iy2 = 2 - iy;
  const ox2 = ox + (ix - 1);
  const oy2 = oy + (iy - 1);
  return [ox2, oy2, ix2, iy2];
}

function getOcell(state, pos) { //generalize to ocells as well?
  const [ox, oy] = pos;
  return state.board?.[oy]?.[ox];
}

function getIcell(state, pos) { //generalize to ocells as well?
  const [ox, oy, ix, iy] = pos;
  return getOcell(state, pos).content[iy][ix];
}

function map2d(arr, f) {
  return arr.map((row, y) => row.map((val, x) => f(val, x, y)));
}

//TODO make it return collapsed?
function collapse(state, pos, player, collapsed) {
  const [ox, oy] = pos;
  const ocell = getOcell(state, pos);
  const content = ocell.content;
  ocell.content = player;
  map2d(content, (icell, ix, iy) => {
    //middle cell doesn't matter. It get's set, but "content" is later overwritten, right?
    if (icell.disabled) return;
    const pos2 = opposite(state, [ox, oy, ix, iy]); 
    const ocell2 = getOcell(state, pos2);
    if (typeof(ocell2.content) === 'string') return;
    const icell2 = getIcell(state, pos2);
    if (icell.player === null) {
      icell2.disabled = true;
    } else {
      collapse(state, pos2, icell2.player, collapsed);
    }
  });
  collapsed.push(pos);
}

const checkHalfLine = (state, pos, [dirX, dirY]) => {
  let [ox, oy] = pos;
  let res = [];
  const plr = getOcell(state, pos).content;
  while (getOcell(state, [ox, oy])?.content === plr) {
    //^^ OOB that happens when removing (?.)
    //  what does the debugger say about OOB cells?
    console.log(ox, oy);
    res.push(getOcell(state, [ox, oy])); //TODO refactor
    oy += dirX;
    ox += dirY;
  }
  return res;
}

const checkLine = (state, pos, [dirX, dirY]) => {
  const fst = checkHalfLine(state, pos, [dirX, dirY]);
  const [, ...snd] = checkHalfLine(state, pos, [-dirX, -dirY])
  return [...fst, ...snd];
}

const checkCrossed = (state, pos) => {
  const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
  for (const dir of dirs) {
    const inLine = checkLine(state, pos, dir); //make it return an array
    if (inLine.length >= 5) { //check the array length
      for (const ocell of inLine) {
        if (!ocell.crossed) {
          ocell.crossed = true;
          state.score[ocell.content]++;
        }
      }
    }
  }
}

function update(state, msg) {
  const [action, data] = msg;
  const _state = {...state}; //dummy copy, I'm okay with mutation here
  switch (action) {
    case 'reset':
      return init(13, 11);
    case 'move':
      const pos = data; 
      const [ox, oy, ix, iy] = pos;
      const icell = getIcell(state, pos);
      if (icell.disabled) break;
      if (ix == 1 && iy == 1) {
        const collapsed = [];
        collapse(state, pos, state.next, collapsed);
        collapsed.map(pos2 => checkCrossed(state, pos2));
        break;
      }
      const pos2 = opposite(state, pos);
      const icell2 = getIcell(state, pos2);
      icell.player = icell2.player = state.next;
      //getIcell(state, opposite(state, pos)) = 'X';
  }
  _state.next = state.next === 'X' ? 'O' : 'X';
  return _state;
}

function disableEdges(state) {
  const [w, h] = state.boardSize;
  const board = state.board;
  for (const y in board) {
    for (let i=0; i<3; i++) {
      board[y][0].content[i][0].disabled = true;
      board[y][w - 1].content[i][2].disabled = true;
    }
  }
  for (const x in board[0]) {
    for (let i=0; i<3; i++) { //better way to iter?
      board[0][x].content[0][i].disabled = true;
      board[h - 1][x].content[2][i].disabled = true;
    }
  }
}

function init(w, h) {
  const genOpenOcell = () => ({
    domain: null,
    //content: Array.from(Array(3), () => Array.from(Array(3), () => {player: null}), //<-- see?
    content: Array.from(Array(3), () => Array.from(Array(3), () => ({player: null}))),
  });
  const state = {
    board: Array.from(Array(h), () => Array.from(Array(w), genOpenOcell)),
    boardSize: [w, h],
    next: 'X',
    score: {
      'X': 0,
      'O': 0,
    }
  };
  disableEdges(state);
  return state;
}


function drawIcell(state, send, icell, pos) {
  return ht`
    <td class='inner-cell ${icell.disabled ? 'disabled' : ''}' 
        onclick=${() => send(['move', pos])}>
      ${icell.disabled ? '' : icell.player}
    </>
  `;
}

function drawOcell(state, send, ocell, ox, oy) {
  return ht`
    <td class='outer-cell'>
    ${typeof(ocell.content) === 'string'
      ? ht`<span class='outer-cell-collapsed' style='${ocell.crossed ? 'color: red' : ''}'>${ocell.content}</>`
      : ht`
          <table class='inner-table'>
            ${ocell.content.map((row, iy) => ht`
              <tr>
                ${row.map((icell, ix) => drawIcell(state, send, icell, [ox, oy, ix, iy]))}
              </>
            `)}
          </>
       `
    }
    </>
  `;
}

function App(props) {
  const [state, send] = useReducer(update, null, () => init(13, 11));
  return ht`
    <table class='board'>
      ${state.board.map((row, oy) => ht`
        <tr>
          ${row.map((ocell, ox) => drawOcell(state, send, ocell, ox, oy))}
        </tr>
      `)}
    </>
    next player: ${state.next}
    <br/>
    score:
    <br/>
    X: ${state.score['X']}
    <br/>
    O: ${state.score['O']}
    <br/>
    <button onclick=${() => send(['reset'])}>reset</>
  `;
}

render(ht`<${App} />`, document.body);
