import 'https://cdn.skypack.dev/preact/debug';
import {h, render} from 'https://cdn.skypack.dev/preact';
import {useReducer} from 'https://cdn.skypack.dev/preact/hooks'; //development version?
import htm from 'https://cdn.skypack.dev/htm';

const ht = htm.bind(h);


function Dicell(state, pos) { 
  const [ox, oy, ix, iy] = pos;
  const ocell = state.board[oy][ox];
  const icell = ocell.content[iy][ix];
  return {
    state: state,
    pos: pos,
    ocell: ocell,
    icell: icell,
  }
}
//validate separately
function opposite(dicell) {
  const [ox, oy, ix, iy] = dicell.pos;
  const [w, h] = dicell.state.boardSize;
  //ix2 = -(ix - 1) + 1;
  const ix2 = 2 - ix; //TODO explain & generalize
  const iy2 = 2 - iy;
  const ox2 = ox + (ix - 1);
  const oy2 = oy + (iy - 1);
  return Dicell(dicell.state, [ox2, oy2, ix2, iy2]);
}

function getOcell(state, pos) { //generalize to ocells as well?
  const [ox, oy] = pos;
  return state.board[oy][ox];
}

function getIcell(state, pos) { //generalize to ocells as well?
  const [ox, oy, ix, iy] = pos;
  return state.board[oy][ox].content[iy][ix];
}

function isMiddle(dicell) {
  const [, , ix, iy] = dicell.pos;
  return (ix == 1 && iy == 1);
}

function map2d(f, arr) {
  return arr.map((row, y) => row.map((val, x) => f(val, x, y)));
}

function collapse(dicell, player) {
  const content = dicell.ocell.content;
  dicell.ocell.content = player;
  map2d(d1 => {  ///no indices
    if (!isMiddle(d1)) {
      const d2 = opposite(d1);
      if (d1 === null) {
        d2.icell.disabled = true;
      } else {
        collapse(d2); 
      }
    }
  }, content);
}

function update(state, msg) {
  const [action, data] = msg;
  const _state = {...state}; //dummy copy, I'm okay with mutation here
  switch (action) {
    case 'move':
      const pos = data; 
      const [ox, oy, ix, iy] = pos;
      const dicell = Dicell(_state, pos);
      if (isMiddle(dicell)) {
        collapse(dicell, state.next);
        break;
      }
      const dicell2 = opposite(dicell); //VOODOO
      dicell.icell.player = state.next;
      dicell2.icell.player = state.next;
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
    next: 'X',
    board: Array.from(Array(h), () => Array.from(Array(w), genOpenOcell)),
    boardSize: [w, h],
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
