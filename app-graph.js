import 'https://cdn.skypack.dev/preact/debug';
import {h, render} from 'https://cdn.skypack.dev/preact';
import {useReducer} from 'https://cdn.skypack.dev/preact/hooks'; //development version?
import htm from 'https://cdn.skypack.dev/htm';

const ht = htm.bind(h);

function pmap(f, arr) {
  const [fst, snd, ...rst] = arr;
  return [f(fst, snd), ...(rst.length ? pmap(f, [snd, ...rst]) : [])];
}
console.log(pmap((x, y) => x + y, [1, 2, 3]));

function update(state, msg) {
  const [action, data] = msg;
  const _state = {...state}; //dummy copy, I'm okay with mutation here
  switch (action) {
    case 'move':
      const icell = data; 
      icell.ocell.content = 'X';
  }
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

function opposite(state, pos) {
  const [ox, oy, ix, iy] = pos;
  if (ix == 1 && iy == 1) return null;
  const [w, h] = state.boardSize;
  //ix2 = -(ix - 1) + 1;
  const ix2 = 2 - ix; //TODO explain & generalize
  const iy2 = 2 - iy;
  const ox2 = ox + (ix - 1);
  const oy2 = oy + (iy - 1);
  if (ox2 < 0 || oy2 < 0) return null;
  if (ox2 >= w || oy2 >= h) return null;
  //return [ox2, oy2, ix2, iy2];
  return  state.board[oy2][ox2].content[iy2][ix2];  //meh
}

//modify prototype
//expose to debug tools
function map2d(f, arr) {
  return arr.map((row, y) => row.map((val, x) => f(val, x, y)));
}
window.map2d = map2d;

//a class?
function Arr2d(w, h, f) {
  return Array.from(Array(h), (_, y) => Array.from(Array(w), (_, x) => f?.(x, y)));
}
window.Arr2d = Arr2d;

function init(w, h) {
  const genOpenOcell = () => {
    const ocell = {
      domain: null,
      //content: Array.from(Array(3), () => Array.from(Array(3), () => {player: null}), //<-- see?
      content: Array.from(Array(3), () => Array.from(Array(3), () => ({player: null, opposite: null}))),
    }
    ocell.content.map(row => row.map(icell => icell.ocell = ocell));
    return ocell;
  };
  const setOpposites = ocell => {
    ocell.content.map(row => row.map(icell => icell.opposite = opposite(icell)))
  }
  //can this be done without messing with indices now?
  //what if I stored decorated icells?
  //what if I undecorated them afterwards?
  const state = {
    board: Array.from(Array(h), () => Array.from(Array(w), genOpenOcell)),
    boardSize: [w, h],
  };
  map2d((ocell, ox, oy) => map2d((icell, ix, iy) => icell.opposite = opposite(state, [ox, oy, ix, iy]), ocell.content), state.board);
  disableEdges(state);
  return state;
}


function drawIcell(state, send, icell) {
  return ht`
    <td class='inner-cell ${icell.disabled ? 'disabled' : ''}' 
        onclick=${() => send(['move', icell])}>
      ${icell.disabled ? '' : icell.player}
    </>
  `;
}

function drawOcell(state, send, ocell, ox, oy) {
  return ht`
    <td class='outer-cell'>
    ${typeof(ocell.content) === 'string'
      ? ht`<span class='outer-cell-collapsed'>${ocell.content}</>`
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
  `;
}

render(ht`<${App} />`, document.body);
